package com.coursemaker.domain.entity;

import com.coursemaker.domain.entity.CompositeIds.UserTrilhaId;
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
@Table(name = "trilha_enrollments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TrilhaEnrollment {

    @EmbeddedId
    private UserTrilhaId id;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public static TrilhaEnrollment of(UUID userId, UUID trilhaId) {
        TrilhaEnrollment enrollment = new TrilhaEnrollment();
        enrollment.setId(new UserTrilhaId(userId, trilhaId));
        return enrollment;
    }
}
