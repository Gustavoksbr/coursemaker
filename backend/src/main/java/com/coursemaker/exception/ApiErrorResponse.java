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
        Map<String, String> fieldErrors,
        RateLimitInfo rateLimit) {

    /**
     * Throttling state, present on login failures and 429s so the UI can tell the user how many
     * tries are left ({@code remainingAttempts}), how long a block lasts ({@code blockSeconds}) and,
     * once blocked, how long to wait ({@code retryAfterSeconds}).
     */
    public record RateLimitInfo(Integer remainingAttempts, Long blockSeconds, Long retryAfterSeconds) {
    }

    public static ApiErrorResponse of(int status, String error, String message, String path) {
        return new ApiErrorResponse(Instant.now(), status, error, message, path, null, null);
    }

    public static ApiErrorResponse withRateLimit(int status, String error, String message, String path,
                                                 RateLimitInfo rateLimit) {
        return new ApiErrorResponse(Instant.now(), status, error, message, path, null, rateLimit);
    }

    public static ApiErrorResponse withFields(int status, String error, String message, String path,
                                              Map<String, String> fieldErrors) {
        return new ApiErrorResponse(Instant.now(), status, error, message, path, fieldErrors, null);
    }
}
