package com.coursemaker.service;

import com.coursemaker.domain.entity.Area;
import com.coursemaker.domain.entity.Course;
import com.coursemaker.domain.entity.Lesson;
import com.coursemaker.domain.entity.LessonBlock;
import com.coursemaker.domain.entity.Module;
import com.coursemaker.domain.entity.School;
import com.coursemaker.domain.entity.User;
import com.coursemaker.domain.enums.BlockType;
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
import com.coursemaker.repository.AreaRepository;
import com.coursemaker.repository.CourseRepository;
import com.coursemaker.repository.EnrollmentRepository;
import com.coursemaker.repository.LessonBlockRepository;
import com.coursemaker.repository.LessonCompletionRepository;
import com.coursemaker.repository.LessonRepository;
import com.coursemaker.repository.ModuleRepository;
import com.coursemaker.repository.QuestionAnswerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CourseService {

    private static final int MAX_PAGE_SIZE = 50;

    /**
     * Separator used to pack the category filter into one bind parameter; see
     * CourseRepository.
     */
    static final String CATEGORY_DELIMITER = String.valueOf((char) 1);

    private static final String DEFAULT_MODULE_TITLE = "Módulo 1";
    private static final String DEFAULT_LESSON_TITLE = "Aula 1";
    private static final String DEFAULT_BLOCK_CONTENT = "<p>Escreva aqui o conteúdo da sua aula.</p>";

    private final CourseRepository courseRepository;
    private final AreaRepository areaRepository;
    private final SchoolService schoolService;
    private final ModuleRepository moduleRepository;
    private final LessonRepository lessonRepository;
    private final LessonBlockRepository lessonBlockRepository;
    private final LessonCompletionRepository lessonCompletionRepository;
    private final QuestionAnswerRepository questionAnswerRepository;
    private final NotificationService notificationService;
    private final EnrollmentRepository enrollmentRepository;
    private final CourseAccessService accessService;
    private final CourseMapper courseMapper;
    private final SlugGeneratorService slugGenerator;
    private final PasswordHasher passwordHasher;
    private final PrivateCourseAccessService privateAccessService;
    private final HtmlSanitizer htmlSanitizer;

    // ------------------------------------------------------------------ reads

    @Transactional(readOnly = true)
    public PageResponse<CourseSummary> search(String q, String author, CourseVisibility visibility,
            List<String> categories, Boolean featuredOnly, List<UUID> areaIds, UUID schoolId, String sort,
            int page, int size, User viewer) {
        Page<Course> result = courseRepository.search(
                blankToNull(q),
                blankToNull(author),
                visibility == null ? null : visibility.getValue(),
                joinCategories(categories),
                featuredOnly,
                joinIds(areaIds),
                schoolId,
                sort == null ? "recent" : sort,
                viewer == null ? null : viewer.getId(),
                PageRequest.of(Math.max(0, page), Math.clamp(size, 1, MAX_PAGE_SIZE)));

        return PageResponse.of(result, courseMapper.toSummaries(result.getContent(), viewer));
    }

    // Not read-only: opening a private course silently restores access for a
    // student who has
    // already proven they know the password (see PrivateCourseAccessService).
    @Transactional
    public CourseDetail getById(UUID id, User viewer) {
        Course course = loadVisible(id, viewer);
        privateAccessService.restoreIfPreviouslyVerified(course, viewer);
        touchLastAccessed(course, viewer);
        return toDetail(course, viewer);
    }

    @Transactional
    public CourseDetail getByNicknameAndSlug(String nickname, String slug, User viewer) {
        Course course = courseRepository.findByOwnerNicknameAndSlug(nickname, slug)
                .orElseThrow(() -> ResourceNotFoundException.of("Curso"));
        accessService.requireVisible(course, viewer);
        privateAccessService.restoreIfPreviouslyVerified(course, viewer);
        touchLastAccessed(course, viewer);
        return toDetail(course, viewer);
    }

    /**
     * Records this as the student's most recently opened course, for "continuar
     * assistindo".
     */
    private void touchLastAccessed(Course course, User viewer) {
        if (viewer == null) {
            return;
        }
        enrollmentRepository.touchLastAccessed(viewer.getId(), course.getId(), Instant.now());
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

        Area area = areaRepository.findById(request.areaId())
                .orElseThrow(() -> ResourceNotFoundException.of("Area"));
        School school = schoolService.requireAllowedSchool(request.schoolId(), owner);

        Course course = Course.builder()
                .owner(owner)
                .area(area)
                .school(school)
                .name(request.name().trim())
                .slug(slug)
                .description(request.description())
                .landingDescription(request.landingDescription())
                .thumbnailUrl(request.thumbnailUrl())
                .visibility(visibility)
                .status(CourseStatus.UNAVAILABLE)
                .passwordHash(passwordHash)
                .categories(normalizeCategories(request.categories()))
                .build();

        Course saved = courseRepository.save(course);
        seedDefaultCurriculum(saved);
        return courseMapper.toSummary(saved, owner);
    }

    /**
     * New courses start with one module/lesson/text block so the owner has
     * something to edit.
     */
    private void seedDefaultCurriculum(Course course) {
        Module module = moduleRepository.save(Module.builder()
                .course(course)
                .title(DEFAULT_MODULE_TITLE)
                .orderIndex(0)
                .build());

        Lesson lesson = lessonRepository.save(Lesson.builder()
                .module(module)
                .title(DEFAULT_LESSON_TITLE)
                .orderIndex(0)
                .build());

        lessonBlockRepository.save(LessonBlock.builder()
                .lesson(lesson)
                .type(BlockType.TEXT)
                .content(htmlSanitizer.sanitize(BlockType.TEXT, DEFAULT_BLOCK_CONTENT))
                .orderIndex(0)
                .build());
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
        if (request.areaId() != null) {
            course.setArea(areaRepository.findById(request.areaId())
                    .orElseThrow(() -> ResourceNotFoundException.of("Area")));
        }
        if (request.removeSchool()) {
            course.setSchool(null);
        } else if (request.schoolId() != null) {
            course.setSchool(schoolService.requireAllowedSchool(request.schoolId(), viewer));
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

    /**
     * Admin curation of the home page's courses section: exactly these courses, in this order.
     * Anything previously featured but left out of {@code ids} is unfeatured.
     */
    @Transactional
    public List<CourseSummary> setHomePicks(List<UUID> ids, User admin) {
        if (!admin.isAdmin()) {
            throw new ForbiddenException("Apenas administradores podem curar a home");
        }
        Map<UUID, Course> touched = new LinkedHashMap<>();
        courseRepository.findAllByFeaturedTrue().forEach(c -> touched.put(c.getId(), c));
        courseRepository.findAllById(ids).forEach(c -> touched.put(c.getId(), c));
        for (Course course : touched.values()) {
            int index = ids.indexOf(course.getId());
            course.setFeatured(index >= 0);
            course.setHomeOrder(index >= 0 ? index : null);
        }
        courseRepository.saveAll(touched.values());
        return courseMapper.toSummaries(courseRepository.findAllByFeaturedTrueOrderByHomeOrderAsc(), admin);
    }

    /** The home page's currently curated courses. */
    @Transactional(readOnly = true)
    public List<CourseSummary> listHomePicks(User admin) {
        return courseMapper.toSummaries(courseRepository.findAllByFeaturedTrueOrderByHomeOrderAsc(), admin);
    }

    @Transactional
    public CourseSummary toggleBlock(UUID id, User admin) {
        if (!admin.isAdmin()) {
            throw new ForbiddenException("Apenas administradores podem bloquear cursos");
        }
        Course course = courseRepository.findByIdWithOwner(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Curso"));
        
        boolean wasBlocked = course.isBlockedByAdmin();
        course.setBlockedByAdmin(!wasBlocked);
        Course saved = courseRepository.save(course);
        
        // Notify owner
        if (!wasBlocked) {
            notificationService.notifyCourseBlocked(saved, admin);
        } else {
            notificationService.notifyCourseUnblocked(saved, admin);
        }
        
        return courseMapper.toSummary(saved, admin);
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
     * Loads a course for editing. Kept separate from {@link #loadVisible} so
     * callers cannot forget
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
        List<UUID> answeredQuestionBlockIds = List.of();
        if (viewer != null && canViewContent) {
            List<UUID> completed = lessonCompletionRepository.findCompletedLessonIds(viewer.getId(), course.getId());
            long total = lessonRepository.countByCourseId(course.getId());
            int percentage = total == 0 ? 0 : (int) Math.round(completed.size() * 100.0 / total);
            progress = new ProgressResponse(completed.size(), total, percentage, completed);
            answeredQuestionBlockIds =
                    questionAnswerRepository.findCorrectlyAnsweredBlockIdsForCourse(viewer.getId(), course.getId());
        }

        return new CourseDetail(
                courseMapper.toSummary(course, viewer),
                course.getLandingDescription(),
                modules,
                owner,
                canViewContent,
                course.isPrivate() && !canViewContent,
                course.getPasswordHash() != null,
                progress,
                answeredQuestionBlockIds);
    }

    private List<ModuleResponse> buildCurriculum(Course course, User viewer) {
        List<Module> modules = moduleRepository.findByCourseOrdered(course.getId());
        if (modules.isEmpty()) {
            return List.of();
        }

        List<Lesson> allLessons = lessonRepository.findAllByCourseId(course.getId());
        Map<UUID, List<Lesson>> lessonsByModule = allLessons.stream()
                .collect(Collectors.groupingBy(lesson -> lesson.getModule().getId()));

        // Load all blocks for all lessons in one query
        List<UUID> lessonIds = allLessons.stream().map(Lesson::getId).toList();
        Map<UUID, List<LessonBlock>> blocksByLesson = lessonIds.isEmpty()
                ? Map.of()
                : lessonBlockRepository.findAllByLessonIdIn(lessonIds).stream()
                        .collect(Collectors.groupingBy(block -> block.getLesson().getId()));

        Set<UUID> completed = viewer != null
                ? new HashSet<>(lessonCompletionRepository.findCompletedLessonIds(viewer.getId(), course.getId()))
                : Set.of();

        List<ModuleResponse> result = new ArrayList<>(modules.size());
        for (Module module : modules) {
            List<LessonResponse> lessons = lessonsByModule.getOrDefault(module.getId(), List.of()).stream()
                    .map(lesson -> {
                        List<com.coursemaker.dto.curriculum.CurriculumDtos.BlockResponse> blocks = blocksByLesson
                                .getOrDefault(lesson.getId(), List.of()).stream()
                                .map(com.coursemaker.dto.curriculum.CurriculumDtos.BlockResponse::of)
                                .toList();
                        return LessonResponse.of(lesson, completed.contains(lesson.getId()), blocks);
                    })
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

        // Visibility untouched: still allow rotating the password of an already-private
        // course.
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
     * Packs the selected categories into the single delimited string the native
     * query expects.
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

    /**
     * Same packing trick as {@link #joinCategories}, for the multi-select area filter: the native
     * query compares {@code area_id::text} against the unpacked array. Null disables the filter.
     */
    static String joinIds(List<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return null;
        }
        String joined = ids.stream()
                .filter(java.util.Objects::nonNull)
                .map(UUID::toString)
                .distinct()
                .collect(Collectors.joining(CATEGORY_DELIMITER));
        return joined.isEmpty() ? null : joined;
    }
}
