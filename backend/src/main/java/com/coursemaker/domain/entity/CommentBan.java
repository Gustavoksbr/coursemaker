package com.coursemaker.domain.entity;

import com.coursemaker.domain.entity.CompositeIds.CourseUserId;
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

/** A user the course owner has barred from commenting on that course. */
@Entity
@Table(name = "comment_bans")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CommentBan {

    @EmbeddedId
    private CourseUserId id;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public static CommentBan of(UUID courseId, UUID userId) {
        CommentBan ban = new CommentBan();
        ban.setId(new CourseUserId(courseId, userId));
        return ban;
    }
}
