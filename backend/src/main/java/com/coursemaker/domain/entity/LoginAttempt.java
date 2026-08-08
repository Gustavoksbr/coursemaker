package com.coursemaker.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Brute-force counter. The identifier is whatever we want to throttle: an email for login, or
 * {@code private-course:<courseId>:<userId>} for private-course password checks.
 */
@Entity
@Table(name = "login_attempts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LoginAttempt {

    @Id
    @Column(name = "identifier", nullable = false)
    private String identifier;

    @Column(name = "attempts_count", nullable = false)
    private int attemptsCount;

    @Column(name = "last_attempt", nullable = false)
    private Instant lastAttempt;

    @Column(name = "blocked_until")
    private Instant blockedUntil;

    public boolean isBlockedAt(Instant now) {
        return blockedUntil != null && blockedUntil.isAfter(now);
    }
}
