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
import org.springframework.transaction.annotation.Transactional;

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

    @Value("${app.password-reset.token-ttl-minutes}")
    private int tokenTtlMinutes;

    @Value("${app.password-reset.resend-cooldown-seconds}")
    private int resendCooldownSeconds;

    @Value("${app.public-url}")
    private String publicUrl;

    @Transactional
    public void requestReset(String rawEmail) {
        String email = rawEmail.trim().toLowerCase(Locale.ROOT);
        String rateLimitKey = RateLimitService.passwordResetKey(email);
        rateLimitService.assertNotBlocked(rateLimitKey);

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

    @Transactional
    public AuthResponse confirmReset(String rawToken, String newPassword) {
        PasswordResetToken token = tokenRepository.findByTokenHash(hash(rawToken)).orElse(null);

        // Once a token resolves to a user, brute-force protection keys off that account, same as
        // login; an unrecognised token falls back to a shared key so blind guessing still gets
        // throttled without needing to know who it belongs to.
        String rateLimitKey = token != null
                ? RateLimitService.passwordResetKey(token.getUser().getEmail())
                : "password-reset:unknown-token";
        rateLimitService.assertNotBlocked(rateLimitKey);

        if (token == null || !token.isUsable(Instant.now())) {
            rateLimitService.recordFailure(rateLimitKey);
            throw new BadRequestException("Link invalido ou expirado. Peca um novo.");
        }

        User user = token.getUser();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        token.setUsedAt(Instant.now());
        tokenRepository.save(token);

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
