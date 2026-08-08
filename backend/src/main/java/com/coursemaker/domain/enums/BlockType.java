package com.coursemaker.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum BlockType {

    /** Rich HTML produced by the Tiptap editor. */
    TEXT("text"),

    /** Source code, highlighted client-side with Shiki. */
    CODE("code"),

    /** Image URL. */
    IMAGE("image"),

    /** YouTube URL. */
    VIDEO("video");

    private final String value;

    BlockType(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static BlockType from(String raw) {
        if (raw == null) {
            return null;
        }
        for (BlockType candidate : values()) {
            if (candidate.value.equalsIgnoreCase(raw)) {
                return candidate;
            }
        }
        throw new IllegalArgumentException("Unknown block type: " + raw);
    }
}
