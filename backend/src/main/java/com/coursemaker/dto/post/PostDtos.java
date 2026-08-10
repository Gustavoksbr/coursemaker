package com.coursemaker.dto.post;

import com.coursemaker.domain.enums.CourseStatus;
import com.coursemaker.domain.enums.CourseVisibility;
import com.coursemaker.dto.curriculum.CurriculumDtos.BlockResponse;
import com.coursemaker.dto.user.UserSummary;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class PostDtos {

    private PostDtos() {
    }

    public record PostSummary(
            UUID id,
            String title,
            String slug,
            String description,
            String thumbnailUrl,
            CourseVisibility visibility,
            CourseStatus status,
            List<String> categories,
            boolean featured,
            UserSummary owner,
            long likeCount,
            boolean likedByMe,
            boolean savedByMe,
            Instant createdAt,
            Instant updatedAt) {
    }

    public record PostDetail(PostSummary summary, List<BlockResponse> blocks, boolean isOwner) {
    }

    private static final int MAX_CATEGORY_LENGTH = 50;

    public record CreatePostRequest(
            @NotBlank @Size(max = 255) String title,
            @Size(max = 255) String slug,
            @Size(max = 5000) String description,
            @Size(max = 2000) String thumbnailUrl,
            CourseVisibility visibility,
            List<@Size(max = MAX_CATEGORY_LENGTH) String> categories) {
    }

    public record UpdatePostRequest(
            @Size(min = 1, max = 255) String title,
            @Size(max = 5000) String description,
            @Size(max = 2000) String thumbnailUrl,
            CourseVisibility visibility,
            CourseStatus status,
            List<@Size(max = MAX_CATEGORY_LENGTH) String> categories) {
    }
}
