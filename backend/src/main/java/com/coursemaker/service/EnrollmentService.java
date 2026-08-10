package com.coursemaker.service;

import com.coursemaker.domain.entity.CompositeIds.UserCourseId;
import com.coursemaker.domain.entity.Course;
import com.coursemaker.domain.entity.Enrollment;
import com.coursemaker.domain.entity.User;
import com.coursemaker.dto.course.CourseDtos.CourseSummary;
import com.coursemaker.dto.course.CourseDtos.StudentResponse;
import com.coursemaker.dto.enrollment.EnrollmentDtos.EnrollmentStatusResponse;
import com.coursemaker.dto.user.UserSummary;
import com.coursemaker.exception.ApiExceptions.ForbiddenException;
import com.coursemaker.repository.CourseRepository;
import com.coursemaker.repository.EnrollmentRepository;
import com.coursemaker.repository.LessonCompletionRepository;
import com.coursemaker.repository.LessonRepository;
import com.coursemaker.repository.PrivateCourseAccessRepository;
import com.coursemaker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EnrollmentService {

    private final EnrollmentRepository enrollmentRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final PrivateCourseAccessRepository privateAccessRepository;
    private final PrivateCourseAccessService privateAccessService;
    private final CourseAccessService accessService;
    private final CourseService courseService;
    private final CourseMapper courseMapper;
    private final LessonRepository lessonRepository;
    private final LessonCompletionRepository lessonCompletionRepository;

    @Transactional
    public EnrollmentStatusResponse enroll(UUID courseId, String password, User user) {
        Course course = courseService.loadVisible(courseId, user);

        if (!course.isPublished()) {
            throw new ForbiddenException("Este curso ainda e um rascunho");
        }
        if (accessService.isOwner(course, user)) {
            throw new ForbiddenException("Voce ja e o dono deste curso");
        }

        // A private course needs the password unlocked first; sending it inline lets the frontend
        // do "type password -> enroll" in a single step.
        if (course.isPrivate()) {
            privateAccessService.restoreIfPreviouslyVerified(course, user);
            if (!accessService.canViewContent(course, user)) {
                if (password == null || password.isBlank()) {
                    throw new ForbiddenException("Informe a senha do curso para se matricular");
                }
                privateAccessService.validatePassword(courseId, password, user);
            }
        }

        UserCourseId key = new UserCourseId(user.getId(), courseId);
        if (!enrollmentRepository.existsById(key)) {
            enrollmentRepository.save(Enrollment.of(user.getId(), courseId));
        }
        return status(courseId, user);
    }

    @Transactional
    public EnrollmentStatusResponse unenroll(UUID courseId, User user) {
        enrollmentRepository.deleteById(new UserCourseId(user.getId(), courseId));
        return status(courseId, user);
    }

    @Transactional(readOnly = true)
    public EnrollmentStatusResponse status(UUID courseId, User user) {
        return new EnrollmentStatusResponse(
                courseId,
                enrollmentRepository.existsById(new UserCourseId(user.getId(), courseId)),
                enrollmentRepository.countByCourseId(courseId));
    }

    @Transactional(readOnly = true)
    public List<CourseSummary> myEnrollments(User user) {
        List<UUID> courseIds = enrollmentRepository.findAllCourseIdsByUser(user.getId());
        if (courseIds.isEmpty()) {
            return List.of();
        }
        List<Course> courses = courseIds.stream()
                .map(courseRepository::findByIdWithOwner)
                .flatMap(java.util.Optional::stream)
                .filter(course -> accessService.canView(course, user))
                .toList();
        return courseMapper.toSummaries(courses, user);
    }

    /** The single most recently opened enrolled course, for the library's "continuar assistindo". */
    @Transactional(readOnly = true)
    public CourseSummary lastAccessedCourse(User user) {
        return enrollmentRepository.findMostRecentlyAccessed(user.getId(), PageRequest.of(0, 1)).stream()
                .findFirst()
                .flatMap(enrollment -> courseRepository.findByIdWithOwner(enrollment.getId().getCourseId()))
                .filter(course -> accessService.canView(course, user))
                .map(course -> courseMapper.toSummary(course, user))
                .orElse(null);
    }

    /**
     * Enrolled courses the user has not finished: no progress tracking means there is no signal to
     * prove it is done, so those always count as "em andamento" too.
     */
    @Transactional(readOnly = true)
    public List<CourseSummary> myInProgressCourses(User user) {
        List<UUID> courseIds = enrollmentRepository.findAllCourseIdsByUser(user.getId());
        if (courseIds.isEmpty()) {
            return List.of();
        }
        List<Course> inProgress = courseIds.stream()
                .map(courseRepository::findByIdWithOwner)
                .flatMap(Optional::stream)
                .filter(course -> accessService.canView(course, user))
                .filter(course -> !isFinished(course, user))
                .toList();
        return courseMapper.toSummaries(inProgress, user);
    }

    /** Enrolled courses the user has finished, for the library's "concluidos". */
    @Transactional(readOnly = true)
    public List<CourseSummary> myCompletedCourses(User user) {
        List<UUID> courseIds = enrollmentRepository.findAllCourseIdsByUser(user.getId());
        if (courseIds.isEmpty()) {
            return List.of();
        }
        List<Course> completed = courseIds.stream()
                .map(courseRepository::findByIdWithOwner)
                .flatMap(Optional::stream)
                .filter(course -> accessService.canView(course, user))
                .filter(course -> isFinished(course, user))
                .toList();
        return courseMapper.toSummaries(completed, user);
    }

    private boolean isFinished(Course course, User user) {
        if (!course.isProgressEnabled()) {
            return false;
        }
        long total = lessonRepository.countByCourseId(course.getId());
        if (total == 0) {
            return false;
        }
        long completed = lessonCompletionRepository.findCompletedLessonIds(user.getId(), course.getId()).size();
        return completed >= total;
    }

    @Transactional(readOnly = true)
    public List<StudentResponse> listStudents(UUID courseId, User owner) {
        Course course = courseService.loadForEditing(courseId, owner);

        List<Enrollment> enrollments = enrollmentRepository.findByCourseId(course.getId());
        if (enrollments.isEmpty()) {
            return List.of();
        }
        Map<UUID, Instant> enrolledAt = enrollments.stream().collect(
                Collectors.toMap(e -> e.getId().getUserId(), Enrollment::getCreatedAt, (a, b) -> a));
        Set<UUID> withPrivateAccess = new HashSet<>(privateAccessRepository.findUserIdsWithAccess(courseId));

        return userRepository.findAllById(enrolledAt.keySet()).stream()
                .map(student -> new StudentResponse(
                        UserSummary.from(student),
                        enrolledAt.get(student.getId()),
                        withPrivateAccess.contains(student.getId())))
                .sorted(java.util.Comparator.comparing(StudentResponse::enrolledAt))
                .toList();
    }
}
