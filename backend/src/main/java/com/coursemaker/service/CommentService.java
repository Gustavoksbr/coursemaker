package com.coursemaker.service;

import com.coursemaker.domain.entity.Comment;
import com.coursemaker.domain.entity.CommentBan;
import com.coursemaker.domain.entity.CompositeIds.CourseUserId;
import com.coursemaker.domain.entity.Course;
import com.coursemaker.domain.entity.User;
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
 * Course comments, one level of threading deep (a reply cannot itself be replied to), plus the
 * owner's ability to bar a user from commenting.
 */
@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final CommentBanRepository banRepository;
    private final CourseService courseService;
    private final CourseAccessService accessService;
    private final HtmlSanitizer htmlSanitizer;

    @Transactional(readOnly = true)
    public List<CommentResponse> list(UUID courseId, User viewer) {
        Course course = courseService.loadVisible(courseId, viewer);
        List<Comment> comments = commentRepository.findByCourseOrdered(course.getId());

        // Build the tree in one pass: parents keep insertion order, replies attach to their parent.
        Map<UUID, List<CommentResponse>> repliesByParent = new LinkedHashMap<>();
        List<Comment> roots = new ArrayList<>();
        for (Comment comment : comments) {
            if (comment.getParent() == null) {
                roots.add(comment);
            } else {
                repliesByParent.computeIfAbsent(comment.getParent().getId(), key -> new ArrayList<>())
                        .add(toResponse(comment, course, viewer, List.of()));
            }
        }

        return roots.stream()
                .map(root -> toResponse(root, course, viewer,
                        repliesByParent.getOrDefault(root.getId(), List.of())))
                .toList();
    }

    @Transactional
    public CommentResponse create(UUID courseId, CreateCommentRequest request, User author) {
        Course course = courseService.loadVisible(courseId, author);
        if (banRepository.existsById(new CourseUserId(course.getId(), author.getId()))) {
            throw new ForbiddenException("Voce foi impedido de comentar neste curso");
        }

        Comment parent = null;
        if (request.parentId() != null) {
            parent = commentRepository.findById(request.parentId())
                    .orElseThrow(() -> ResourceNotFoundException.of("Comentario"));
            if (!parent.getCourse().getId().equals(course.getId())) {
                throw new BadRequestException("O comentario pai pertence a outro curso");
            }
            if (parent.getParent() != null) {
                // Keep threads shallow: replies attach to the top-level comment.
                parent = parent.getParent();
            }
        }

        Comment comment = Comment.builder()
                .course(course)
                .author(author)
                .parent(parent)
                .content(htmlSanitizer.sanitize(com.coursemaker.domain.enums.BlockType.TEXT, request.content()))
                .build();

        return toResponse(commentRepository.save(comment), course, author, List.of());
    }

    @Transactional
    public void delete(UUID commentId, User viewer) {
        Comment comment = commentRepository.findByIdWithCourse(commentId)
                .orElseThrow(() -> ResourceNotFoundException.of("Comentario"));

        boolean isAuthor = comment.getAuthor().getId().equals(viewer.getId());
        boolean isCourseOwner = accessService.isOwner(comment.getCourse(), viewer);
        if (!isAuthor && !isCourseOwner && !viewer.isAdmin()) {
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

    private CommentResponse toResponse(Comment comment, Course course, User viewer,
                                       List<CommentResponse> replies) {
        boolean canDelete = viewer != null
                && (comment.getAuthor().getId().equals(viewer.getId())
                || accessService.isOwner(course, viewer)
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
