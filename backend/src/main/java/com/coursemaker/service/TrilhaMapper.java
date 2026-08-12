package com.coursemaker.service;

import com.coursemaker.domain.entity.Course;
import com.coursemaker.domain.entity.Post;
import com.coursemaker.domain.entity.Trilha;
import com.coursemaker.domain.entity.TrilhaItem;
import com.coursemaker.domain.entity.TrilhaStep;
import com.coursemaker.domain.entity.User;
import com.coursemaker.dto.course.CourseDtos.CourseSummary;
import com.coursemaker.dto.course.CourseDtos.ProgressResponse;
import com.coursemaker.dto.post.PostDtos.PostSummary;
import com.coursemaker.dto.trilha.TrilhaDtos.TrilhaItemResponse;
import com.coursemaker.dto.trilha.TrilhaDtos.TrilhaStepResponse;
import com.coursemaker.dto.trilha.TrilhaDtos.TrilhaStructure;
import com.coursemaker.dto.trilha.TrilhaDtos.TrilhaSummary;
import com.coursemaker.dto.user.UserSummary;
import com.coursemaker.repository.LessonCompletionRepository;
import com.coursemaker.repository.LessonRepository;
import com.coursemaker.repository.LibraryItemRepository;
import com.coursemaker.repository.TrilhaEnrollmentRepository;
import com.coursemaker.repository.TrilhaItemCompletionRepository;
import com.coursemaker.repository.TrilhaItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Builds {@link TrilhaSummary}/{@link TrilhaItemResponse} payloads.
 */
@Component
@RequiredArgsConstructor
public class TrilhaMapper {

    private final TrilhaItemRepository trilhaItemRepository;
    private final TrilhaEnrollmentRepository trilhaEnrollmentRepository;
    private final TrilhaItemCompletionRepository trilhaItemCompletionRepository;
    private final LibraryItemRepository libraryItemRepository;
    private final LessonCompletionRepository lessonCompletionRepository;
    private final LessonRepository lessonRepository;
    private final CourseMapper courseMapper;
    private final PostMapper postMapper;

