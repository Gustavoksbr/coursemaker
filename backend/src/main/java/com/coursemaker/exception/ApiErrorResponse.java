package com.coursemaker.exception;

import java.time.Instant;
import java.util.Map;

/**
 * The single error shape the API returns. {@code fieldErrors} is only populated for bean-validation
 * failures so the frontend can highlight individual inputs.
 */
public record ApiErrorResponse(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path,
        Map<String, String> fieldErrors) {

    public static ApiErrorResponse of(int status, String error, String message, String path) {
        return new ApiErrorResponse(Instant.now(), status, error, message, path, null);
    }

    public static ApiErrorResponse withFields(int status, String error, String message, String path,
                                              Map<String, String> fieldErrors) {
        return new ApiErrorResponse(Instant.now(), status, error, message, path, fieldErrors);
    }
}
