package com.coursemaker.service;

import com.coursemaker.domain.entity.CompositeIds.UserLessonId;
import com.coursemaker.domain.entity.Lesson;
import com.coursemaker.domain.entity.Module;
import com.coursemaker.domain.entity.User;
import com.coursemaker.dto.curriculum.CurriculumDtos.CreateLessonRequest;
import com.coursemaker.dto.curriculum.CurriculumDtos.LessonResponse;
import com.coursemaker.dto.curriculum.CurriculumDtos.UpdateLessonRequest;
import com.coursemaker.exception.ApiExceptions.BadRequestException;
import com.coursemaker.exception.ApiExceptions.ResourceNotFoundException;
import com.coursemaker.repository.LessonCompletionRepository;
import com.coursemaker.repository.LessonRepository;
import com.coursemaker.repository.ModuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LessonService {

    private final LessonRepository lessonRepository;
    private final ModuleRepository moduleRepository;
    private final LessonCompletionRepository lessonCompletionRepository;
    private final CourseAccessService accessService;

    @Transactional(readOnly = true)
    public List<LessonResponse> list(UUID moduleId, User viewer) {
        Module module = moduleRepository.findByIdWithCourse(moduleId)
                .orElseThrow(() -> ResourceNotFoundException.of("Modulo"));
        accessService.requireContentAccess(module.getCourse(), viewer);

        Set<UUID> completed = completedIds(module.getCourse().getId(), viewer);
        return lessonRepository.findByModuleOrdered(moduleId).stream()
                .map(lesson -> LessonResponse.of(lesson, completed.contains(lesson.getId())))
                .toList();
    }

    @Transactional
    public LessonResponse create(UUID moduleId, CreateLessonRequest request, User viewer) {
        Module module = moduleRepository.findByIdWithCourse(moduleId)
                .orElseThrow(() -> ResourceNotFoundException.of("Modulo"));
        accessService.requireOwner(module.getCourse(), viewer);

        Lesson lesson = Lesson.builder()
                .module(module)
                .title(request.title().trim())
                .orderIndex(lessonRepository.findMaxOrder(moduleId) + 1)
                .build();

        return LessonResponse.of(lessonRepository.save(lesson), false);
    }

    @Transactional
    public LessonResponse update(UUID lessonId, UpdateLessonRequest request, User viewer) {
        Lesson lesson = loadForEditing(lessonId, viewer);
        if (request.title() != null) {
            lesson.setTitle(request.title().trim());
        }
        return LessonResponse.of(lessonRepository.save(lesson), false);
    }

    @Transactional
    public void delete(UUID lessonId, User viewer) {
        lessonRepository.delete(loadForEditing(lessonId, viewer));
    }

    @Transactional
    public List<LessonResponse> reorder(UUID moduleId, List<UUID> orderedIds, User viewer) {
        Module module = moduleRepository.findByIdWithCourse(moduleId)
                .orElseThrow(() -> ResourceNotFoundException.of("Modulo"));
        accessService.requireOwner(module.getCourse(), viewer);

        List<Lesson> lessons = lessonRepository.findByModuleOrdered(moduleId);
        Map<UUID, Lesson> byId = lessons.stream().collect(Collectors.toMap(Lesson::getId, lesson -> lesson));

        if (orderedIds.size() != lessons.size() || !byId.keySet().containsAll(orderedIds)) {
            throw new BadRequestException("A lista de reordenacao deve conter exatamente as licoes do modulo");
        }

        for (int index = 0; index < orderedIds.size(); index++) {
            byId.get(orderedIds.get(index)).setOrderIndex(index);
        }
        lessonRepository.saveAll(byId.values());

        return lessonRepository.findByModuleOrdered(moduleId).stream()
                .map(lesson -> LessonResponse.of(lesson, false))
                .toList();
    }

    @Transactional(readOnly = true)
    public Lesson loadVisible(UUID lessonId, User viewer) {
        Lesson lesson = lessonRepository.findByIdWithCourse(lessonId)
                .orElseThrow(() -> ResourceNotFoundException.of("Licao"));
        accessService.requireContentAccess(lesson.getModule().getCourse(), viewer);
        return lesson;
    }

    @Transactional(readOnly = true)
    public Lesson loadForEditing(UUID lessonId, User viewer) {
        Lesson lesson = lessonRepository.findByIdWithCourse(lessonId)
                .orElseThrow(() -> ResourceNotFoundException.of("Licao"));
        accessService.requireOwner(lesson.getModule().getCourse(), viewer);
        return lesson;
    }

    private Set<UUID> completedIds(UUID courseId, User viewer) {
        if (viewer == null) {
            return Set.of();
        }
        return Set.copyOf(lessonCompletionRepository.findCompletedLessonIds(viewer.getId(), courseId));
    }

    /** Exposed for the progress endpoints, which need the composite key. */
    public static UserLessonId completionId(UUID userId, UUID lessonId) {
        return new UserLessonId(userId, lessonId);
    }
}
