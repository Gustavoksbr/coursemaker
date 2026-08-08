package com.coursemaker.service;

import com.coursemaker.domain.entity.CompositeIds.UserCourseId;
import com.coursemaker.domain.entity.Course;
import com.coursemaker.domain.entity.User;
import com.coursemaker.exception.ApiExceptions.ForbiddenException;
import com.coursemaker.exception.ApiExceptions.ResourceNotFoundException;
import com.coursemaker.repository.PrivateCourseAccessRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * One place for "who is allowed to see or change this course". Every other service asks these
 * questions instead of re-deriving the rules, so a change to the visibility model lands here only.
 *
 * <p>The rules, in short:
 * <ul>
 *   <li>A draft ({@code unavailable}) is visible to its owner and to admins only.</li>
 *   <li>A private course's <em>landing page</em> is public; its <em>content</em> needs an unlocked
 *       {@code PrivateCourseAccess} row (or being the owner).</li>
 *   <li>Only the owner may edit anything under the course.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class CourseAccessService {

    private final PrivateCourseAccessRepository privateCourseAccessRepository;

    public boolean isOwner(Course course, User viewer) {
        return viewer != null && course.getOwner().getId().equals(viewer.getId());
    }

    /** Can this viewer see that the course exists (landing page, cards, search results)? */
    public boolean canView(Course course, User viewer) {
        if (course.isPublished()) {
            return true;
        }
        return isOwner(course, viewer) || (viewer != null && viewer.isAdmin());
    }

    /** Can this viewer open the modules, lessons and blocks? */
    @Transactional(readOnly = true)
    public boolean canViewContent(Course course, User viewer) {
        if (!canView(course, viewer)) {
            return false;
        }
        if (!course.isPrivate() || isOwner(course, viewer)) {
            return true;
        }
        if (viewer == null) {
            return false;
        }
        return privateCourseAccessRepository.existsById(new UserCourseId(viewer.getId(), course.getId()));
    }

    /**
     * 404 rather than 403 when the viewer cannot see the course at all: telling an outsider that a
     * draft exists is itself a leak.
     */
    public void requireVisible(Course course, User viewer) {
        if (!canView(course, viewer)) {
            throw ResourceNotFoundException.of("Curso");
        }
    }

    @Transactional(readOnly = true)
    public void requireContentAccess(Course course, User viewer) {
        requireVisible(course, viewer);
        if (!canViewContent(course, viewer)) {
            throw new ForbiddenException("Este curso e privado. Informe a senha para acessar o conteudo.");
        }
    }

    public void requireOwner(Course course, User viewer) {
        requireVisible(course, viewer);
        if (!isOwner(course, viewer)) {
            throw new ForbiddenException("Apenas o dono do curso pode fazer isso");
        }
    }
}
