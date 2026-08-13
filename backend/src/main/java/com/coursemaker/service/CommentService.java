package com.coursemaker.service;

import com.coursemaker.domain.entity.Comment;
import com.coursemaker.domain.entity.CommentBan;
import com.coursemaker.domain.entity.CompositeIds.CourseUserId;
import com.coursemaker.domain.entity.Course;
import com.coursemaker.domain.entity.Post;
import com.coursemaker.domain.entity.Trilha;
import com.coursemaker.domain.entity.User;
import com.coursemaker.domain.enums.EntityKind;
import com.coursemaker.domain.enums.NotificationType;
import com.coursemaker.dto.comment.CommentDtos.CommentResponse;
import com.coursemaker.dto.comment.CommentDtos.CreateCommentRequest;
import com.coursemaker.dto.user.UserSummary;
import com.coursemaker.exception.ApiExceptions.BadRequestException;
import com.coursemaker.exception.ApiExceptions.ForbiddenException;
import com.coursemaker.exception.ApiExceptions.ResourceNotFoundException;
import com.coursemaker.repository.CommentBanRepository;
import com.coursemaker.repository.CommentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Comments on a course, post or trilha - one level of threading deep (a reply cannot itself be
 * replied to). Owner-banning a commenter ({@link #ban}/{@link #unban}) stays course-only: there is
 * no {@code comment_bans} equivalent for posts/trilhas.
 */
@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final CommentBanRepository banRepository;
    private final CourseService courseService;
    private final CourseAccessService courseAccessService;
    private final PostService postService;
    private final PostAccessService postAccessService;
    private final TrilhaService trilhaService;
    private final HtmlSanitizer htmlSanitizer;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public List<CommentResponse> list(EntityKind kind, UUID id, User viewer) {
        Target target = loadTarget(kind, id, viewer);
        List<Comment> comments = switch (kind) {
            case COURSE -> commentRepository.findByCourseOrdered(id);
            case POST -> commentRepository.findByPostOrdered(id);
            case TRILHA -> commentRepository.findByTrilhaOrdered(id);
        };

        // Build the tree in one pass: parents keep insertion order, replies attach to their parent.
        Map<UUID, List<CommentResponse>> repliesByParent = new LinkedHashMap<>();
        List<Comment> roots = new ArrayList<>();
        for (Comment comment : comments) {
            if (comment.getParent() == null) {
                roots.add(comment);
            } else {
                repliesByParent.computeIfAbsent(comment.getParent().getId(), key -> new ArrayList<>())
                        .add(toResponse(comment, target, viewer, List.of()));
            }
        }

        return roots.stream()
                .map(root -> toResponse(root, target, viewer,
                        repliesByParent.getOrDefault(root.getId(), List.of())))
                .toList();
    }

    @Transactional
    public CommentResponse create(EntityKind kind, UUID id, CreateCommentRequest request, User author) {
        Target target = loadTarget(kind, id, author);

        if (kind == EntityKind.COURSE
                && banRepository.existsById(new CourseUserId(target.id(), author.getId()))) {
            throw new ForbiddenException("Voce foi impedido de comentar neste curso");
        }

        Comment parent = null;
        if (request.parentId() != null) {
            parent = commentRepository.findById(request.parentId())
                    .orElseThrow(() -> ResourceNotFoundException.of("Comentario"));
            if (!parentTargets(parent, kind, id)) {
                throw new BadRequestException("O comentario pai pertence a outro conteudo");
            }
            if (parent.getParent() != null) {
                // Keep threads shallow: replies attach to the top-level comment.
                parent = parent.getParent();
            }
        }

        Comment.CommentBuilder builder = Comment.builder()
                .author(author)
                .parent(parent)
                .content(htmlSanitizer.sanitize(com.coursemaker.domain.enums.BlockType.TEXT, request.content()));
        switch (kind) {
            case COURSE -> builder.course(target.course());
            case POST -> builder.post(target.post());
            case TRILHA -> builder.trilha(target.trilha());
        }

        Comment saved = commentRepository.save(builder.build());

        notificationService.notify(target.owner(), author, NotificationType.COMMENT, kind, target.id(),
                target.title(), target.link());

        return toResponse(saved, target, author, List.of());
    }

    @Transactional
    public void delete(UUID commentId, User viewer) {
        Comment comment = commentRepository.findByIdWithTarget(commentId)
                .orElseThrow(() -> ResourceNotFoundException.of("Comentario"));

        boolean isAuthor = comment.getAuthor().getId().equals(viewer.getId());
        boolean isOwner = isTargetOwner(comment, viewer);
        if (!isAuthor && !isOwner && !viewer.isAdmin()) {
            throw new ForbiddenException("Voce nao pode excluir este comentario");
        }
        commentRepository.delete(comment);
    }

    @Transactional
    public void ban(UUID courseId, UUID userId, User owner) {
        Course course = courseService.loadForEditing(courseId, owner);
        if (course.getOwner().getId().equals(userId)) {
            throw new BadRequestException("Voce nao pode banir a si mesmo");
        }
        CourseUserId key = new CourseUserId(course.getId(), userId);
        if (!banRepository.existsById(key)) {
            banRepository.save(CommentBan.of(course.getId(), userId));
        }
    }

    @Transactional
    public void unban(UUID courseId, UUID userId, User owner) {
        Course course = courseService.loadForEditing(courseId, owner);
        banRepository.deleteById(new CourseUserId(course.getId(), userId));
    }

    @Transactional(readOnly = true)
    public List<UUID> listBans(UUID courseId, User owner) {
        Course course = courseService.loadForEditing(courseId, owner);
        return banRepository.findBannedUserIds(course.getId());
    }

    // ---------------------------------------------------------------- helpers

    /** Whichever of course/post/trilha this comment/id belongs to, resolved once per call. */
    private record Target(UUID id, String title, String link, User owner,
                          Course course, Post post, Trilha trilha) {
    }

    private Target loadTarget(EntityKind kind, UUID id, User viewer) {
        return switch (kind) {
            case COURSE -> {
                Course course = courseService.loadVisible(id, viewer);
                yield new Target(course.getId(), course.getName(),
                        "/courses/" + course.getOwner().getNickname() + "/" + course.getSlug(),
                        course.getOwner(), course, null, null);
            }
            case POST -> {
                Post post = postService.loadVisible(id, viewer);
                yield new Target(post.getId(), post.getTitle(),
                        "/posts/" + post.getOwner().getNickname() + "/" + post.getSlug(),
                        post.getOwner(), null, post, null);
            }
            case TRILHA -> {
                Trilha trilha = trilhaService.loadVisible(id, viewer);
                yield new Target(trilha.getId(), trilha.getTitle(),
                        "/trilhas/" + trilha.getOwner().getNickname() + "/" + trilha.getSlug(),
                        trilha.getOwner(), null, null, trilha);
            }
        };
    }

    private boolean parentTargets(Comment parent, EntityKind kind, UUID id) {
        return switch (kind) {
            case COURSE -> parent.getCourse() != null && parent.getCourse().getId().equals(id);
            case POST -> parent.getPost() != null && parent.getPost().getId().equals(id);
            case TRILHA -> parent.getTrilha() != null && parent.getTrilha().getId().equals(id);
        };
    }

    private boolean isTargetOwner(Comment comment, User viewer) {
        if (comment.getCourse() != null) {
            return courseAccessService.isOwner(comment.getCourse(), viewer);
        }
        if (comment.getPost() != null) {
            return postAccessService.isOwner(comment.getPost(), viewer);
        }
        return trilhaService.isOwner(comment.getTrilha(), viewer);
    }

    private CommentResponse toResponse(Comment comment, Target target, User viewer,
                                       List<CommentResponse> replies) {
        boolean canDelete = viewer != null
                && (comment.getAuthor().getId().equals(viewer.getId())
                || target.owner().getId().equals(viewer.getId())
                || viewer.isAdmin());

        return new CommentResponse(
                comment.getId(),
                comment.getParent() == null ? null : comment.getParent().getId(),
                UserSummary.from(comment.getAuthor()),
                comment.getContent(),
                canDelete,
                comment.getCreatedAt(),
                comment.getUpdatedAt(),
                replies);
    }
}
