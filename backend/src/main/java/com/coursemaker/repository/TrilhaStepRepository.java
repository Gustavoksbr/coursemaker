package com.coursemaker.repository;

import com.coursemaker.domain.entity.TrilhaStep;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TrilhaStepRepository extends JpaRepository<TrilhaStep, UUID> {

    @Query("SELECT s FROM TrilhaStep s WHERE s.trilha.id = :trilhaId ORDER BY s.orderIndex ASC")
    List<TrilhaStep> findByTrilhaOrdered(@Param("trilhaId") UUID trilhaId);

    @Query("SELECT s FROM TrilhaStep s JOIN FETCH s.trilha t JOIN FETCH t.owner WHERE s.id = :id")
    Optional<TrilhaStep> findByIdWithTrilha(@Param("id") UUID id);

    @Query("SELECT coalesce(max(s.orderIndex), -1) FROM TrilhaStep s WHERE s.trilha.id = :trilhaId")
    int findMaxOrder(@Param("trilhaId") UUID trilhaId);
}
