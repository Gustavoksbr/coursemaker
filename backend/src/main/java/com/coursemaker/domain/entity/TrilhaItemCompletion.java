package com.coursemaker.domain.entity;

import com.coursemaker.domain.entity.CompositeIds.UserTrilhaItemId;
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

/**
 * Manual, independent completion flag for a trilha item -- mirrors {@link LessonCompletion}. It
 * does not derive from the underlying course's own lesson progress, which is shown alongside it
 * instead of being merged into it.
 */
@Entity
@Table(name = "trilha_item_completions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TrilhaItemCompletion {

    @EmbeddedId
    private UserTrilhaItemId id;

    @CreationTimestamp
    @Column(name = "completed_at", nullable = false, updatable = false)
    private Instant completedAt;

    public static TrilhaItemCompletion of(UUID userId, UUID trilhaItemId) {
        TrilhaItemCompletion completion = new TrilhaItemCompletion();
        completion.setId(new UserTrilhaItemId(userId, trilhaItemId));
        return completion;
    }
}
