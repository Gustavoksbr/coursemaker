package com.coursemaker.service;

import com.coursemaker.domain.entity.LoginAttempt;
import com.coursemaker.exception.ApiExceptions.RateLimitExceededException;
import com.coursemaker.repository.LoginAttemptRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

/**
 * Brute-force protection shared by login and private-course password checks: N failures in a row
 * block the identifier for a fixed window; any success clears the counter.
 *
 * <p>Counters are recorded in their own transaction ({@code REQUIRES_NEW}) so a failed attempt is
 * still persisted when the caller's transaction rolls back after throwing.
 */
@Service
@RequiredArgsConstructor
public class RateLimitService {

    private final LoginAttemptRepository loginAttemptRepository;

    @Value("${app.rate-limit.max-attempts}")
    private int maxAttempts;

    @Value("${app.rate-limit.block-minutes}")
    private int blockMinutes;

    public static String loginKey(String email) {
        return "login:" + email.toLowerCase();
    }

    public static String passwordResetKey(String email) {
        return "password-reset:" + email.toLowerCase();
    }

    public static String privateCourseKey(UUID courseId, UUID userId) {
        return "private-course:" + courseId + ":" + userId;
    }

    public static String privatePostKey(UUID postId, UUID userId) {
        return "private-post:" + postId + ":" + userId;
    }

    /** Throws 429 if this identifier is currently blocked. Call before checking the credential. */
    @Transactional(readOnly = true)
    public void assertNotBlocked(String identifier) {
        Instant now = Instant.now();
        loginAttemptRepository.findById(identifier).ifPresent(attempt -> {
            if (attempt.isBlockedAt(now)) {
                long retryAfter = Duration.between(now, attempt.getBlockedUntil()).toSeconds();
                throw new RateLimitExceededException(
                        "Muitas tentativas. Tente novamente em " + Math.max(1, retryAfter / 60) + " minuto(s).",
                        Math.max(1, retryAfter));
            }
        });
    }

    /** Records a failure. Once {@code maxAttempts} is reached the identifier is blocked. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordFailure(String identifier) {
        Instant now = Instant.now();
        LoginAttempt attempt = loginAttemptRepository.findById(identifier)
                .orElseGet(() -> {
                    LoginAttempt fresh = new LoginAttempt();
                    fresh.setIdentifier(identifier);
                    fresh.setAttemptsCount(0);
                    return fresh;
                });

        // A previous block that has already expired starts the count over.
        if (attempt.getBlockedUntil() != null && !attempt.isBlockedAt(now)) {
            attempt.setAttemptsCount(0);
            attempt.setBlockedUntil(null);
        }

        attempt.setAttemptsCount(attempt.getAttemptsCount() + 1);
        attempt.setLastAttempt(now);
        if (attempt.getAttemptsCount() >= maxAttempts) {
            attempt.setBlockedUntil(now.plus(Duration.ofMinutes(blockMinutes)));
        }
        loginAttemptRepository.save(attempt);
    }

    /** Clears the counter after a successful authentication. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordSuccess(String identifier) {
        loginAttemptRepository.deleteById(identifier);
    }

    public int getMaxAttempts() {
        return maxAttempts;
    }

    /** How many tries are left before the identifier gets blocked; used in error messages. */
    @Transactional(readOnly = true)
    public int remainingAttempts(String identifier) {
        return loginAttemptRepository.findById(identifier)
                .map(attempt -> Math.max(0, maxAttempts - attempt.getAttemptsCount()))
                .orElse(maxAttempts);
    }
}
