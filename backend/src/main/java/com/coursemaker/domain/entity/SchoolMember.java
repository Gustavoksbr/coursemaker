package com.coursemaker.domain.entity;

import com.coursemaker.domain.entity.CompositeIds.SchoolUserId;
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
 * Grants one user permission to publish content under one school. Only an admin creates these
 * rows (see {@code SchoolService}) - the owner of a course/post/trilha just picks from whichever
 * schools they already have a row for.
 */
@Entity
@Table(name = "school_members")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SchoolMember {

    @EmbeddedId
    private SchoolUserId id;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public static SchoolMember of(UUID schoolId, UUID userId) {
        SchoolMember member = new SchoolMember();
        member.setId(new SchoolUserId(schoolId, userId));
        return member;
    }
}
