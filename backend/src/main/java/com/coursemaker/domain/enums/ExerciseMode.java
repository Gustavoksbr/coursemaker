package com.coursemaker.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** How a code exercise is graded. */
public enum ExerciseMode {

    /** The student writes one function; each test calls it with arguments and compares the return. */
    FUNCTION("function"),

    /** The student writes a whole program; each test feeds stdin and compares stdout. */
    OUTPUT("output");

    private final String value;

    ExerciseMode(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static ExerciseMode from(String raw) {
        if (raw == null) {
            return null;
        }
        for (ExerciseMode candidate : values()) {
            if (candidate.value.equalsIgnoreCase(raw)) {
                return candidate;
            }
        }
        throw new IllegalArgumentException("Unknown exercise mode: " + raw);
    }
}
