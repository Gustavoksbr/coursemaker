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

/**
 * Remembers that a user once proved they knew a private post's password, so returning to the post
 * does not prompt for it again. Mirrors {@link PrivateCourseVerified}.
 */
@Entity
@Table(name = "private_post_verified")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PrivatePostVerified {

    @EmbeddedId
    private UserPostId id;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public static PrivatePostVerified of(UUID userId, UUID postId) {
        PrivatePostVerified verified = new PrivatePostVerified();
        verified.setId(new UserPostId(userId, postId));
        return verified;
    }
}
