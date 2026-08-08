package com.coursemaker.repository;

import com.coursemaker.domain.entity.LessonBlock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LessonBlockRepository extends JpaRepository<LessonBlock, UUID> {

    @Query("SELECT b FROM LessonBlock b WHERE b.lesson.id = :lessonId ORDER BY b.orderIndex ASC")
    List<LessonBlock> findByLessonOrdered(@Param("lessonId") UUID lessonId);

    @Query("SELECT b FROM LessonBlock b JOIN FETCH b.lesson l JOIN FETCH l.module m "
            + "JOIN FETCH m.course c JOIN FETCH c.owner WHERE b.id = :id")
    Optional<LessonBlock> findByIdWithCourse(@Param("id") UUID id);

    @Query("SELECT coalesce(max(b.orderIndex), -1) FROM LessonBlock b WHERE b.lesson.id = :lessonId")
    int findMaxOrder(@Param("lessonId") UUID lessonId);
}
