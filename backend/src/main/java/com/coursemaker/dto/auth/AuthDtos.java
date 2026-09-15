package com.coursemaker.dto.auth;

import com.coursemaker.dto.user.UserResponse;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

    private AuthDtos() {
    }

    // BCrypt only ever looks at the first 72 bytes of a password; anything past that is silently
    // ignored, so a longer max would be a lie (two different "passwords" that agree on the first
    // 72 bytes would both work). Every password field in the API shares this ceiling.
    private static final int MAX_PASSWORD_LENGTH = 72;

    public record RegisterRequest(
            @NotBlank @Email @Size(max = 255)
            String email,

            @NotBlank @Size(min = 8, max = MAX_PASSWORD_LENGTH, message = "a senha deve ter entre 8 e 72 caracteres")
            String password,

            @NotBlank @Size(min = 1, max = 255)
            String name) {
    }

    /** {@code identifier} accepts either an email (contains "@") or a nickname (never does, per
     * the {@code ^[a-z0-9][a-z0-9-]*$} nickname pattern), so the two never collide. */
    public record LoginRequest(
            @NotBlank @Size(max = 255)
            String identifier,

            @NotBlank @Size(max = MAX_PASSWORD_LENGTH)
            String password) {
    }

    /** The ID token returned by Google Identity Services on the frontend. */
    public record GoogleLoginRequest(
            @NotBlank @Size(max = 8192)
            String idToken) {
    }

    public record AuthResponse(String token, long expiresIn, UserResponse user) {
    }

    public record RequestPasswordResetRequest(
            @NotBlank @Email @Size(max = 255)
            String email) {
    }

    public record ConfirmPasswordResetRequest(
            @NotBlank @Size(max = 255)
            String token,

            @NotBlank @Size(min = 8, max = MAX_PASSWORD_LENGTH, message = "a senha deve ter entre 8 e 72 caracteres")
            String newPassword) {
    }
}
