package com.coursemaker.service;

import com.coursemaker.domain.entity.PasswordResetToken;
import com.coursemaker.domain.entity.User;
import com.coursemaker.dto.auth.AuthDtos.AuthResponse;
import com.coursemaker.exception.ApiExceptions.BadRequestException;
import com.coursemaker.exception.ApiExceptions.RateLimitExceededException;
import com.coursemaker.repository.PasswordResetTokenRepository;
import com.coursemaker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Locale;

/**
 * "Forgot password" flow: a single-use, time-limited link emailed to the account's address. Never
 * reveals whether an email is registered - {@link #requestReset} always succeeds from the caller's
 * point of view, matching how {@link AuthService#login} never distinguishes "unknown identifier"
 * from "wrong password".
 */
@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final RateLimitService rateLimitService;
    private final ResendMailSender mailSender;
    private final AuthService authService;
    private final PlatformTransactionManager transactionManager;

    @Value("${app.password-reset.token-ttl-minutes}")
    private int tokenTtlMinutes;

    @Value("${app.password-reset.resend-cooldown-seconds}")
    private int resendCooldownSeconds;

    @Value("${app.password-reset.rate-limit.max-per-client}")
    private int maxPerClient;

    @Value("${app.password-reset.rate-limit.max-per-email}")
    private int maxPerEmail;

    @Value("${app.password-reset.rate-limit.ip-max}")
    private int ipMax;

    @Value("${app.password-reset.rate-limit.window-seconds}")
    private long windowSeconds;

    @Value("${app.password-reset.rate-limit.block-seconds}")
    private long blockSeconds;

    @Value("${app.public-url}")
    private String publicUrl;

    // Deliberately NOT @Transactional: the rate limiter commits in its own transaction (REQUIRES_NEW),
    // and holding a connection here while it asks for a second one starves the pool under a burst.
    public void requestReset(String rawEmail, String clientIp) {
        String email = rawEmail.trim().toLowerCase(Locale.ROOT);
        String rateLimitKey = RateLimitService.passwordResetKey(email);
        rateLimitService.assertNotBlocked(rateLimitKey);
        throttleRequests(email, clientIp);

        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (user == null) {
            return;
        }

        tokenRepository.findFirstByUser_IdOrderByCreatedAtDesc(user.getId()).ifPresent(latest -> {
            Instant cooldownEnds = latest.getCreatedAt().plusSeconds(resendCooldownSeconds);
            Instant now = Instant.now();
            if (now.isBefore(cooldownEnds)) {
                long retryAfter = Duration.between(now, cooldownEnds).toSeconds();
                throw new RateLimitExceededException(
                        "Aguarde um instante antes de pedir um novo email.", Math.max(1, retryAfter));
            }
        });

        String rawToken = generateToken();
        PasswordResetToken token = PasswordResetToken.builder()
                .user(user)
                .tokenHash(hash(rawToken))
                .expiresAt(Instant.now().plus(Duration.ofMinutes(tokenTtlMinutes)))
                .build();
        tokenRepository.save(token);

        String link = publicUrl + "/redefinir-senha?token=" + rawToken;
        mailSender.send(user.getEmail(), "Redefinir sua senha - CourseMaker", emailHtml(user.getName(), link));
    }

    /**
     * Every request counts - whether or not the email is registered - so the 429 is the same for
     * existing and unknown addresses (no enumeration). Three buckets: (ip, email) keeps one client
     * from flooding an inbox without being able to burn the victim's own quota; ip stops one client
     * from spraying many inboxes; email is a generous global backstop against a distributed flood.
     */
    private void throttleRequests(String email, String clientIp) {
        String clientKey = RateLimitService.resetRequestClientKey(clientIp, email);
        String ipKey = RateLimitService.resetRequestIpKey(clientIp);
        String emailKey = RateLimitService.resetRequestEmailKey(email);
        rateLimitService.assertNotBlocked(clientKey);
        rateLimitService.assertNotBlocked(ipKey);
        rateLimitService.assertNotBlocked(emailKey);

        Duration window = Duration.ofSeconds(windowSeconds);
        Duration block = Duration.ofSeconds(blockSeconds);
        rateLimitService.consume(clientKey, new RateLimitService.Policy(maxPerClient, window, block));
        rateLimitService.consume(ipKey, new RateLimitService.Policy(ipMax, window, block));
        rateLimitService.consume(emailKey, new RateLimitService.Policy(maxPerEmail, window, block));
    }

    /** Not one big transaction: see the note on requestReset. The writes run in a short one of their own. */
    public AuthResponse confirmReset(String rawToken, String newPassword) {
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        String tokenHash = hash(rawToken);

        // Once a token resolves to a user, brute-force protection keys off that account, same as
        // login; an unrecognised token falls back to a shared key so blind guessing still gets
        // throttled without needing to know who it belongs to.
        String rateLimitKey = tx.execute(status -> tokenRepository.findByTokenHash(tokenHash)
                .map(token -> RateLimitService.passwordResetKey(token.getUser().getEmail()))
                .orElse("password-reset:unknown-token"));
        rateLimitService.assertNotBlocked(rateLimitKey);
        rateLimitService.consume(rateLimitKey);

        User user = tx.execute(status -> {
            PasswordResetToken token = tokenRepository.findByTokenHash(tokenHash).orElse(null);
            if (token == null || !token.isUsable(Instant.now())) {
                throw new BadRequestException("Link invalido ou expirado. Peca um novo.");
            }
            // Single use, enforced by the database: of two parallel confirms with the same link only
            // the one that flips used_at from NULL wins (a read-then-write check would let both in).
            if (tokenRepository.markUsed(token.getId(), Instant.now()) != 1) {
                throw new BadRequestException("Link invalido ou expirado. Peca um novo.");
            }
            User owner = token.getUser();
            owner.setPasswordHash(passwordEncoder.encode(newPassword));
            return userRepository.save(owner);
        });

        rateLimitService.recordSuccess(rateLimitKey);
        return authService.afterPasswordReset(user);
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return Base64.getEncoder().encodeToString(digest.digest(rawToken.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private String emailHtml(String name, String link) {
        return """
                <p>Ola, %s!</p>
                <p>Recebemos um pedido para redefinir a senha da sua conta no CourseMaker.</p>
                <p><a href="%s">Clique aqui para escolher uma nova senha</a></p>
                <p>O link expira em %d minutos. Se voce nao pediu isso, pode ignorar este email.</p>
                """.formatted(name, link, tokenTtlMinutes);
    }
}
