package com.coursemaker.service;

import com.coursemaker.domain.entity.LoginAttempt;
import com.coursemaker.exception.ApiExceptions.RateLimitExceededException;
import com.coursemaker.repository.LoginAttemptRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.support.TransactionTemplate;
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
    private final PlatformTransactionManager transactionManager;

    @PersistenceContext
    private EntityManager entityManager;

    @Value("${app.private-content-rate-limit.max-attempts}")
    private int maxAttempts;

    @Value("${app.private-content-rate-limit.block-minutes}")
    private int blockMinutes;

    public static String loginKey(String email) {
        return "login:" + email.toLowerCase();
    }

    /**
     * Login throttle scoped to one client: {@code (ip, identifier)}. An attacker guessing a victim's
     * password burns only their own bucket, never the victim's - so they cannot lock the real owner
     * out (account-lockout DoS). The identifier is hashed to keep the key within the column size.
     */
    public static String loginClientKey(String ip, String identifier) {
        return "login:" + ip + ":" + sha256(identifier.toLowerCase());
    }

    /** Sign-up throttle per client IP. */
    public static String registerIpKey(String ip) {
        return "register-ip:" + ip;
    }

    /** Login throttle for a whole IP, across identifiers - catches one client spraying many accounts. */
    public static String loginIpKey(String ip) {
        return "login-ip:" + ip;
    }

    private static String sha256(String value) {
        try {
            byte[] hash = java.security.MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(hash);
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    /** Password-reset EMAIL requests, per client+target: one IP cannot make us spam one inbox. */
    public static String resetRequestClientKey(String ip, String email) {
        return "reset-request:" + ip + ":" + sha256(email.toLowerCase());
    }

    /** Password-reset email requests from one IP, across all addresses (mass mail-bombing). */
    public static String resetRequestIpKey(String ip) {
        return "reset-request-ip:" + ip;
    }

    /** Backstop on how many reset emails one inbox gets in total, whoever asks (distributed flood). */
    public static String resetRequestEmailKey(String email) {
        return "reset-request-email:" + sha256(email.toLowerCase());
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
                        "Muitas tentativas. Tente novamente em " + humanize(retryAfter) + ".",
                        Math.max(1, retryAfter));
            }
        });
    }

    /**
     * How many failures are tolerated, within which window, and for how long the key is blocked
     * afterwards. A null {@code window} means failures never age out (only a success or an expired
     * block resets them).
     */
    public record Policy(int maxAttempts, Duration window, Duration block) {
    }

    private static String humanize(long seconds) {
        return seconds >= 60 ? Math.max(1, seconds / 60) + " minuto(s)" : Math.max(1, seconds) + " segundo(s)";
    }

    /** What one atomic hit left behind: the new count and, if the key is blocked, until when. */
    private record Hit(int count, Instant blockedUntil) {
    }

    /** Counts an attempt against the default (private-content) policy; see {@link #consume(String, Policy)}. */
    public int consume(String identifier) {
        return consume(identifier, new Policy(maxAttempts, null, Duration.ofMinutes(blockMinutes)));
    }

    /**
     * Counts ONE attempt BEFORE the credential is checked, and refuses it (429) once the policy's
     * limit is already spent. Returns how many attempts remain after this one.
     *
     * <p>The increment is a single atomic SQL statement, so concurrent requests cannot both read the
     * same count and slip past the limit (the old "read, check password, then write" left a window of
     * one bcrypt wide). Call {@link #recordSuccess} / {@link #refund} when the credential turns out right.
     */
    public int consume(String identifier, Policy policy) {
        TransactionTemplate template = new TransactionTemplate(transactionManager);
        // Own transaction: the increment must survive the caller rolling back after it throws 401.
        template.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        Instant now = Instant.now();
        Hit hit = template.execute(status -> hit(identifier, policy, now));

        if (hit.count() > policy.maxAttempts()) {
            Instant until = hit.blockedUntil() != null ? hit.blockedUntil() : now.plus(policy.block());
            long retryAfter = Math.max(1, Duration.between(now, until).toSeconds());
            throw new RateLimitExceededException(
                    "Muitas tentativas. Tente novamente em " + humanize(retryAfter) + ".", retryAfter);
        }
        return Math.max(0, policy.maxAttempts() - hit.count());
    }

    @SuppressWarnings("unchecked")
    private Hit hit(String identifier, Policy policy, Instant now) {
        // A block that already expired, or a window that already elapsed, starts the count over.
        String expired = "((login_attempts.blocked_until IS NOT NULL AND login_attempts.blocked_until <= :now)"
                + " OR (:window > 0 AND (login_attempts.window_start IS NULL"
                + " OR login_attempts.window_start + make_interval(secs => CAST(:window AS double precision)) <= :now)))";
        String newCount = "(CASE WHEN " + expired + " THEN 1 ELSE login_attempts.attempts_count + 1 END)";
        String blockEnd = "(CAST(:now AS timestamptz) + make_interval(secs => CAST(:block AS double precision)))";

        String sql = "INSERT INTO login_attempts (identifier, attempts_count, last_attempt, window_start, blocked_until)"
                + " VALUES (:id, 1, :now, :now, CASE WHEN 1 >= :max THEN " + blockEnd + " ELSE NULL END)"
                + " ON CONFLICT (identifier) DO UPDATE SET"
                + " attempts_count = " + newCount + ","
                + " window_start = CASE WHEN " + expired + " THEN :now"
                + " ELSE COALESCE(login_attempts.window_start, :now) END,"
                + " last_attempt = :now,"
                + " blocked_until = CASE"
                + "   WHEN login_attempts.blocked_until IS NOT NULL AND login_attempts.blocked_until > :now"
                + "     THEN login_attempts.blocked_until"
                + "   WHEN " + newCount + " >= :max THEN " + blockEnd
                + "   ELSE NULL END"
                + " RETURNING attempts_count, blocked_until";

        Object[] row = (Object[]) entityManager.createNativeQuery(sql)
                .setParameter("id", identifier)
                .setParameter("now", now)
                .setParameter("max", policy.maxAttempts())
                .setParameter("window", policy.window() == null ? 0L : policy.window().toSeconds())
                .setParameter("block", (double) policy.block().toSeconds())
                .getSingleResult();
        return new Hit(((Number) row[0]).intValue(), toInstant(row[1]));
    }

    private static Instant toInstant(Object value) {
        if (value == null) return null;
        if (value instanceof Instant instant) return instant;
        if (value instanceof java.sql.Timestamp timestamp) return timestamp.toInstant();
        if (value instanceof java.time.OffsetDateTime offset) return offset.toInstant();
        throw new IllegalStateException("Unexpected timestamp type " + value.getClass());
    }

    /**
     * Gives back one attempt that {@link #consume} counted, once the credential turned out valid -
     * for buckets that must count only failures but cannot be wiped on success (the per-IP ones).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void refund(String identifier, int maxAttempts) {
        entityManager.createNativeQuery("UPDATE login_attempts SET"
                        + " attempts_count = GREATEST(attempts_count - 1, 0),"
                        + " blocked_until = CASE WHEN attempts_count - 1 < :max THEN NULL ELSE blocked_until END"
                        + " WHERE identifier = :id")
                .setParameter("id", identifier)
                .setParameter("max", maxAttempts)
                .executeUpdate();
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
