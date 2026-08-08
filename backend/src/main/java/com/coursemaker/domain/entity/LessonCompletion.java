package com.coursemaker.domain.entity;

import com.coursemaker.domain.entity.CompositeIds.UserLessonId;
import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "lesson_completions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LessonCompletion {

    @EmbeddedId
    private UserLessonId id;

    @CreationTimestamp
    @Column(name = "completed_at", nullable = false, updatable = false)
    private Instant completedAt;

    public static LessonCompletion of(UUID userId, UUID lessonId) {
        LessonCompletion completion = new LessonCompletion();
        completion.setId(new UserLessonId(userId, lessonId));
        return completion;
    }
}
