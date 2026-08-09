package com.coursemaker.service;

import com.coursemaker.domain.entity.Course;
import com.coursemaker.domain.entity.CourseRelatedItem;
import com.coursemaker.domain.entity.Post;
import com.coursemaker.domain.entity.PostRelatedItem;
import com.coursemaker.domain.entity.User;
import com.coursemaker.dto.PageResponse;
import com.coursemaker.dto.related.RelatedItemDtos.AddRelatedItemRequest;
import com.coursemaker.dto.related.RelatedItemDtos.RelatedItemResponse;
import com.coursemaker.exception.ApiExceptions.BadRequestException;
import com.coursemaker.exception.ApiExceptions.ForbiddenException;
import com.coursemaker.exception.ApiExceptions.ResourceNotFoundException;
import com.coursemaker.repository.CourseRelatedItemRepository;
import com.coursemaker.repository.CourseRepository;
import com.coursemaker.repository.PostRelatedItemRepository;
import com.coursemaker.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Related courses/posts shown on a course or post page. Curated exclusively by the owner of the
 * source entity -- one-directional, so linking X to Y never makes Y show X back.
 */
@Service
@RequiredArgsConstructor
public class RelatedItemService {

    private static final int MAX_PAGE_SIZE = 50;

    private final CourseRelatedItemRepository courseRelatedItemRepository;
    private final PostRelatedItemRepository postRelatedItemRepository;
    private final CourseRepository courseRepository;
    private final PostRepository postRepository;
    private final CourseMapper courseMapper;
    private final PostMapper postMapper;

    // --------------------------------------------------------------- courses

    @Transactional(readOnly = true)
    public PageResponse<RelatedItemResponse> listForCourse(UUID courseId, int page, int size, User viewer) {
        Page<CourseRelatedItem> result = courseRelatedItemRepository.findByCourseOrdered(courseId,
                PageRequest.of(Math.max(0, page), Math.clamp(size, 1, MAX_PAGE_SIZE)));
        return PageResponse.of(result, result.getContent().stream()
                .map(item -> toResponse(item.getId(), item.getRelatedCourse(), item.getRelatedPost(),
                        item.getOrderIndex(), item.getCreatedAt(), viewer))
                .toList());
    }

    @Transactional
    public RelatedItemResponse addToCourse(UUID courseId, AddRelatedItemRequest request, User owner) {
        Course course = requireOwnedCourse(courseId, owner);

        boolean hasCourse = request.relatedCourseId() != null;
        boolean hasPost = request.relatedPostId() != null;
        if (hasCourse == hasPost) {
            throw new BadRequestException("Informe exatamente um curso ou post relacionado");
        }

        CourseRelatedItem.CourseRelatedItemBuilder builder = CourseRelatedItem.builder().course(course);
        if (hasCourse) {
            if (request.relatedCourseId().equals(courseId)) {
                throw new BadRequestException("Um curso nao pode ser relacionado a si mesmo");
            }
            if (courseRelatedItemRepository.existsByCourseIdAndRelatedCourseId(courseId, request.relatedCourseId())) {
                throw new BadRequestException("Este curso ja esta relacionado");
            }
            Course related = courseRepository.findByIdWithOwner(request.relatedCourseId())
                    .orElseThrow(() -> ResourceNotFoundException.of("Curso"));
            builder.relatedCourse(related);
        } else {
            if (courseRelatedItemRepository.existsByCourseIdAndRelatedPostId(courseId, request.relatedPostId())) {
                throw new BadRequestException("Este post ja esta relacionado");
            }
            Post related = postRepository.findByIdWithOwner(request.relatedPostId())
                    .orElseThrow(() -> ResourceNotFoundException.of("Post"));
            builder.relatedPost(related);
        }

        int orderIndex = request.orderIndex() != null ? request.orderIndex()
                : courseRelatedItemRepository.findMaxOrder(courseId) + 1;
        CourseRelatedItem saved = courseRelatedItemRepository.save(builder.orderIndex(orderIndex).build());
        return toResponse(saved.getId(), saved.getRelatedCourse(), saved.getRelatedPost(), saved.getOrderIndex(),
                saved.getCreatedAt(), owner);
    }

    @Transactional
    public void removeFromCourse(UUID courseId, UUID relatedItemId, User owner) {
        requireOwnedCourse(courseId, owner);
        CourseRelatedItem item = courseRelatedItemRepository.findById(relatedItemId)
                .orElseThrow(() -> ResourceNotFoundException.of("Item relacionado"));
        if (!item.getCourse().getId().equals(courseId)) {
            throw ResourceNotFoundException.of("Item relacionado");
        }
        courseRelatedItemRepository.delete(item);
    }

