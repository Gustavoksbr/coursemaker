package com.coursemaker.domain.entity;

import com.coursemaker.domain.enums.ExerciseMode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Server-only half of a CODE_EXERCISE block: the reference solution. The tests are in
 * {@link CodeExerciseTest}. Nothing here is ever serialised to a student.
 */
@Entity
@Table(name = "code_exercises")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CodeExercise {

    /** Same id as the lesson block this exercise belongs to. */
    @Id
    @Column(name = "block_id")
    private UUID blockId;

    @Column(nullable = false)
    private ExerciseMode mode;

    @Column(name = "function_name")
    private String functionName;

    @Column(name = "solution_code", nullable = false, columnDefinition = "text")
    private String solutionCode;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
