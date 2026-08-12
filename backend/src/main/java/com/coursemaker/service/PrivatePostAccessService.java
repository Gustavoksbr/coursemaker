package com.coursemaker.service;

import com.coursemaker.domain.entity.CompositeIds.UserPostId;
import com.coursemaker.domain.entity.Post;
import com.coursemaker.domain.entity.PrivatePostAccess;
import com.coursemaker.domain.entity.PrivatePostVerified;
import com.coursemaker.domain.entity.User;
import com.coursemaker.dto.post.PostDtos.PrivateAccessResponse;
import com.coursemaker.exception.ApiExceptions.BadRequestException;
import com.coursemaker.exception.ApiExceptions.ResourceNotFoundException;
import com.coursemaker.exception.ApiExceptions.UnauthorizedException;
import com.coursemaker.repository.PostRepository;
import com.coursemaker.repository.PrivatePostAccessRepository;
import com.coursemaker.repository.PrivatePostVerifiedRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * The password gate on private posts. Mirrors {@link PrivateCourseAccessService}.
 *
 * <p>Two tables back it, and the distinction matters:
 * <ul>
 *   <li>{@code private_post_access} - access is active <em>right now</em>.</li>
 *   <li>{@code private_post_verified} - this user has proven once that they know the password, so
 *       returning to the post silently re-grants access instead of prompting again.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class PrivatePostAccessService {

    private final PostRepository postRepository;
    private final PrivatePostAccessRepository accessRepository;
    private final PrivatePostVerifiedRepository verifiedRepository;
    private final PasswordHasher passwordHasher;
    private final RateLimitService rateLimitService;
    private final PostAccessService postAccessService;

    /**
     * Re-grants access to a returning reader who has verified the password before. Called on the
     * post-detail read path, which is why that path is not read-only.
     */
    @Transactional
    public void restoreIfPreviouslyVerified(Post post, User viewer) {
        if (viewer == null || !post.isPrivate() || postAccessService.isOwner(post, viewer)) {
            return;
        }
        UserPostId key = new UserPostId(viewer.getId(), post.getId());
        if (accessRepository.existsById(key)) {
            return;
        }
        if (verifiedRepository.existsById(key)) {
            accessRepository.save(PrivatePostAccess.of(viewer.getId(), post.getId()));
        }
    }

    @Transactional
    public PrivateAccessResponse validatePassword(UUID postId, String password, User user) {
        Post post = postRepository.findByIdWithOwner(postId)
                .orElseThrow(() -> ResourceNotFoundException.of("Post"));
        postAccessService.requireVisible(post, user);

        if (!post.isPrivate()) {
            throw new BadRequestException("Este post nao e privado");
        }
        if (post.getPasswordHash() == null) {
            throw new BadRequestException("Este post ainda nao tem uma senha definida");
        }

        String rateLimitKey = RateLimitService.privatePostKey(postId, user.getId());
        rateLimitService.assertNotBlocked(rateLimitKey);

        if (!passwordHasher.matches(password, post.getPasswordHash())) {
            rateLimitService.recordFailure(rateLimitKey);
            throw new UnauthorizedException("Senha incorreta. Tentativas restantes: "
                    + rateLimitService.remainingAttempts(rateLimitKey));
        }

        rateLimitService.recordSuccess(rateLimitKey);
        grant(user.getId(), postId);
        return new PrivateAccessResponse(true, rateLimitService.getMaxAttempts());
    }

    @Transactional
    public void grant(UUID userId, UUID postId) {
        UserPostId key = new UserPostId(userId, postId);
        if (!accessRepository.existsById(key)) {
            accessRepository.save(PrivatePostAccess.of(userId, postId));
        }
        if (!verifiedRepository.existsById(key)) {
            verifiedRepository.save(PrivatePostVerified.of(userId, postId));
        }
    }
}
