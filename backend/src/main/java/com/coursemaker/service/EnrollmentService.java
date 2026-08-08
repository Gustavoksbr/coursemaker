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
import com.coursemaker.repository.PrivateCourseAccessRepository;
import com.coursemaker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
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
