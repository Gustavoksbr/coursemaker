package com.coursemaker.repository;

import com.coursemaker.domain.entity.CodeExerciseTest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface CodeExerciseTestRepository extends JpaRepository<CodeExerciseTest, UUID> {

    List<CodeExerciseTest> findByBlockIdOrderByPositionAsc(UUID blockId);

    @Modifying
    @Query("DELETE FROM CodeExerciseTest t WHERE t.blockId = :blockId")
    void deleteByBlockId(@Param("blockId") UUID blockId);
}
