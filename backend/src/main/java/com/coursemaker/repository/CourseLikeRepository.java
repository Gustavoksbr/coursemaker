package com.coursemaker.repository;

import com.coursemaker.domain.entity.CompositeIds.UserCourseId;
import com.coursemaker.domain.entity.CourseLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface CourseLikeRepository extends JpaRepository<CourseLike, UserCourseId> {

    @Query("SELECT count(l) FROM CourseLike l WHERE l.id.courseId = :courseId")
    long countByCourseId(@Param("courseId") UUID courseId);

    @Query("SELECT l.id.courseId, count(l) FROM CourseLike l WHERE l.id.courseId IN :courseIds "
            + "GROUP BY l.id.courseId")
    List<Object[]> countByCourseIds(@Param("courseIds") Collection<UUID> courseIds);

    @Query("SELECT l.id.courseId FROM CourseLike l WHERE l.id.userId = :userId AND l.id.courseId IN :courseIds")
    List<UUID> findLikedCourseIds(@Param("userId") UUID userId, @Param("courseIds") Collection<UUID> courseIds);
}
