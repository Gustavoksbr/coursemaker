package com.coursemaker.repository;

import com.coursemaker.domain.entity.CourseRelatedItem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface CourseRelatedItemRepository extends JpaRepository<CourseRelatedItem, UUID> {

    @Query("SELECT r FROM CourseRelatedItem r "
            + "LEFT JOIN FETCH r.relatedCourse rc LEFT JOIN FETCH rc.owner "
            + "LEFT JOIN FETCH r.relatedPost rp LEFT JOIN FETCH rp.owner "
            + "WHERE r.course.id = :courseId ORDER BY r.orderIndex ASC")
    Page<CourseRelatedItem> findByCourseOrdered(@Param("courseId") UUID courseId, Pageable pageable);

    @Query("SELECT coalesce(max(r.orderIndex), -1) FROM CourseRelatedItem r WHERE r.course.id = :courseId")
    int findMaxOrder(@Param("courseId") UUID courseId);

    boolean existsByCourseIdAndRelatedCourseId(UUID courseId, UUID relatedCourseId);

    boolean existsByCourseIdAndRelatedPostId(UUID courseId, UUID relatedPostId);
}
