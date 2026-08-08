package com.coursemaker.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum CourseVisibility {

    PUBLIC("public"),
    PRIVATE("private");

    private final String value;

    CourseVisibility(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static CourseVisibility from(String raw) {
        if (raw == null) {
            return null;
        }
        for (CourseVisibility candidate : values()) {
            if (candidate.value.equalsIgnoreCase(raw)) {
                return candidate;
            }
        }
        throw new IllegalArgumentException("Unknown visibility: " + raw);
    }
}
