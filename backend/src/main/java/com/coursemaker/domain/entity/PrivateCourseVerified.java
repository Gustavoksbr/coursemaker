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

/**
 * Remembers that a user once proved they knew a private course's password, so returning to the
 * course does not prompt for it again.
 */
@Entity
@Table(name = "private_course_verified")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PrivateCourseVerified {

    @EmbeddedId
    private UserCourseId id;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public static PrivateCourseVerified of(UUID userId, UUID courseId) {
        PrivateCourseVerified verified = new PrivateCourseVerified();
        verified.setId(new UserCourseId(userId, courseId));
        return verified;
    }
}
