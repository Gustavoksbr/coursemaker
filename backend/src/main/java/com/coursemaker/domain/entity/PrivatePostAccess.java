package com.coursemaker.domain.entity;

import com.coursemaker.domain.entity.CompositeIds.UserPostId;
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

/** Currently active access to a private post. Mirrors {@link PrivateCourseAccess}. */
@Entity
@Table(name = "private_post_access")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PrivatePostAccess {

    @EmbeddedId
    private UserPostId id;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public static PrivatePostAccess of(UUID userId, UUID postId) {
        PrivatePostAccess access = new PrivatePostAccess();
        access.setId(new UserPostId(userId, postId));
        return access;
    }
}
