package com.coursemaker.service;

import com.coursemaker.domain.entity.CompositeIds.UserCourseId;
import com.coursemaker.domain.entity.Course;
import com.coursemaker.domain.entity.PrivateCourseAccess;
import com.coursemaker.domain.entity.PrivateCourseVerified;
import com.coursemaker.domain.entity.User;
import com.coursemaker.dto.enrollment.EnrollmentDtos.PrivateAccessResponse;
import com.coursemaker.exception.ApiExceptions.BadRequestException;
import com.coursemaker.exception.ApiExceptions.UnauthorizedException;
import com.coursemaker.repository.CourseRepository;
import com.coursemaker.repository.PrivateCourseAccessRepository;
import com.coursemaker.repository.PrivateCourseVerifiedRepository;
import com.coursemaker.exception.ApiExceptions.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.UUID;

/**
 * The password gate on private courses.
 *
 * <p>Two tables back it, and the distinction matters:
 * <ul>
 *   <li>{@code private_course_access} - access is active <em>right now</em>.</li>
 *   <li>{@code private_course_verified} - this user has proven once that they know the password, so
 *       returning to the course silently re-grants access instead of prompting again.</li>
 * </ul>
 * Revoking deletes both, which is what makes a revoke actually stick: leaving the "verified" row
 * behind would let the next page load hand the access straight back.
 */
@Service
@RequiredArgsConstructor
public class PrivateCourseAccessService {

    private final CourseRepository courseRepository;
    private final PrivateCourseAccessRepository accessRepository;
    private final PrivateCourseVerifiedRepository verifiedRepository;
    private final PasswordHasher passwordHasher;
    private final RateLimitService rateLimitService;
    private final CourseAccessService courseAccessService;
    private final PlatformTransactionManager transactionManager;

    /**
     * Re-grants access to a returning student who has verified the password before. Called on the
     * course-detail read path, which is why that path is not read-only.
     */
    @Transactional
    public void restoreIfPreviouslyVerified(Course course, User viewer) {
        if (viewer == null || !course.isPrivate() || courseAccessService.isOwner(course, viewer)) {
            return;
        }
        UserCourseId key = new UserCourseId(viewer.getId(), course.getId());
        if (accessRepository.existsById(key)) {
            return;
        }
        if (verifiedRepository.existsById(key)) {
            accessRepository.save(PrivateCourseAccess.of(viewer.getId(), course.getId()));
        }
    }

    /**
     * Deliberately NOT one big transaction. The rate limiter commits in its own transaction
     * (REQUIRES_NEW); doing that while this method already held a connection would need a second one
     * per request and, under a burst, deadlock the whole pool. So the DB work runs in short
     * transactions of its own and nothing is held open while the limiter or the hash check runs.
     */
    public PrivateAccessResponse validatePassword(UUID courseId, String password, User user) {
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        String passwordHash = tx.execute(status -> {
            Course course = courseRepository.findByIdWithOwner(courseId)
                    .orElseThrow(() -> ResourceNotFoundException.of("Curso"));
            courseAccessService.requireVisible(course, user);

            if (!course.isPrivate()) {
                throw new BadRequestException("Este curso nao e privado");
            }
            if (course.getPasswordHash() == null) {
                throw new BadRequestException("Este curso ainda nao tem uma senha definida");
            }
            return course.getPasswordHash();
        });

        String rateLimitKey = RateLimitService.privateCourseKey(courseId, user.getId());
        rateLimitService.assertNotBlocked(rateLimitKey);
        // Counted before the check, atomically, so a parallel burst of guesses cannot outrun the limit.
        rateLimitService.consume(rateLimitKey);

        if (!passwordHasher.matches(password, passwordHash)) {
            throw new UnauthorizedException("Senha incorreta. Tentativas restantes: "
                    + rateLimitService.remainingAttempts(rateLimitKey));
        }

        rateLimitService.recordSuccess(rateLimitKey);
        tx.executeWithoutResult(status -> grant(user.getId(), courseId));
        return new PrivateAccessResponse(true, rateLimitService.getMaxAttempts());
    }

    @Transactional
    public void grant(UUID userId, UUID courseId) {
        UserCourseId key = new UserCourseId(userId, courseId);
        if (!accessRepository.existsById(key)) {
            accessRepository.save(PrivateCourseAccess.of(userId, courseId));
        }
        if (!verifiedRepository.existsById(key)) {
            verifiedRepository.save(PrivateCourseVerified.of(userId, courseId));
        }
    }

    /** Owner-only. Drops both rows so the student has to type the password again. */
    @Transactional
    public void revoke(UUID courseId, UUID targetUserId, User owner) {
        Course course = courseRepository.findByIdWithOwner(courseId)
                .orElseThrow(() -> ResourceNotFoundException.of("Curso"));
        courseAccessService.requireOwner(course, owner);

        UserCourseId key = new UserCourseId(targetUserId, courseId);
        accessRepository.deleteById(key);
        verifiedRepository.deleteById(key);
    }
}
