package com.coursemaker.domain.entity;

import com.coursemaker.domain.entity.CompositeIds.CourseTrilhaId;
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
 * The course owner's curation of which trilha memberships surface by default on the course's own
 * page. A row here requires a matching {@link TrilhaItem}; the migration enforces this with a
 * composite foreign key so a course can only be highlighted in a trilha it truly belongs to.
 */
@Entity
@Table(name = "course_trilha_highlights")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CourseTrilhaHighlight {

    @EmbeddedId
    private CourseTrilhaId id;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public static CourseTrilhaHighlight of(UUID courseId, UUID trilhaId) {
        CourseTrilhaHighlight highlight = new CourseTrilhaHighlight();
        highlight.setId(new CourseTrilhaId(courseId, trilhaId));
        return highlight;
    }
}
