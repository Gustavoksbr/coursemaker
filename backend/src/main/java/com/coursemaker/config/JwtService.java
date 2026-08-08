package com.coursemaker.config;

import com.coursemaker.domain.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;

/**
 * Issues and verifies the HS256 tokens the SPA keeps in localStorage.
 *
 * <p>Written against the jjwt 0.12.x fluent API ({@code subject(..)}, {@code parser().verifyWith(..)});
 * the 0.11-era {@code setSubject}/{@code parserBuilder} names no longer exist.
 */
@Slf4j
@Service
public class JwtService {

    private final SecretKey signingKey;
    private final Duration expiry;
    private final String issuer;

    public JwtService(@Value("${jwt.secret}") String jwtSecret,
                      @Value("${jwt.expiry-hours}") int expiryHours,
                      @Value("${jwt.issuer}") String issuer) {
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            throw new IllegalStateException(
                    "JWT_SECRET must be at least 32 bytes for HS256. Generate one with: openssl rand -hex 64");
        }
        this.signingKey = Keys.hmacShaKeyFor(keyBytes);
        this.expiry = Duration.ofHours(expiryHours);
        this.issuer = issuer;
    }

    public String generateToken(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(user.getId().toString())
                .issuer(issuer)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(expiry)))
                .claim("email", user.getEmail())
                .claim("role", user.getRole().getValue())
                .signWith(signingKey)
                .compact();
    }

    public Claims extractClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .requireIssuer(issuer)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /** Empty when the token is missing, malformed, expired, or signed with a different key. */
    public Optional<UUID> extractUserId(String token) {
        try {
            return Optional.of(UUID.fromString(extractClaims(token).getSubject()));
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("Rejected JWT: {}", e.getMessage());
            return Optional.empty();
        }
    }

    public boolean isTokenValid(String token) {
        return extractUserId(token).isPresent();
    }

    public long getExpiresInSeconds() {
        return expiry.toSeconds();
    }
}
