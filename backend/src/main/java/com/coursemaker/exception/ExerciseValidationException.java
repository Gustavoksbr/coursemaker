package com.coursemaker.exception;

import com.coursemaker.dto.code.CodeExerciseDtos.ValidationResponse;
import com.coursemaker.exception.ApiExceptions.ApiException;
import org.springframework.http.HttpStatus;

/**
 * 422 - the exercise was well formed, but its own reference solution does not pass its own tests
 * (or does not even run). Carries the per-test results so the editor can show which test failed
 * and what the solution returned instead.
 */
public class ExerciseValidationException extends ApiException {

    private final transient ValidationResponse validation;

    public ExerciseValidationException(String message, ValidationResponse validation) {
        super(HttpStatus.UNPROCESSABLE_ENTITY, message);
        this.validation = validation;
    }

    public ValidationResponse getValidation() {
        return validation;
    }
}
