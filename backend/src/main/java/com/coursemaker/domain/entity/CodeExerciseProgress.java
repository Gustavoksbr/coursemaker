package com.coursemaker.domain.entity;

import com.coursemaker.domain.entity.CompositeIds.UserBlockId;
import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/** One student's standing on one code exercise. {@code passed} is permanent once true. */
@Entity
@Table(name = "code_exercise_progress")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CodeExerciseProgress {

    @EmbeddedId
    private UserBlockId id;

    @Column(nullable = false)
    private boolean passed;

    @Column(name = "failed_submissions", nullable = false)
    private int failedSubmissions;

    @Column(name = "last_code", columnDefinition = "text")
    private String lastCode;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public static CodeExerciseProgress of(UUID userId, UUID blockId) {
        CodeExerciseProgress progress = new CodeExerciseProgress();
        progress.setId(new UserBlockId(userId, blockId));
        progress.setUpdatedAt(Instant.now());
        return progress;
    }
}
