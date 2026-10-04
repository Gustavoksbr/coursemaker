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
    VIDEO("video"),

    /** Multiple-choice question. `content` holds a JSON-encoded alternatives list. */
    QUESTION("question"),

    /**
     * Auto-graded code exercise. content holds only the PUBLIC part (starter code, visible
     * examples) as JSON built by the server; the reference solution and the hidden tests live in
     * the code_exercises tables and never leave the backend.
     */
    CODE_EXERCISE("code_exercise");

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
