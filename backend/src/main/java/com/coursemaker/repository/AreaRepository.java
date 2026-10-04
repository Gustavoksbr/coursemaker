package com.coursemaker.repository;

import com.coursemaker.domain.entity.Area;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface AreaRepository extends JpaRepository<Area, UUID> {

    List<Area> findAllByOrderByNameAsc();

    boolean existsBySlug(String slug);

    boolean existsByName(String name);

    /** Whether the area of this course accepts auto-graded code exercises (null if no such course). */
    @Query("SELECT a.allowsCodeExercises FROM Course c JOIN c.area a WHERE c.id = :courseId")
    Boolean courseAllowsCodeExercises(@Param("courseId") UUID courseId);
}
