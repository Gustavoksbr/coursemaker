package com.coursemaker.repository;

import com.coursemaker.domain.entity.Lesson;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LessonRepository extends JpaRepository<Lesson, UUID> {

    @Query("SELECT l FROM Lesson l WHERE l.module.id = :moduleId ORDER BY l.orderIndex ASC")
    List<Lesson> findByModuleOrdered(@Param("moduleId") UUID moduleId);

    @Query("SELECT l FROM Lesson l JOIN FETCH l.module m JOIN FETCH m.course c JOIN FETCH c.owner "
            + "WHERE l.id = :id")
    Optional<Lesson> findByIdWithCourse(@Param("id") UUID id);

    @Query("SELECT l FROM Lesson l WHERE l.module.course.id = :courseId "
            + "ORDER BY l.module.orderIndex ASC, l.orderIndex ASC")
    List<Lesson> findAllByCourseId(@Param("courseId") UUID courseId);

    @Query("SELECT count(l) FROM Lesson l WHERE l.module.course.id = :courseId")
    long countByCourseId(@Param("courseId") UUID courseId);

    @Query("SELECT coalesce(max(l.orderIndex), -1) FROM Lesson l WHERE l.module.id = :moduleId")
    int findMaxOrder(@Param("moduleId") UUID moduleId);
}
