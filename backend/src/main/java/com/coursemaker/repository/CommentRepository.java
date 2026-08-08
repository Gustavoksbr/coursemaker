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

    @Query("SELECT c FROM Comment c JOIN FETCH c.author JOIN FETCH c.course co JOIN FETCH co.owner "
            + "WHERE c.id = :id")
    Optional<Comment> findByIdWithCourse(@Param("id") UUID id);
}
