package com.coursemaker.dto.trilha;

import com.coursemaker.domain.enums.CourseStatus;
import com.coursemaker.domain.enums.CourseVisibility;
import com.coursemaker.dto.course.CourseDtos.CourseSummary;
import com.coursemaker.dto.course.CourseDtos.ProgressResponse;
import com.coursemaker.dto.post.PostDtos.PostSummary;
import com.coursemaker.dto.user.UserSummary;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class TrilhaDtos {

    private TrilhaDtos() {
    }

    private static final int MAX_CATEGORY_LENGTH = 50;

    /** Card-sized payload used by every listing. */
    public record TrilhaSummary(
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
            long itemCount,
            long enrollmentCount,
            boolean enrolledByMe,
            boolean savedByMe,
            Instant createdAt,
            Instant updatedAt) {
    }

    public record TrilhaDetail(
            TrilhaSummary summary,
            boolean isOwner,
            boolean enrolledByMe,
            TrilhaProgressResponse progress,
            TrilhaStructure structure) {
    }

    public record TrilhaProgressResponse(long completedItems, long totalItems, int percentage) {
    }

    /** Every item of the trilha, grouped the way the owner organized it. */
    public record TrilhaStructure(List<TrilhaStepResponse> steps, List<TrilhaItemResponse> ungroupedItems) {
    }

    public record TrilhaStepResponse(
            UUID id,
            String title,
            String description,
            int orderIndex,
            List<TrilhaItemResponse> items) {
    }

    /**
     * One slot of the trilha's ordered sequence. Exactly one of {@code course}/{@code post} is
     * set. {@code manuallyCompleted} is the trilha-level flag; {@code courseProgress} is the
     * course's own lesson progress, shown independently rather than merged with it. {@code note}
     * is the trilha owner's own annotation about this item, not a discussion thread.
     */
    public record TrilhaItemResponse(
            UUID id,
            UUID stepId,
            int orderIndex,
            CourseSummary course,
            PostSummary post,
            String note,
            boolean manuallyCompleted,
            ProgressResponse courseProgress,
            Instant createdAt) {
    }

    public record CreateTrilhaRequest(
            @NotBlank @Size(max = 255) String title,
            @Size(max = 255) String slug,
            @Size(max = 5000) String description,
            @Size(max = 2000) String thumbnailUrl,
            CourseVisibility visibility,
            List<@Size(max = MAX_CATEGORY_LENGTH) String> categories) {
    }

    /** Partial update: null means "leave unchanged". */
    public record UpdateTrilhaRequest(
            @Size(min = 1, max = 255) String title,
            @Size(max = 5000) String description,
            @Size(max = 2000) String thumbnailUrl,
            CourseVisibility visibility,
            CourseStatus status,
            List<@Size(max = MAX_CATEGORY_LENGTH) String> categories) {
    }

    /** Exactly one of {@code courseId}/{@code postId} must be set. {@code stepId} is optional. */
    public record AddTrilhaItemRequest(UUID courseId, UUID postId, UUID stepId, Integer orderIndex) {
    }

    /** Partial update: null means "leave unchanged". Does not move the item between steps. */
    public record UpdateTrilhaItemRequest(Integer orderIndex, @Size(max = 5000) String note) {
    }

    /** {@code stepId} is always applied, including {@code null} to ungroup the item. */
    public record MoveTrilhaItemRequest(UUID stepId) {
    }

    /**
     * Full ordered id list for one group of items: the items directly in step {@code stepId}, or
     * the ungrouped items when {@code stepId} is {@code null}. Must contain exactly that group's
     * items, no more, no fewer -- same contract as the module/lesson/block reorder endpoints.
     */
    public record ReorderTrilhaItemsRequest(UUID stepId, @NotEmpty List<UUID> ids) {
    }

    public record CreateTrilhaStepRequest(
            @NotBlank @Size(max = 255) String title,
            @Size(max = 5000) String description) {
    }

    /** Partial update: null means "leave unchanged". */
    public record UpdateTrilhaStepRequest(
            @Size(min = 1, max = 255) String title,
            @Size(max = 5000) String description) {
    }
}
