package com.coursemaker.dto.enrollment;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public final class EnrollmentDtos {

    private EnrollmentDtos() {
    }

    // Same reasoning as AuthDtos.MAX_PASSWORD_LENGTH: BCrypt ignores anything past 72 bytes.
    private static final int MAX_PASSWORD_LENGTH = 72;

    public record EnrollRequest(@NotNull UUID courseId, @Size(max = MAX_PASSWORD_LENGTH) String password) {
    }

    public record ValidatePrivateAccessRequest(
            @NotNull UUID courseId,
            @NotBlank @Size(max = MAX_PASSWORD_LENGTH) String password) {
    }

    public record PrivateAccessResponse(boolean granted, int remainingAttempts) {
    }

    public record EnrollmentStatusResponse(UUID courseId, boolean enrolled, long enrollmentCount) {
    }
}
