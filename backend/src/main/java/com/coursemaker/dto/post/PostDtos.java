package com.coursemaker.dto.post;

import com.coursemaker.domain.enums.CourseStatus;
import com.coursemaker.domain.enums.CourseVisibility;
import com.coursemaker.dto.area.AreaDtos.AreaSummary;
import com.coursemaker.dto.curriculum.CurriculumDtos.BlockResponse;
import com.coursemaker.dto.school.SchoolDtos.SchoolSummary;
import com.coursemaker.dto.user.UserSummary;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
            AreaSummary area,
            SchoolSummary school,
            UserSummary owner,
            long likeCount,
            boolean likedByMe,
            boolean savedByMe,
            Instant createdAt,
            Instant updatedAt) {
    }

    /**
     * Full post page.
     *
     * <p>{@code blocks} is empty and {@code requiresPassword} is true when the viewer has not yet
     * unlocked a private post - the title/description/thumbnail stay visible either way.
     */
    public record PostDetail(
            PostSummary summary,
            List<BlockResponse> blocks,
            boolean isOwner,
            boolean requiresPassword,
            boolean hasPassword) {
    }

    // Same reasoning as AuthDtos.MAX_PASSWORD_LENGTH: BCrypt ignores anything past 72 bytes.
    private static final int MAX_PASSWORD_LENGTH = 72;
    private static final int MAX_CATEGORY_LENGTH = 50;

    public record CreatePostRequest(
            @NotBlank @Size(max = 255) String title,
            @Size(max = 255) String slug,
            @Size(max = 5000) String description,
            @Size(max = 2000) String thumbnailUrl,
            CourseVisibility visibility,
            @Size(max = MAX_PASSWORD_LENGTH) String password,
            List<@Size(max = MAX_CATEGORY_LENGTH) String> categories,
            @NotNull UUID areaId,
            UUID schoolId) {
    }

    /** Partial update: null means "leave unchanged". */
    public record UpdatePostRequest(
            @Size(min = 1, max = 255) String title,
            @Size(max = 5000) String description,
            @Size(max = 2000) String thumbnailUrl,
            CourseVisibility visibility,
            CourseStatus status,
            @Size(max = MAX_PASSWORD_LENGTH) String password,
            List<@Size(max = MAX_CATEGORY_LENGTH) String> categories,
            UUID areaId,
            UUID schoolId,
            // schoolId being null normally means "leave unchanged" - this is the one flag that lets
            // the settings panel's "Sem escola" option actually clear it back to no attribution.
            boolean removeSchool) {
    }

    public record ValidatePostAccessRequest(
            @NotNull UUID postId,
            @NotBlank @Size(max = MAX_PASSWORD_LENGTH) String password) {
    }

    public record PrivateAccessResponse(boolean granted, int remainingAttempts) {
    }
}
