package com.coursemaker.dto.ai;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

public final class AiChatDtos {

    private AiChatDtos() {
    }

    /** One turn of prior conversation, sent back by the client so the assistant keeps context. */
    public record ChatMessage(
            @NotBlank @Pattern(regexp = "user|assistant") String role,
            @NotBlank @Size(max = 4000) String content) {
    }

    public record ChatRequest(
            @NotBlank @Size(max = 2000) String message,
            @Size(max = 12) List<@Valid ChatMessage> history) {
    }

    public record ChatResponse(String reply) {
    }
}
