package com.coursemaker.service;

import com.coursemaker.domain.entity.CompositeIds.UserPostId;
import com.coursemaker.domain.entity.Post;
import com.coursemaker.domain.entity.User;
import com.coursemaker.exception.ApiExceptions.ForbiddenException;
import com.coursemaker.exception.ApiExceptions.ResourceNotFoundException;
import com.coursemaker.repository.PrivatePostAccessRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * One place for "who is allowed to see or change this post". Mirrors {@link CourseAccessService}.
 *
 * <p>The rules, in short:
 * <ul>
 *   <li>A draft ({@code unavailable}) is visible to its owner and to admins only.</li>
 *   <li>A private post's title/description/thumbnail are public; its <em>content</em> (the blocks)
 *       needs an unlocked {@code PrivatePostAccess} row (or being the owner).</li>
 *   <li>Only the owner may edit anything under the post.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class PostAccessService {

    private final PrivatePostAccessRepository privatePostAccessRepository;

    public boolean isOwner(Post post, User viewer) {
        return viewer != null && post.getOwner().getId().equals(viewer.getId());
    }

    /** Can this viewer see that the post exists (landing, cards, search results)? */
    public boolean canView(Post post, User viewer) {
        if (post.isPublished()) {
            return true;
        }
        return isOwner(post, viewer) || (viewer != null && viewer.isAdmin());
    }

    /** Can this viewer read the post's blocks? */
    @Transactional(readOnly = true)
    public boolean canViewContent(Post post, User viewer) {
        if (!canView(post, viewer)) {
            return false;
        }
        if (!post.isPrivate() || isOwner(post, viewer)) {
            return true;
        }
        if (viewer == null) {
            return false;
        }
        return privatePostAccessRepository.existsById(new UserPostId(viewer.getId(), post.getId()));
    }

    /**
     * 404 rather than 403 when the viewer cannot see the post at all: telling an outsider that a
     * draft exists is itself a leak.
     */
    public void requireVisible(Post post, User viewer) {
        if (!canView(post, viewer)) {
            throw ResourceNotFoundException.of("Post");
        }
    }

    public void requireOwner(Post post, User viewer) {
        requireVisible(post, viewer);
        if (!isOwner(post, viewer)) {
            throw new ForbiddenException("Apenas o dono do post pode fazer isso");
        }
    }
}
