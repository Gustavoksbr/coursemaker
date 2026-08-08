package com.coursemaker.repository;

import com.coursemaker.domain.entity.CompositeIds.UserLessonId;
import com.coursemaker.domain.entity.LessonCompletion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface LessonCompletionRepository extends JpaRepository<LessonCompletion, UserLessonId> {

    @Query("""
            SELECT lc.id.lessonId FROM LessonCompletion lc
            WHERE lc.id.userId = :userId
              AND lc.id.lessonId IN (SELECT l.id FROM Lesson l WHERE l.module.course.id = :courseId)
            """)
    List<UUID> findCompletedLessonIds(@Param("userId") UUID userId, @Param("courseId") UUID courseId);
}