    // ------------------------------------------------------------------ posts

    @Transactional(readOnly = true)
    public PageResponse<RelatedItemResponse> listForPost(UUID postId, int page, int size, User viewer) {
        Page<PostRelatedItem> result = postRelatedItemRepository.findByPostOrdered(postId,
                PageRequest.of(Math.max(0, page), Math.clamp(size, 1, MAX_PAGE_SIZE)));
        return PageResponse.of(result, result.getContent().stream()
                .map(item -> toResponse(item.getId(), item.getRelatedCourse(), item.getRelatedPost(),
                        item.getOrderIndex(), item.getCreatedAt(), viewer))
                .toList());
    }

    @Transactional
    public RelatedItemResponse addToPost(UUID postId, AddRelatedItemRequest request, User owner) {
        Post post = requireOwnedPost(postId, owner);

        boolean hasCourse = request.relatedCourseId() != null;
        boolean hasPost = request.relatedPostId() != null;
        if (hasCourse == hasPost) {
            throw new BadRequestException("Informe exatamente um curso ou post relacionado");
        }

        PostRelatedItem.PostRelatedItemBuilder builder = PostRelatedItem.builder().post(post);
        if (hasCourse) {
            if (postRelatedItemRepository.existsByPostIdAndRelatedCourseId(postId, request.relatedCourseId())) {
                throw new BadRequestException("Este curso ja esta relacionado");
            }
            Course related = courseRepository.findByIdWithOwner(request.relatedCourseId())
                    .orElseThrow(() -> ResourceNotFoundException.of("Curso"));
            builder.relatedCourse(related);
        } else {
            if (request.relatedPostId().equals(postId)) {
                throw new BadRequestException("Um post nao pode ser relacionado a si mesmo");
            }
            if (postRelatedItemRepository.existsByPostIdAndRelatedPostId(postId, request.relatedPostId())) {
                throw new BadRequestException("Este post ja esta relacionado");
            }
            Post related = postRepository.findByIdWithOwner(request.relatedPostId())
                    .orElseThrow(() -> ResourceNotFoundException.of("Post"));
            builder.relatedPost(related);
        }

        int orderIndex = request.orderIndex() != null ? request.orderIndex()
                : postRelatedItemRepository.findMaxOrder(postId) + 1;
        PostRelatedItem saved = postRelatedItemRepository.save(builder.orderIndex(orderIndex).build());
        return toResponse(saved.getId(), saved.getRelatedCourse(), saved.getRelatedPost(), saved.getOrderIndex(),
                saved.getCreatedAt(), owner);
    }

    @Transactional
    public void removeFromPost(UUID postId, UUID relatedItemId, User owner) {
        requireOwnedPost(postId, owner);
        PostRelatedItem item = postRelatedItemRepository.findById(relatedItemId)
                .orElseThrow(() -> ResourceNotFoundException.of("Item relacionado"));
        if (!item.getPost().getId().equals(postId)) {
            throw ResourceNotFoundException.of("Item relacionado");
        }
        postRelatedItemRepository.delete(item);
    }

    // ---------------------------------------------------------------- helpers

    private RelatedItemResponse toResponse(UUID id, Course relatedCourse, Post relatedPost, int orderIndex,
                                           java.time.Instant createdAt, User viewer) {
        return new RelatedItemResponse(
                id,
                relatedCourse == null ? null : courseMapper.toSummary(relatedCourse, viewer),
                relatedPost == null ? null : postMapper.toSummary(relatedPost, viewer),
                orderIndex,
                createdAt);
    }

    private Course requireOwnedCourse(UUID courseId, User owner) {
        Course course = courseRepository.findByIdWithOwner(courseId)
                .orElseThrow(() -> ResourceNotFoundException.of("Curso"));
        if (!course.getOwner().getId().equals(owner.getId())) {
            throw new ForbiddenException("Apenas o dono do curso pode fazer isso");
        }
        return course;
    }

    private Post requireOwnedPost(UUID postId, User owner) {
        Post post = postRepository.findByIdWithOwner(postId)
                .orElseThrow(() -> ResourceNotFoundException.of("Post"));
        if (!post.getOwner().getId().equals(owner.getId())) {
            throw new ForbiddenException("Apenas o dono do post pode fazer isso");
        }
        return post;
    }
}
