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

/** Currently active access to a private course. Revocable by the owner. */
@Entity
@Table(name = "private_course_access")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PrivateCourseAccess {

    @EmbeddedId
    private UserCourseId id;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public static PrivateCourseAccess of(UUID userId, UUID courseId) {
        PrivateCourseAccess access = new PrivateCourseAccess();
        access.setId(new UserCourseId(userId, courseId));
        return access;
    }
}
