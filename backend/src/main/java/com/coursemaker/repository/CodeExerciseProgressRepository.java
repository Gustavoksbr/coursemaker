package com.coursemaker.repository;

import com.coursemaker.domain.entity.CodeExerciseProgress;
import com.coursemaker.domain.entity.CompositeIds.UserBlockId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface CodeExerciseProgressRepository extends JpaRepository<CodeExerciseProgress, UserBlockId> {

    @Query("SELECT p.id.blockId FROM CodeExerciseProgress p "
            + "WHERE p.id.userId = :userId AND p.id.blockId IN :blockIds AND p.passed = true")
    List<UUID> findPassedBlockIds(@Param("userId") UUID userId, @Param("blockIds") List<UUID> blockIds);

    @Query("SELECT p.id.blockId FROM CodeExerciseProgress p "
            + "WHERE p.id.userId = :userId AND p.passed = true "
            + "AND p.id.blockId IN (SELECT b.id FROM LessonBlock b WHERE b.lesson.module.course.id = :courseId)")
    List<UUID> findPassedBlockIdsForCourse(@Param("userId") UUID userId, @Param("courseId") UUID courseId);

    /** Forgets this user's work on every block of the course (used when they unenroll to start over). */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            DELETE FROM CodeExerciseProgress cp
            WHERE cp.id.userId = :userId
              AND cp.id.blockId IN (SELECT b.id FROM LessonBlock b WHERE b.lesson.module.course.id = :courseId)
            """)
    int deleteAllForUserInCourse(@Param("userId") UUID userId, @Param("courseId") UUID courseId);
}
