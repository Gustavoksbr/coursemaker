package com.coursemaker.exception;

import com.coursemaker.dto.code.CodeExerciseDtos.ValidationResponse;

import java.time.Instant;

/** The standard error shape plus the per-test results of a reference solution that failed validation. */
public record ExerciseValidationErrorResponse(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path,
        ValidationResponse validation) {
}
