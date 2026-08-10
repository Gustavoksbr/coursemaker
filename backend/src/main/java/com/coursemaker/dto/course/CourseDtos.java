package com.coursemaker.dto.course;

import com.coursemaker.domain.enums.CourseStatus;
import com.coursemaker.domain.enums.CourseVisibility;
import com.coursemaker.dto.curriculum.CurriculumDtos.ModuleResponse;
import com.coursemaker.dto.user.UserSummary;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class CourseDtos {

    private CourseDtos() {
    }

    /** Card-sized payload used by every listing. */
    public record CourseSummary(
            UUID id,
            String name,
            String slug,
            String description,
            String thumbnailUrl,
            CourseVisibility visibility,
            CourseStatus status,
            List<String> categories,
            boolean featured,
            boolean progressEnabled,
            UserSummary owner,
            long likeCount,
            long enrollmentCount,
            long lessonCount,
            boolean likedByMe,
            boolean enrolledByMe,
            boolean savedByMe,
            Instant createdAt,
            Instant updatedAt) {
    }

    /**
     * Full course page.
     *
     * <p>{@code modules} is empty and {@code requiresPassword} is true when the viewer has not yet
     * unlocked a private course - the landing page stays visible either way.
     */
    public record CourseDetail(
            CourseSummary summary,
            String landingDescription,
            List<ModuleResponse> modules,
            boolean isOwner,
            boolean canViewContent,
            boolean requiresPassword,
            boolean hasPassword,
            ProgressResponse progress) {
    }

    public record ProgressResponse(long completedLessons, long totalLessons, int percentage,
                                   List<UUID> completedLessonIds) {
    }

    // Same reasoning as AuthDtos.MAX_PASSWORD_LENGTH: BCrypt ignores anything past 72 bytes.
    private static final int MAX_PASSWORD_LENGTH = 72;
    private static final int MAX_CATEGORY_LENGTH = 50;

    public record CreateCourseRequest(
            @NotBlank @Size(max = 255) String name,
            @Size(max = 255) String slug,
            @Size(max = 5000) String description,
            @Size(max = 50000) String landingDescription,
            @Size(max = 2000) String thumbnailUrl,
            CourseVisibility visibility,
            @Size(max = MAX_PASSWORD_LENGTH) String password,
            List<@Size(max = MAX_CATEGORY_LENGTH) String> categories,
            Boolean progressEnabled) {
    }

    /** Partial update: null means "leave unchanged". */
    public record UpdateCourseRequest(
            @Size(min = 1, max = 255) String name,
            @Size(max = 5000) String description,
            @Size(max = 50000) String landingDescription,
            @Size(max = 2000) String thumbnailUrl,
            CourseVisibility visibility,
            CourseStatus status,
            @Size(max = MAX_PASSWORD_LENGTH) String password,
            List<@Size(max = MAX_CATEGORY_LENGTH) String> categories,
            Boolean progressEnabled) {
    }

    /** Response of the slug availability check used by the create-course modal. */
    public record SlugAvailability(String slug, boolean available, String suggestion) {
    }

    public record StudentResponse(UserSummary user, Instant enrolledAt, boolean hasPrivateAccess) {
    }
}
