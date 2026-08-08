package com.coursemaker.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum CourseStatus {

    /** Published: visible to everybody allowed by {@link CourseVisibility}. */
    AVAILABLE("available"),

    /** Draft: only the owner can see it. */
    UNAVAILABLE("unavailable");

    private final String value;

    CourseStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static CourseStatus from(String raw) {
        if (raw == null) {
            return null;
        }
        for (CourseStatus candidate : values()) {
            if (candidate.value.equalsIgnoreCase(raw)) {
                return candidate;
            }
        }
        throw new IllegalArgumentException("Unknown status: " + raw);
    }
}
