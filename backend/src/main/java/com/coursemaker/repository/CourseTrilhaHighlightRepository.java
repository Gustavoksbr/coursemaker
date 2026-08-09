package com.coursemaker.repository;

import com.coursemaker.domain.entity.CompositeIds.CourseTrilhaId;
import com.coursemaker.domain.entity.CourseTrilhaHighlight;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface CourseTrilhaHighlightRepository extends JpaRepository<CourseTrilhaHighlight, CourseTrilhaId> {

    @Query("SELECT h.id.trilhaId FROM CourseTrilhaHighlight h WHERE h.id.courseId = :courseId ORDER BY h.createdAt")
    List<UUID> findTrilhaIdsByCourseId(@Param("courseId") UUID courseId);

    long countByIdCourseId(UUID courseId);
}