    @Transactional(readOnly = true)
    public List<TrilhaSummary> toSummaries(List<Trilha> trilhas, User viewer) {
        if (trilhas.isEmpty()) {
            return List.of();
        }
        List<UUID> ids = trilhas.stream().map(Trilha::getId).toList();
        Set<UUID> enrolled = viewer == null ? Set.of()
                : new HashSet<>(trilhaEnrollmentRepository.findEnrolledTrilhaIds(viewer.getId(), ids));
        Set<UUID> saved = viewer == null ? Set.of()
                : new HashSet<>(libraryItemRepository.findSavedTrilhaIds(viewer.getId(), ids));

        return trilhas.stream()
                .map(trilha -> toSummary(trilha, enrolled.contains(trilha.getId()), saved.contains(trilha.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public TrilhaSummary toSummary(Trilha trilha, User viewer) {
        return toSummaries(List.of(trilha), viewer).get(0);
    }

    private TrilhaSummary toSummary(Trilha trilha, boolean enrolledByMe, boolean savedByMe) {
        return new TrilhaSummary(
                trilha.getId(),
                trilha.getTitle(),
                trilha.getSlug(),
                trilha.getDescription(),
                trilha.getThumbnailUrl(),
                trilha.getVisibility(),
                trilha.getStatus(),
                trilha.getCategories(),
                trilha.isFeatured(),
                UserSummary.from(trilha.getOwner()),
                trilhaItemRepository.countByTrilhaId(trilha.getId()),
                trilhaEnrollmentRepository.countByTrilhaId(trilha.getId()),
                enrolledByMe,
                savedByMe,
                trilha.getCreatedAt(),
                trilha.getUpdatedAt());
    }

    /**
     * {@code manuallyCompleted} reflects {@code trilha_item_completions} only. For
     * a course item
     * with progress tracking on, {@code courseProgress} is filled in alongside it
     * -- the two
     * signals are shown independently, never merged, per product decision.
     */
    @Transactional(readOnly = true)
    public List<TrilhaItemResponse> toItemResponses(List<TrilhaItem> items, User viewer) {
        if (items.isEmpty()) {
            return List.of();
        }
        Set<UUID> completed = viewer == null ? Set.of()
                : new HashSet<>(trilhaItemCompletionRepository.findCompletedItemIds(
                        viewer.getId(), items.get(0).getTrilha().getId()));

        return items.stream().map(item -> toItemResponseLegacy(item, viewer, completed)).toList();
    }

    /**
     * Groups every item of the trilha under its step, in display order, plus
     * whatever sits
     * ungrouped directly under the trilha.
     * 
     * OPTIMIZED: Batch processes all courses and posts together instead of N+1
     * queries.
     */
    @Transactional(readOnly = true)
    public TrilhaStructure toStructure(List<TrilhaStep> steps, List<TrilhaItem> allItems, User viewer) {
        if (allItems.isEmpty()) {
            return new TrilhaStructure(List.of(), List.of());
        }

        // Batch: Load all item completions once
        Set<UUID> completedItems = viewer == null ? Set.of()
                : new HashSet<>(trilhaItemCompletionRepository.findCompletedItemIds(
                        viewer.getId(), allItems.get(0).getTrilha().getId()));

        // Batch: Separate and map all courses at once
        List<Course> allCourses = allItems.stream()
                .map(TrilhaItem::getCourse)
                .filter(Objects::nonNull)
                .toList();
        Map<UUID, CourseSummary> courseSummariesById = allCourses.isEmpty() ? Map.of()
                : courseMapper.toSummaries(allCourses, viewer).stream()
                        .collect(Collectors.toMap(CourseSummary::id, s -> s));

        // Batch: Separate and map all posts at once
        List<Post> allPosts = allItems.stream()
                .map(TrilhaItem::getPost)
                .filter(Objects::nonNull)
                .toList();
        Map<UUID, PostSummary> postSummariesById = allPosts.isEmpty() ? Map.of()
                : postMapper.toSummaries(allPosts, viewer).stream()
                        .collect(Collectors.toMap(PostSummary::id, s -> s));

        // Batch: Load course progress for all courses that need it
        Map<UUID, ProgressResponse> courseProgresses = buildCourseProgressBatch(allCourses, viewer);

        // Build item responses using the batched data
        Map<UUID, List<TrilhaItemResponse>> byStepId = allItems.stream()
                .filter(item -> item.getStep() != null)
                .collect(Collectors.groupingBy(
                        item -> item.getStep().getId(),
                        Collectors.mapping(
                                item -> toItemResponse(item, courseSummariesById, postSummariesById,
                                        courseProgresses, completedItems),
                                Collectors.toList())));

        List<TrilhaStepResponse> stepResponses = new ArrayList<>(steps.size());
        for (TrilhaStep step : steps) {
            List<TrilhaItemResponse> stepItems = byStepId.getOrDefault(step.getId(), List.of()).stream()
                    .sorted(Comparator.comparingInt(TrilhaItemResponse::orderIndex))
                    .toList();
            stepResponses.add(new TrilhaStepResponse(step.getId(), step.getTitle(), step.getDescription(),
                    step.getOrderIndex(), stepItems));
        }

        List<TrilhaItemResponse> ungrouped = allItems.stream()
                .filter(item -> item.getStep() == null)
                .sorted(Comparator.comparingInt(TrilhaItem::getOrderIndex))
                .map(item -> toItemResponse(item, courseSummariesById, postSummariesById,
                        courseProgresses, completedItems))
                .toList();

        return new TrilhaStructure(stepResponses, ungrouped);
    }

    /**
     * Batch-loads course progress for all courses that have progress tracking
     * enabled.
     * Makes 2 queries total instead of 2*N queries.
     */
    private Map<UUID, ProgressResponse> buildCourseProgressBatch(List<Course> courses, User viewer) {
        if (courses.isEmpty() || viewer == null) {
            return Map.of();
        }

        List<Course> trackableCourses = courses.stream()
                .filter(Course::isProgressEnabled)
                .toList();

        if (trackableCourses.isEmpty()) {
            return Map.of();
        }

        List<UUID> courseIds = trackableCourses.stream().map(Course::getId).toList();

        // Batch: Load lesson counts for all courses
        Map<UUID, Long> lessonCounts = new HashMap<>();
        for (UUID courseId : courseIds) {
            lessonCounts.put(courseId, lessonRepository.countByCourseId(courseId));
        }

        // Batch: Load completions for all courses at once (viewer's completed lessons
        // across all courses)
        Map<UUID, List<UUID>> completionsByCourse = new HashMap<>();
        for (UUID courseId : courseIds) {
            List<UUID> completed = lessonCompletionRepository.findCompletedLessonIds(viewer.getId(), courseId);
            completionsByCourse.put(courseId, completed);
        }

        // Build progress map
        Map<UUID, ProgressResponse> result = new HashMap<>();
        for (Course course : trackableCourses) {
            List<UUID> completed = completionsByCourse.getOrDefault(course.getId(), List.of());
            long total = lessonCounts.getOrDefault(course.getId(), 0L);
            int percentage = total == 0 ? 0 : (int) Math.round(completed.size() * 100.0 / total);
            result.put(course.getId(), new ProgressResponse(completed.size(), total, percentage, completed));
        }

        return result;
    }

    /**
     * Builds a TrilhaItemResponse using pre-loaded batched data instead of fetching
     * per-item.
     */
    private TrilhaItemResponse toItemResponse(TrilhaItem item,
            Map<UUID, CourseSummary> courseSummaries,
            Map<UUID, PostSummary> postSummaries,
            Map<UUID, ProgressResponse> courseProgresses,
            Set<UUID> completedItems) {
        Course course = item.getCourse();
        CourseSummary courseSummary = course == null ? null : courseSummaries.get(course.getId());
        PostSummary postSummary = item.getPost() == null ? null : postSummaries.get(item.getPost().getId());
        ProgressResponse courseProgress = course == null ? null : courseProgresses.get(course.getId());

        return new TrilhaItemResponse(
                item.getId(),
                item.getStep() == null ? null : item.getStep().getId(),
                item.getOrderIndex(),
                courseSummary,
                postSummary,
                item.getNote(),
                completedItems.contains(item.getId()),
                courseProgress,
                item.getCreatedAt());
    }

    /** Legacy method - used by toItemResponses, kept for backwards compatibility */
    private TrilhaItemResponse toItemResponseLegacy(TrilhaItem item, User viewer, Set<UUID> completed) {
        Course course = item.getCourse();
        ProgressResponse courseProgress = null;
        if (course != null && course.isProgressEnabled() && viewer != null) {
            List<UUID> completedLessons = lessonCompletionRepository.findCompletedLessonIds(viewer.getId(),
                    course.getId());
            long total = lessonRepository.countByCourseId(course.getId());
            int percentage = total == 0 ? 0 : (int) Math.round(completedLessons.size() * 100.0 / total);
            courseProgress = new ProgressResponse(completedLessons.size(), total, percentage, completedLessons);
        }

        return new TrilhaItemResponse(
                item.getId(),
                item.getStep() == null ? null : item.getStep().getId(),
                item.getOrderIndex(),
                course == null ? null : courseMapper.toSummary(course, viewer),
                item.getPost() == null ? null : postMapper.toSummary(item.getPost(), viewer),
                item.getNote(),
                completed.contains(item.getId()),
                courseProgress,
                item.getCreatedAt());
    }
}
