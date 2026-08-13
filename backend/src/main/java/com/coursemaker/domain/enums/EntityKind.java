package com.coursemaker.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** The kind of content a comment or notification targets. */
public enum EntityKind {

    COURSE("course"),
    POST("post"),
    TRILHA("trilha");

    private final String value;

    EntityKind(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static EntityKind from(String raw) {
        if (raw == null) {
            return null;
        }
        for (EntityKind candidate : values()) {
            if (candidate.value.equalsIgnoreCase(raw)) {
                return candidate;
            }
        }
        throw new IllegalArgumentException("Unknown entity kind: " + raw);
    }
}
