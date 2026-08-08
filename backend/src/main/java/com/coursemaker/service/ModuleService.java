package com.coursemaker.service;

import com.coursemaker.domain.entity.Course;
import com.coursemaker.domain.entity.Lesson;
import com.coursemaker.domain.entity.Module;
import com.coursemaker.domain.entity.User;
import com.coursemaker.dto.curriculum.CurriculumDtos.CreateModuleRequest;
import com.coursemaker.dto.curriculum.CurriculumDtos.LessonResponse;
import com.coursemaker.dto.curriculum.CurriculumDtos.ModuleResponse;
import com.coursemaker.dto.curriculum.CurriculumDtos.UpdateModuleRequest;
import com.coursemaker.exception.ApiExceptions.BadRequestException;
import com.coursemaker.exception.ApiExceptions.ResourceNotFoundException;
import com.coursemaker.repository.LessonRepository;
import com.coursemaker.repository.ModuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ModuleService {

    private final ModuleRepository moduleRepository;
    private final LessonRepository lessonRepository;
    private final CourseService courseService;
    private final CourseAccessService accessService;

    @Transactional(readOnly = true)
    public List<ModuleResponse> list(UUID courseId, User viewer) {
        Course course = courseService.loadVisible(courseId, viewer);
        accessService.requireContentAccess(course, viewer);

        List<Module> modules = moduleRepository.findByCourseOrdered(courseId);
        Map<UUID, List<Lesson>> lessonsByModule = lessonRepository.findAllByCourseId(courseId).stream()
                .collect(Collectors.groupingBy(lesson -> lesson.getModule().getId()));

        return modules.stream()
                .map(module -> ModuleResponse.of(module,
                        lessonsByModule.getOrDefault(module.getId(), List.of()).stream()
                                .map(lesson -> LessonResponse.of(lesson, false))
                                .toList()))
                .toList();
    }

    @Transactional
    public ModuleResponse create(UUID courseId, CreateModuleRequest request, User viewer) {
        Course course = courseService.loadForEditing(courseId, viewer);

        Module module = Module.builder()
                .course(course)
                .title(request.title().trim())
                .description(request.description())
                .orderIndex(moduleRepository.findMaxOrder(courseId) + 1)
                .build();

        return ModuleResponse.of(moduleRepository.save(module), List.of());
    }

    @Transactional
    public ModuleResponse update(UUID moduleId, UpdateModuleRequest request, User viewer) {
        Module module = loadForEditing(moduleId, viewer);
        if (request.title() != null) {
            module.setTitle(request.title().trim());
        }
        if (request.description() != null) {
            module.setDescription(request.description());
        }
        return ModuleResponse.of(moduleRepository.save(module), lessonsOf(module));
    }

    @Transactional
    public void delete(UUID moduleId, User viewer) {
        moduleRepository.delete(loadForEditing(moduleId, viewer));
    }

    @Transactional
    public List<ModuleResponse> reorder(UUID courseId, List<UUID> orderedIds, User viewer) {
        courseService.loadForEditing(courseId, viewer);

        List<Module> modules = moduleRepository.findByCourseOrdered(courseId);
        Map<UUID, Module> byId = modules.stream().collect(Collectors.toMap(Module::getId, module -> module));

        if (orderedIds.size() != modules.size() || !byId.keySet().containsAll(orderedIds)) {
            throw new BadRequestException("A lista de reordenacao deve conter exatamente os modulos do curso");
        }

        for (int index = 0; index < orderedIds.size(); index++) {
            byId.get(orderedIds.get(index)).setOrderIndex(index);
        }
        moduleRepository.saveAll(byId.values());

        return moduleRepository.findByCourseOrdered(courseId).stream()
                .map(module -> ModuleResponse.of(module, lessonsOf(module)))
                .toList();
    }

    private List<LessonResponse> lessonsOf(Module module) {
        return lessonRepository.findByModuleOrdered(module.getId()).stream()
                .map(lesson -> LessonResponse.of(lesson, false))
                .toList();
    }

    private Module loadForEditing(UUID moduleId, User viewer) {
        Module module = moduleRepository.findByIdWithCourse(moduleId)
                .orElseThrow(() -> ResourceNotFoundException.of("Modulo"));
        accessService.requireOwner(module.getCourse(), viewer);
        return module;
    }
}
