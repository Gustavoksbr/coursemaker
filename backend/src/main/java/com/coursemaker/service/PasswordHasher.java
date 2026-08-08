package com.coursemaker.service;

import com.coursemaker.exception.ApiExceptions.BadRequestException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** Thin wrapper over the BCrypt encoder, used for private-course passwords. */
@Component
@RequiredArgsConstructor
public class PasswordHasher {

    private final PasswordEncoder passwordEncoder;

    public String hash(String rawPassword) {
        return passwordEncoder.encode(rawPassword);
    }

    public String hashRequired(String rawPassword, String messageWhenMissing) {
        if (rawPassword == null || rawPassword.isBlank()) {
            throw new BadRequestException(messageWhenMissing);
        }
        return passwordEncoder.encode(rawPassword);
    }

    public boolean matches(String rawPassword, String hash) {
        return hash != null && rawPassword != null && passwordEncoder.matches(rawPassword, hash);
    }
}
