package com.coursemaker.repository;

import com.coursemaker.domain.entity.CodeExercise;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CodeExerciseRepository extends JpaRepository<CodeExercise, UUID> {
}
