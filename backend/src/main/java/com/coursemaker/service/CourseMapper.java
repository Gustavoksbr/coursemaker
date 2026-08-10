package com.coursemaker.service;

import com.coursemaker.domain.entity.Course;
import com.coursemaker.domain.entity.User;
import com.coursemaker.dto.course.CourseDtos.CourseSummary;
import com.coursemaker.dto.user.UserSummary;
import com.coursemaker.repository.CourseLikeRepository;
import com.coursemaker.repository.EnrollmentRepository;
import com.coursemaker.repository.LessonRepository;
import com.coursemaker.repository.LibraryItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Builds {@link CourseSummary} payloads.
 *
 * <p>Counts (likes, enrollments, lessons) and per-viewer flags are gathered for the whole page in
 * one query each, so rendering a 12-card listing costs a fixed number of round-trips instead of
 * growing with the result size.
 */
@Component
@RequiredArgsConstructor
public class CourseMapper {

    private final CourseLikeRepository courseLikeRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final LessonRepository lessonRepository;
    private final LibraryItemRepository libraryItemRepository;

    @Transactional(readOnly = true)
    public List<CourseSummary> toSummaries(List<Course> courses, User viewer) {
        if (courses.isEmpty()) {
            return List.of();
        }
        List<UUID> ids = courses.stream().map(Course::getId).toList();

        Map<UUID, Long> likeCounts = toCountMap(courseLikeRepository.countByCourseIds(ids));
        Map<UUID, Long> enrollmentCounts = toCountMap(enrollmentRepository.countByCourseIds(ids));
        Map<UUID, Long> lessonCounts = new HashMap<>();
        for (UUID id : ids) {
            lessonCounts.put(id, lessonRepository.countByCourseId(id));
        }

        Set<UUID> liked = viewer == null ? Set.of()
                : new HashSet<>(courseLikeRepository.findLikedCourseIds(viewer.getId(), ids));
        Set<UUID> enrolled = viewer == null ? Set.of()
                : new HashSet<>(enrollmentRepository.findEnrolledCourseIds(viewer.getId(), ids));
        Set<UUID> saved = viewer == null ? Set.of()
                : new HashSet<>(libraryItemRepository.findSavedCourseIds(viewer.getId(), ids));

        return courses.stream()
                .map(course -> toSummary(course,
                        likeCounts.getOrDefault(course.getId(), 0L),
                        enrollmentCounts.getOrDefault(course.getId(), 0L),
                        lessonCounts.getOrDefault(course.getId(), 0L),
                        liked.contains(course.getId()),
                        enrolled.contains(course.getId()),
                        saved.contains(course.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public CourseSummary toSummary(Course course, User viewer) {
        return toSummaries(List.of(course), viewer).get(0);
    }

    private CourseSummary toSummary(Course course, long likeCount, long enrollmentCount, long lessonCount,
                                    boolean likedByMe, boolean enrolledByMe, boolean savedByMe) {
        return new CourseSummary(
                course.getId(),
                course.getName(),
                course.getSlug(),
                course.getDescription(),
                course.getThumbnailUrl(),
                course.getVisibility(),
                course.getStatus(),
                course.getCategories(),
                course.isFeatured(),
                course.isProgressEnabled(),
                UserSummary.from(course.getOwner()),
                likeCount,
                enrollmentCount,
                lessonCount,
                likedByMe,
                enrolledByMe,
                savedByMe,
                course.getCreatedAt(),
                course.getUpdatedAt());
    }

    private Map<UUID, Long> toCountMap(Collection<Object[]> rows) {
        Map<UUID, Long> counts = new HashMap<>();
        for (Object[] row : rows) {
            counts.put((UUID) row[0], ((Number) row[1]).longValue());
        }
        return counts;
    }
}
