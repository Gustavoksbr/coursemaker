package com.coursemaker.service;

import com.coursemaker.domain.entity.CompositeIds.UserCourseId;
import com.coursemaker.domain.entity.CompositeIds.UserPostId;
import com.coursemaker.domain.entity.CourseLike;
import com.coursemaker.domain.entity.Post;
import com.coursemaker.domain.entity.PostLike;
import com.coursemaker.domain.entity.User;
import com.coursemaker.exception.ApiExceptions.ResourceNotFoundException;
import com.coursemaker.repository.CourseLikeRepository;
import com.coursemaker.repository.PostLikeRepository;
import com.coursemaker.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/** Idempotent like/unlike for courses and posts. */
@Service
@RequiredArgsConstructor
public class LikeService {

    private final CourseLikeRepository courseLikeRepository;
    private final PostLikeRepository postLikeRepository;
    private final PostRepository postRepository;
    private final CourseService courseService;

    public record LikeStatus(UUID id, boolean liked, long likeCount) {
    }

    @Transactional
    public LikeStatus likeCourse(UUID courseId, User user) {
        courseService.loadVisible(courseId, user);
        UserCourseId key = new UserCourseId(user.getId(), courseId);
        if (!courseLikeRepository.existsById(key)) {
            courseLikeRepository.save(CourseLike.of(user.getId(), courseId));
        }
        return new LikeStatus(courseId, true, courseLikeRepository.countByCourseId(courseId));
    }

    @Transactional
    public LikeStatus unlikeCourse(UUID courseId, User user) {
        courseLikeRepository.deleteById(new UserCourseId(user.getId(), courseId));
        return new LikeStatus(courseId, false, courseLikeRepository.countByCourseId(courseId));
    }

    @Transactional
    public LikeStatus likePost(UUID postId, User user) {
        Post post = postRepository.findByIdWithOwner(postId)
                .orElseThrow(() -> ResourceNotFoundException.of("Post"));
        UserPostId key = new UserPostId(user.getId(), post.getId());
        if (!postLikeRepository.existsById(key)) {
            postLikeRepository.save(PostLike.of(user.getId(), post.getId()));
        }
        return new LikeStatus(postId, true, postLikeRepository.countByPostId(postId));
    }

    @Transactional
    public LikeStatus unlikePost(UUID postId, User user) {
        postLikeRepository.deleteById(new UserPostId(user.getId(), postId));
        return new LikeStatus(postId, false, postLikeRepository.countByPostId(postId));
    }
}
