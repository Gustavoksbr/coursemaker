package com.coursemaker.exception;

import org.springframework.http.HttpStatus;

/**
 * The exceptions the service layer throws. Each one carries the HTTP status it maps to, so
 * {@link GlobalExceptionHandler} stays a single, dumb translation point.
 */
public final class ApiExceptions {

    private ApiExceptions() {
    }

    /** Base type: anything thrown here is a deliberate, client-facing outcome. */
    public abstract static class ApiException extends RuntimeException {

        private final HttpStatus status;

        protected ApiException(HttpStatus status, String message) {
            super(message);
            this.status = status;
        }

        public HttpStatus getStatus() {
            return status;
        }
    }

    /** 404 - the resource does not exist, or the caller is not allowed to know that it does. */
    public static class ResourceNotFoundException extends ApiException {
        public ResourceNotFoundException(String message) {
            super(HttpStatus.NOT_FOUND, message);
        }

        public static ResourceNotFoundException of(String what) {
            return new ResourceNotFoundException(what + " nao encontrado");
        }
    }

    /** 401 - no credentials, or credentials that do not check out. */
    public static class UnauthorizedException extends ApiException {
        public UnauthorizedException(String message) {
            super(HttpStatus.UNAUTHORIZED, message);
        }
    }

    /** 403 - authenticated, but not allowed to do this. */
    public static class ForbiddenException extends ApiException {
        public ForbiddenException(String message) {
            super(HttpStatus.FORBIDDEN, message);
        }
    }

    /** 409 - the request conflicts with existing state (duplicate email, nickname, ...). */
    public static class ConflictException extends ApiException {
        public ConflictException(String message) {
            super(HttpStatus.CONFLICT, message);
        }
    }

    /** 400 - the request itself is malformed or semantically invalid. */
    public static class BadRequestException extends ApiException {
        public BadRequestException(String message) {
            super(HttpStatus.BAD_REQUEST, message);
        }
    }

    /** 429 - too many failed attempts; the caller is temporarily blocked. */
    public static class RateLimitExceededException extends ApiException {

        private final long retryAfterSeconds;

        public RateLimitExceededException(String message, long retryAfterSeconds) {
            super(HttpStatus.TOO_MANY_REQUESTS, message);
            this.retryAfterSeconds = retryAfterSeconds;
        }

        public long getRetryAfterSeconds() {
            return retryAfterSeconds;
        }
    }
}
