package com.coursemaker.dto.comment;

import com.coursemaker.dto.user.UserSummary;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class CommentDtos {

    private CommentDtos() {
    }

    /** A comment plus its replies, already nested by the server. */
    public record CommentResponse(
            UUID id,
            UUID parentId,
            UserSummary author,
            String content,
            boolean canDelete,
            Instant createdAt,
            Instant updatedAt,
            List<CommentResponse> replies) {
    }

    public record CreateCommentRequest(
            @NotBlank @Size(max = 5000) String content,
            UUID parentId) {
    }
}
