package com.coursemaker.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum NotificationType {

    /** Someone enrolled in a course the recipient owns. */
    ENROLLMENT("enrollment"),

    /** Someone started following a trilha the recipient owns. */
    TRILHA_FOLLOW("trilha_follow"),

    /** Someone commented on a course/post/trilha the recipient owns. */
    COMMENT("comment"),

    /** Admin blocked a course/post/trilha owned by the recipient. */
    ADMIN_BLOCKED("admin_blocked"),

    /** Admin unblocked a course/post/trilha owned by the recipient. */
    ADMIN_UNBLOCKED("admin_unblocked");

    private final String value;

    NotificationType(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static NotificationType from(String raw) {
        if (raw == null) {
            return null;
        }
        for (NotificationType candidate : values()) {
            if (candidate.value.equalsIgnoreCase(raw)) {
                return candidate;
            }
        }
        throw new IllegalArgumentException("Unknown notification type: " + raw);
    }
}
