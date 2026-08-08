package com.coursemaker.repository;

import com.coursemaker.domain.entity.CompositeIds.UserCourseId;
import com.coursemaker.domain.entity.Enrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface EnrollmentRepository extends JpaRepository<Enrollment, UserCourseId> {

    @Query("SELECT count(e) FROM Enrollment e WHERE e.id.courseId = :courseId")
    long countByCourseId(@Param("courseId") UUID courseId);

    @Query("SELECT e.id.courseId FROM Enrollment e WHERE e.id.userId = :userId AND e.id.courseId IN :courseIds")
    List<UUID> findEnrolledCourseIds(@Param("userId") UUID userId, @Param("courseIds") Collection<UUID> courseIds);

    @Query("SELECT e.id.courseId FROM Enrollment e WHERE e.id.userId = :userId")
    List<UUID> findAllCourseIdsByUser(@Param("userId") UUID userId);

    @Query("SELECT e FROM Enrollment e WHERE e.id.courseId = :courseId ORDER BY e.createdAt")
    List<Enrollment> findByCourseId(@Param("courseId") UUID courseId);

    @Query("SELECT e.id.courseId, count(e) FROM Enrollment e WHERE e.id.courseId IN :courseIds "
            + "GROUP BY e.id.courseId")
    List<Object[]> countByCourseIds(@Param("courseIds") Collection<UUID> courseIds);
}
