package com.coursemaker.repository;

import com.coursemaker.domain.entity.CompositeIds.UserBlockId;
import com.coursemaker.domain.entity.QuestionAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface QuestionAnswerRepository extends JpaRepository<QuestionAnswer, UserBlockId> {

    @Query("SELECT a.id.blockId FROM QuestionAnswer a "
            + "WHERE a.id.userId = :userId AND a.id.blockId IN :blockIds AND a.correct = true")
    List<UUID> findCorrectlyAnsweredBlockIds(@Param("userId") UUID userId, @Param("blockIds") List<UUID> blockIds);

    @Query("SELECT a.id.blockId FROM QuestionAnswer a "
            + "WHERE a.id.userId = :userId AND a.correct = true "
            + "AND a.id.blockId IN (SELECT b.id FROM LessonBlock b WHERE b.lesson.module.course.id = :courseId)")
    List<UUID> findCorrectlyAnsweredBlockIdsForCourse(@Param("userId") UUID userId, @Param("courseId") UUID courseId);
}
