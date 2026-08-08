package com.coursemaker.repository;

import com.coursemaker.domain.entity.Module;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ModuleRepository extends JpaRepository<Module, UUID> {

    @Query("SELECT m FROM Module m WHERE m.course.id = :courseId ORDER BY m.orderIndex ASC")
    List<Module> findByCourseOrdered(@Param("courseId") UUID courseId);

    @Query("SELECT m FROM Module m JOIN FETCH m.course c JOIN FETCH c.owner WHERE m.id = :id")
    java.util.Optional<Module> findByIdWithCourse(@Param("id") UUID id);

    @Query("SELECT coalesce(max(m.orderIndex), -1) FROM Module m WHERE m.course.id = :courseId")
    int findMaxOrder(@Param("courseId") UUID courseId);

    @Query("SELECT count(m) FROM Module m WHERE m.course.id = :courseId")
    long countByCourseId(@Param("courseId") UUID courseId);
}
