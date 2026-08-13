package com.coursemaker.repository;

import com.coursemaker.domain.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CommentRepository extends JpaRepository<Comment, UUID> {

    @Query("SELECT c FROM Comment c JOIN FETCH c.author WHERE c.course.id = :courseId "
            + "ORDER BY c.createdAt ASC")
    List<Comment> findByCourseOrdered(@Param("courseId") UUID courseId);

    @Query("SELECT c FROM Comment c JOIN FETCH c.author WHERE c.post.id = :postId "
            + "ORDER BY c.createdAt ASC")
    List<Comment> findByPostOrdered(@Param("postId") UUID postId);

    @Query("SELECT c FROM Comment c JOIN FETCH c.author WHERE c.trilha.id = :trilhaId "
            + "ORDER BY c.createdAt ASC")
    List<Comment> findByTrilhaOrdered(@Param("trilhaId") UUID trilhaId);

    /**
     * Loads a comment with whichever target (course/post/trilha) it belongs to, plus that
     * target's owner - exactly one of the three left joins yields a row, since a comment always
     * has exactly one target (DB CHECK constraint).
     */
    @Query("SELECT c FROM Comment c JOIN FETCH c.author "
            + "LEFT JOIN FETCH c.course co LEFT JOIN FETCH co.owner "
            + "LEFT JOIN FETCH c.post po LEFT JOIN FETCH po.owner "
            + "LEFT JOIN FETCH c.trilha tr LEFT JOIN FETCH tr.owner "
            + "WHERE c.id = :id")
    Optional<Comment> findByIdWithTarget(@Param("id") UUID id);
}
