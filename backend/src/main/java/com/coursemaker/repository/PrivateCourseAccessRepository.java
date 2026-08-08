package com.coursemaker.repository;

import com.coursemaker.domain.entity.CompositeIds.UserCourseId;
import com.coursemaker.domain.entity.PrivateCourseAccess;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface PrivateCourseAccessRepository extends JpaRepository<PrivateCourseAccess, UserCourseId> {

    @Query("SELECT a.id.userId FROM PrivateCourseAccess a WHERE a.id.courseId = :courseId")
    List<UUID> findUserIdsWithAccess(@Param("courseId") UUID courseId);
}
