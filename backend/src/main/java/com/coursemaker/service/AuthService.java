package com.coursemaker.service;

import com.coursemaker.config.JwtService;
import com.coursemaker.domain.entity.User;
import com.coursemaker.domain.enums.UserRole;
import com.coursemaker.dto.auth.AuthDtos.AuthResponse;
import com.coursemaker.dto.auth.AuthDtos.GoogleLoginRequest;
import com.coursemaker.dto.auth.AuthDtos.LoginRequest;
import com.coursemaker.dto.auth.AuthDtos.RegisterRequest;
import com.coursemaker.dto.user.UserResponse;
import com.coursemaker.exception.ApiErrorResponse;
import com.coursemaker.exception.ApiExceptions.ConflictException;
import com.coursemaker.exception.ApiExceptions.ResourceNotFoundException;
import com.coursemaker.exception.ApiExceptions.UnauthorizedException;
import com.coursemaker.repository.UserRepository;
import com.coursemaker.service.GoogleTokenVerifier.GoogleProfile;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RateLimitService rateLimitService;
    private final GoogleTokenVerifier googleTokenVerifier;

    @Value("${app.register-rate-limit.max-attempts}")
    private int registerMaxAttempts;

    @Value("${app.register-rate-limit.window-seconds}")
    private long registerWindowSeconds;

    @Value("${app.register-rate-limit.block-seconds}")
    private long registerBlockSeconds;

    @Value("${app.login-rate-limit.max-attempts}")
    private int loginMaxAttempts;

    @Value("${app.login-rate-limit.window-seconds}")
    private long loginWindowSeconds;

    @Value("${app.login-rate-limit.block-seconds}")
    private long loginBlockSeconds;

    @Value("${app.login-rate-limit.ip-max-attempts}")
    private int loginIpMaxAttempts;

    // Deliberately NOT @Transactional: the rate limiter commits in its own transaction (REQUIRES_NEW),
    // and holding a connection here while it asks for a second one starves the pool under a burst.
    public AuthResponse register(RegisterRequest request, String clientIp) {
        // Every attempt counts (bcrypt is expensive and accounts are free), so a script cannot spam
        // sign-ups or burn CPU. Per IP, never global, so nobody can lock others out of registering.
        rateLimitService.consume(RateLimitService.registerIpKey(clientIp), new RateLimitService.Policy(
                registerMaxAttempts, Duration.ofSeconds(registerWindowSeconds), Duration.ofSeconds(registerBlockSeconds)));

        String email = request.email().trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ConflictException("Ja existe uma conta com este email");
        }

        User user = User.builder()
                .email(email)
                .name(request.name().trim())
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(UserRole.USER)
                .stacks(new ArrayList<>())
                .build();
        // nickname stays null on purpose: the SPA sends the user to /setup-nickname next.

        return toAuthResponse(userRepository.save(user));
    }

    /**
     * Failures are throttled per client, never per account: the buckets are {@code (ip, identifier)}
     * and {@code ip}. Locking by identifier alone would let anyone lock a victim out just by failing
     * logins against their email (account-lockout DoS). Here the attacker only blocks themselves.
     * The per-IP bucket is not cleared on success, so a valid account of their own cannot be used
     * to reset the counter between guesses.
     */
    // Deliberately NOT @Transactional: the rate limiter commits in its own transaction (REQUIRES_NEW),
    // and holding a connection here while it asks for a second one starves the pool under a burst.
    public AuthResponse login(LoginRequest request, String clientIp) {
        String identifier = request.identifier().trim().toLowerCase();
        String clientKey = RateLimitService.loginClientKey(clientIp, identifier);
        String ipKey = RateLimitService.loginIpKey(clientIp);
        rateLimitService.assertNotBlocked(clientKey);
        rateLimitService.assertNotBlocked(ipKey);

        // The attempt is counted BEFORE the password is checked (atomically), so a parallel burst
        // cannot all pass the check while the slow bcrypt runs. A correct password gives it back.
        Duration window = Duration.ofSeconds(loginWindowSeconds);
        Duration block = Duration.ofSeconds(loginBlockSeconds);
        RateLimitService.Policy clientPolicy = new RateLimitService.Policy(loginMaxAttempts, window, block);
        RateLimitService.Policy ipPolicy = new RateLimitService.Policy(loginIpMaxAttempts, window, block);
        int clientLeft = rateLimitService.consume(clientKey, clientPolicy);
        int ipLeft = rateLimitService.consume(ipKey, ipPolicy);

        // Nicknames are restricted to "^[a-z0-9][a-z0-9-]*$" (see UpdateUserRequest), so they can
        // never contain "@" - that's what tells the two apart in a single input field.
        User user = identifier.contains("@")
                ? userRepository.findByEmailIgnoreCase(identifier).orElse(null)
                : userRepository.findByNicknameIgnoreCase(identifier).orElse(null);
        // Same failure path whether the identifier is unknown or the password is wrong, so the
        // response cannot be used to enumerate accounts.
        if (user == null || user.getPasswordHash() == null
                || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            int left = Math.min(clientLeft, ipLeft);
            throw new UnauthorizedException("Credenciais invalidas").withRateLimit(
                    new ApiErrorResponse.RateLimitInfo(left, block.toSeconds(), left == 0 ? block.toSeconds() : null));
        }

        rateLimitService.recordSuccess(clientKey);
        rateLimitService.refund(ipKey, loginIpMaxAttempts);
        return toAuthResponse(user);
    }

    @Transactional
    public AuthResponse loginWithGoogle(GoogleLoginRequest request) {
        GoogleProfile profile = googleTokenVerifier.verify(request.idToken());
        String email = profile.email().toLowerCase();

        User user = userRepository.findByEmailIgnoreCase(email).orElseGet(() -> User.builder()
                .email(email)
                .name(profile.name())
                .image(profile.picture())
                .role(UserRole.USER)
                .stacks(new ArrayList<>())
                .build());

        if (profile.emailVerified() && user.getEmailVerified() == null) {
            user.setEmailVerified(Instant.now());
        }
        if (user.getImage() == null && profile.picture() != null) {
            user.setImage(profile.picture());
        }

        return toAuthResponse(userRepository.save(user));
    }

    /**
     * The JWT principal only carries id/email/role/nickname/name (see {@link JwtService#extractPrincipal}),
     * so this is the one auth-related place that still hits the database - fetching the full,
     * up-to-date profile (bio, avatar, stacks, ...) the SPA needs when it hydrates on load.
     */
    @Transactional(readOnly = true)
    public UserResponse me(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ResourceNotFoundException.of("Usuario"));
        return UserResponse.from(user);
    }

    /** Issues a fresh session after a password reset, so the user lands back in signed in. */
    public AuthResponse afterPasswordReset(User user) {
        return toAuthResponse(user);
    }

    private AuthResponse toAuthResponse(User user) {
        return new AuthResponse(
                jwtService.generateToken(user),
                jwtService.getExpiresInSeconds(),
                UserResponse.from(user));
    }
}
