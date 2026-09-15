package com.coursemaker.service;

import com.coursemaker.config.JwtService;
import com.coursemaker.domain.entity.User;
import com.coursemaker.domain.enums.UserRole;
import com.coursemaker.dto.auth.AuthDtos.AuthResponse;
import com.coursemaker.dto.auth.AuthDtos.GoogleLoginRequest;
import com.coursemaker.dto.auth.AuthDtos.LoginRequest;
import com.coursemaker.dto.auth.AuthDtos.RegisterRequest;
import com.coursemaker.dto.user.UserResponse;
import com.coursemaker.exception.ApiExceptions.ConflictException;
import com.coursemaker.exception.ApiExceptions.ResourceNotFoundException;
import com.coursemaker.exception.ApiExceptions.UnauthorizedException;
import com.coursemaker.repository.UserRepository;
import com.coursemaker.service.GoogleTokenVerifier.GoogleProfile;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    @Transactional
    public AuthResponse register(RegisterRequest request) {
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

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String identifier = request.identifier().trim().toLowerCase();
        String rateLimitKey = RateLimitService.loginKey(identifier);
        rateLimitService.assertNotBlocked(rateLimitKey);

        // Nicknames are restricted to "^[a-z0-9][a-z0-9-]*$" (see UpdateUserRequest), so they can
        // never contain "@" - that's what tells the two apart in a single input field.
        User user = identifier.contains("@")
                ? userRepository.findByEmailIgnoreCase(identifier).orElse(null)
                : userRepository.findByNicknameIgnoreCase(identifier).orElse(null);
        // Same failure path whether the identifier is unknown or the password is wrong, so the
        // response cannot be used to enumerate accounts.
        if (user == null || user.getPasswordHash() == null
                || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            rateLimitService.recordFailure(rateLimitKey);
            throw new UnauthorizedException("Credenciais invalidas");
        }

        rateLimitService.recordSuccess(rateLimitKey);
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
