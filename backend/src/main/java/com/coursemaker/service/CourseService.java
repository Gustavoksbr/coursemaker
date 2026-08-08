package com.coursemaker.service;

import com.coursemaker.domain.entity.Course;
import com.coursemaker.domain.entity.Lesson;
import com.coursemaker.domain.entity.Module;
import com.coursemaker.domain.entity.User;
import com.coursemaker.domain.enums.CourseStatus;
import com.coursemaker.domain.enums.CourseVisibility;
import com.coursemaker.dto.PageResponse;
import com.coursemaker.dto.course.CourseDtos.CourseDetail;
import com.coursemaker.dto.course.CourseDtos.CourseSummary;
import com.coursemaker.dto.course.CourseDtos.CreateCourseRequest;
import com.coursemaker.dto.course.CourseDtos.ProgressResponse;
import com.coursemaker.dto.course.CourseDtos.SlugAvailability;
import com.coursemaker.dto.course.CourseDtos.UpdateCourseRequest;
import com.coursemaker.dto.curriculum.CurriculumDtos.LessonResponse;
import com.coursemaker.dto.curriculum.CurriculumDtos.ModuleResponse;
import com.coursemaker.exception.ApiExceptions.BadRequestException;
import com.coursemaker.exception.ApiExceptions.ForbiddenException;
import com.coursemaker.exception.ApiExceptions.ResourceNotFoundException;
import com.coursemaker.repository.CourseRepository;
import com.coursemaker.repository.LessonCompletionRepository;
import com.coursemaker.repository.LessonRepository;
import com.coursemaker.repository.ModuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CourseService {

    private static final int MAX_PAGE_SIZE = 50;

    /** Separator used to pack the category filter into one bind parameter; see CourseRepository. */
    static final String CATEGORY_DELIMITER = String.valueOf((char) 1);

    private final CourseRepository courseRepository;
    private final ModuleRepository moduleRepository;
    private final LessonRepository lessonRepository;
    private final LessonCompletionRepository lessonCompletionRepository;
    private final CourseAccessService accessService;
    private final CourseMapper courseMapper;
    private final SlugGeneratorService slugGenerator;
    private final PasswordHasher passwordHasher;
    private final PrivateCourseAccessService privateAccessService;

    // ------------------------------------------------------------------ reads

    @Transactional(readOnly = true)
    public PageResponse<CourseSummary> search(String q, String author, CourseVisibility visibility,
                                              List<String> categories, Boolean featuredOnly, String sort,
                                              int page, int size, User viewer) {
        Page<Course> result = courseRepository.search(
                blankToNull(q),
                blankToNull(author),
                visibility == null ? null : visibility.getValue(),
                joinCategories(categories),
                featuredOnly,
                sort == null ? "recent" : sort,
                viewer == null ? null : viewer.getId(),
                PageRequest.of(Math.max(0, page), Math.clamp(size, 1, MAX_PAGE_SIZE)));

        return PageResponse.of(result, courseMapper.toSummaries(result.getContent(), viewer));
    }

    // Not read-only: opening a private course silently restores access for a student who has
    // already proven they know the password (see PrivateCourseAccessService).
    @Transactional
    public CourseDetail getById(UUID id, User viewer) {
        Course course = loadVisible(id, viewer);
        privateAccessService.restoreIfPreviouslyVerified(course, viewer);
        return toDetail(course, viewer);
    }

    @Transactional
    public CourseDetail getByNicknameAndSlug(String nickname, String slug, User viewer) {
        Course course = courseRepository.findByOwnerNicknameAndSlug(nickname, slug)
                .orElseThrow(() -> ResourceNotFoundException.of("Curso"));
        accessService.requireVisible(course, viewer);
        privateAccessService.restoreIfPreviouslyVerified(course, viewer);
        return toDetail(course, viewer);
    }

    @Transactional(readOnly = true)
    public List<CourseSummary> listByOwner(UUID ownerId, User viewer) {
        List<Course> courses = courseRepository.findAllByOwnerId(ownerId).stream()
                .filter(course -> accessService.canView(course, viewer))
                .toList();
        return courseMapper.toSummaries(courses, viewer);
    }

    @Transactional(readOnly = true)
    public SlugAvailability checkSlug(String desired, User owner) {
        String slug = slugGenerator.slugify(desired);
        boolean available = !courseRepository.existsByOwnerIdAndSlug(owner.getId(), slug);
        String suggestion = available ? slug
                : slugGenerator.uniqueSlug(slug, courseRepository.findSlugsStartingWith(owner.getId(), slug));
        return new SlugAvailability(slug, available, suggestion);
    }

    // ----------------------------------------------------------------- writes

    @Transactional
    public CourseSummary create(CreateCourseRequest request, User owner) {
        requireNickname(owner);

        String desired = (request.slug() == null || request.slug().isBlank()) ? request.name() : request.slug();
        String slug = slugGenerator.uniqueSlug(desired,
                courseRepository.findSlugsStartingWith(owner.getId(), slugGenerator.slugify(desired)));

        CourseVisibility visibility = request.visibility() == null ? CourseVisibility.PUBLIC : request.visibility();
        String passwordHash = null;
        if (visibility == CourseVisibility.PRIVATE) {
            passwordHash = passwordHasher.hashRequired(request.password(),
                    "Cursos privados exigem uma senha de acesso");
        }

        Course course = Course.builder()
                .owner(owner)
                .name(request.name().trim())
                .slug(slug)
                .description(request.description())
                .landingDescription(request.landingDescription())
                .thumbnailUrl(request.thumbnailUrl())
                .visibility(visibility)
                .status(CourseStatus.UNAVAILABLE)
                .passwordHash(passwordHash)
                .categories(normalizeCategories(request.categories()))
                .progressEnabled(Boolean.TRUE.equals(request.progressEnabled()))
                .build();

        return courseMapper.toSummary(courseRepository.save(course), owner);
    }

    @Transactional
    public CourseSummary update(UUID id, UpdateCourseRequest request, User viewer) {
        Course course = loadVisible(id, viewer);
        accessService.requireOwner(course, viewer);

        if (request.name() != null) {
            course.setName(request.name().trim());
        }
        if (request.description() != null) {
            course.setDescription(request.description());
        }
        if (request.landingDescription() != null) {
            course.setLandingDescription(request.landingDescription());
        }
        if (request.thumbnailUrl() != null) {
            course.setThumbnailUrl(request.thumbnailUrl());
        }
        if (request.categories() != null) {
            course.setCategories(normalizeCategories(request.categories()));
        }
        if (request.progressEnabled() != null) {
            course.setProgressEnabled(request.progressEnabled());
        }
        if (request.status() != null) {
            course.setStatus(request.status());
        }
        applyVisibility(course, request);

        return courseMapper.toSummary(courseRepository.save(course), viewer);
    }

    @Transactional
    public void delete(UUID id, User viewer) {
        Course course = loadVisible(id, viewer);
        accessService.requireOwner(course, viewer);
        // Modules, lessons, blocks, enrollments, likes and comments all go with it via
        // ON DELETE CASCADE in the schema.
        courseRepository.delete(course);
    }

    @Transactional
    public CourseSummary toggleFeatured(UUID id, User admin) {
        if (!admin.isAdmin()) {
            throw new ForbiddenException("Apenas administradores podem destacar cursos");
        }
        Course course = courseRepository.findByIdWithOwner(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Curso"));
        course.setFeatured(!course.isFeatured());
        return courseMapper.toSummary(courseRepository.save(course), admin);
    }

    // ---------------------------------------------------------------- helpers

    @Transactional(readOnly = true)
    public Course loadVisible(UUID id, User viewer) {
        Course course = courseRepository.findByIdWithOwner(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Curso"));
        accessService.requireVisible(course, viewer);
        return course;
    }

    /**
     * Loads a course for editing. Kept separate from {@link #loadVisible} so callers cannot forget
     * the ownership check.
     */
    @Transactional(readOnly = true)
    public Course loadForEditing(UUID id, User viewer) {
        Course course = courseRepository.findByIdWithOwner(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Curso"));
        accessService.requireOwner(course, viewer);
        return course;
    }

    private CourseDetail toDetail(Course course, User viewer) {
        boolean owner = accessService.isOwner(course, viewer);
        boolean canViewContent = accessService.canViewContent(course, viewer);

        List<ModuleResponse> modules = canViewContent ? buildCurriculum(course, viewer) : List.of();

        ProgressResponse progress = null;
        if (course.isProgressEnabled() && viewer != null && canViewContent) {
            List<UUID> completed = lessonCompletionRepository.findCompletedLessonIds(viewer.getId(), course.getId());
            long total = lessonRepository.countByCourseId(course.getId());
            int percentage = total == 0 ? 0 : (int) Math.round(completed.size() * 100.0 / total);
            progress = new ProgressResponse(completed.size(), total, percentage, completed);
        }

        return new CourseDetail(
                courseMapper.toSummary(course, viewer),
                course.getLandingDescription(),
                modules,
                owner,
                canViewContent,
                course.isPrivate() && !canViewContent,
                course.getPasswordHash() != null,
                progress);
    }

    private List<ModuleResponse> buildCurriculum(Course course, User viewer) {
        List<Module> modules = moduleRepository.findByCourseOrdered(course.getId());
        if (modules.isEmpty()) {
            return List.of();
        }

        Map<UUID, List<Lesson>> lessonsByModule = lessonRepository.findAllByCourseId(course.getId()).stream()
                .collect(Collectors.groupingBy(lesson -> lesson.getModule().getId()));

        Set<UUID> completed = (course.isProgressEnabled() && viewer != null)
                ? new HashSet<>(lessonCompletionRepository.findCompletedLessonIds(viewer.getId(), course.getId()))
                : Set.of();

        List<ModuleResponse> result = new ArrayList<>(modules.size());
        for (Module module : modules) {
            List<LessonResponse> lessons = lessonsByModule.getOrDefault(module.getId(), List.of()).stream()
                    .map(lesson -> LessonResponse.of(lesson, completed.contains(lesson.getId())))
                    .toList();
            result.add(ModuleResponse.of(module, lessons));
        }
        return result;
    }

    private void applyVisibility(Course course, UpdateCourseRequest request) {
        boolean becomingPrivate = request.visibility() == CourseVisibility.PRIVATE;
        boolean becomingPublic = request.visibility() == CourseVisibility.PUBLIC;

        if (becomingPublic) {
            course.setVisibility(CourseVisibility.PUBLIC);
            course.setPasswordHash(null);
            return;
        }

        if (becomingPrivate) {
            course.setVisibility(CourseVisibility.PRIVATE);
            if (request.password() != null && !request.password().isBlank()) {
                course.setPasswordHash(passwordHasher.hash(request.password()));
            } else if (course.getPasswordHash() == null) {
                throw new BadRequestException("Cursos privados exigem uma senha de acesso");
            }
            return;
        }

        // Visibility untouched: still allow rotating the password of an already-private course.
        if (request.password() != null && !request.password().isBlank() && course.isPrivate()) {
            course.setPasswordHash(passwordHasher.hash(request.password()));
        }
    }

    private void requireNickname(User owner) {
        if (owner.getNickname() == null || owner.getNickname().isBlank()) {
            throw new BadRequestException("Defina seu nickname antes de criar conteudo");
        }
    }

    static List<String> normalizeCategories(List<String> categories) {
        if (categories == null) {
            return new ArrayList<>();
        }
        return categories.stream()
                .filter(category -> category != null && !category.isBlank())
                .map(String::trim)
                .distinct()
                .limit(20)
                .collect(Collectors.toCollection(ArrayList::new));
    }

    private static String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }

    /**
     * Packs the selected categories into the single delimited string the native query expects.
     * Returns null when nothing was selected, which disables the filter.
     */
    static String joinCategories(List<String> categories) {
        if (categories == null || categories.isEmpty()) {
            return null;
        }
        String joined = categories.stream()
                .filter(category -> category != null && !category.isBlank())
                .map(String::trim)
                .distinct()
                .collect(Collectors.joining(CATEGORY_DELIMITER));
        return joined.isEmpty() ? null : joined;
    }
}
