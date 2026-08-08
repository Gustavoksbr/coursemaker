package com.coursemaker.domain.entity;

import com.coursemaker.domain.entity.CompositeIds.UserCourseId;
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
@Table(name = "enrollments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Enrollment {

    @EmbeddedId
    private UserCourseId id;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public static Enrollment of(UUID userId, UUID courseId) {
        Enrollment enrollment = new Enrollment();
        enrollment.setId(new UserCourseId(userId, courseId));
        return enrollment;
    }
}
