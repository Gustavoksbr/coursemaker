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

@Entity
@Table(name = "post_likes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PostLike {

    @EmbeddedId
    private UserPostId id;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public static PostLike of(UUID userId, UUID postId) {
        PostLike like = new PostLike();
        like.setId(new UserPostId(userId, postId));
        return like;
    }
}
