package com.coursemaker.service;

import com.coursemaker.domain.entity.Course;
import com.coursemaker.domain.entity.Trilha;
import com.coursemaker.domain.entity.TrilhaItem;
import com.coursemaker.domain.entity.TrilhaStep;
import com.coursemaker.domain.entity.User;
import com.coursemaker.dto.course.CourseDtos.ProgressResponse;
import com.coursemaker.dto.trilha.TrilhaDtos.TrilhaItemResponse;
import com.coursemaker.dto.trilha.TrilhaDtos.TrilhaStepResponse;
import com.coursemaker.dto.trilha.TrilhaDtos.TrilhaStructure;
import com.coursemaker.dto.trilha.TrilhaDtos.TrilhaSummary;
import com.coursemaker.dto.user.UserSummary;
import com.coursemaker.repository.LessonCompletionRepository;
import com.coursemaker.repository.LessonRepository;
import com.coursemaker.repository.TrilhaEnrollmentRepository;
import com.coursemaker.repository.TrilhaItemCompletionRepository;
import com.coursemaker.repository.TrilhaItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
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

        return trilhas.stream().map(trilha -> toSummary(trilha, enrolled.contains(trilha.getId()))).toList();
    }

    @Transactional(readOnly = true)
    public TrilhaSummary toSummary(Trilha trilha, User viewer) {
        return toSummaries(List.of(trilha), viewer).get(0);
    }

    private TrilhaSummary toSummary(Trilha trilha, boolean enrolledByMe) {
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
                trilha.getCreatedAt(),
                trilha.getUpdatedAt());
    }

    /**
     * {@code manuallyCompleted} reflects {@code trilha_item_completions} only. For a course item
     * with progress tracking on, {@code courseProgress} is filled in alongside it -- the two
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

        return items.stream().map(item -> toItemResponse(item, viewer, completed)).toList();
    }

    /**
     * Groups every item of the trilha under its step, in display order, plus whatever sits
     * ungrouped directly under the trilha.
     */
    @Transactional(readOnly = true)
    public TrilhaStructure toStructure(List<TrilhaStep> steps, List<TrilhaItem> allItems, User viewer) {
        Set<UUID> completed = viewer == null || allItems.isEmpty() ? Set.of()
                : new HashSet<>(trilhaItemCompletionRepository.findCompletedItemIds(
                        viewer.getId(), allItems.get(0).getTrilha().getId()));

        Map<UUID, List<TrilhaItemResponse>> byStepId = allItems.stream()
                .filter(item -> item.getStep() != null)
                .collect(Collectors.groupingBy(
                        item -> item.getStep().getId(),
                        Collectors.mapping(item -> toItemResponse(item, viewer, completed), Collectors.toList())));

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
                .map(item -> toItemResponse(item, viewer, completed))
                .toList();

        return new TrilhaStructure(stepResponses, ungrouped);
    }

    private TrilhaItemResponse toItemResponse(TrilhaItem item, User viewer, Set<UUID> completed) {
        Course course = item.getCourse();
        ProgressResponse courseProgress = null;
        if (course != null && course.isProgressEnabled() && viewer != null) {
            List<UUID> completedLessons = lessonCompletionRepository.findCompletedLessonIds(viewer.getId(), course.getId());
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
