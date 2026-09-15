package com.coursemaker.domain.entity;

import com.coursemaker.domain.enums.CourseStatus;
import com.coursemaker.domain.enums.CourseVisibility;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "courses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "area_id", nullable = false)
    private Area area;

    /** Provenance, optional. Only settable to a school the owner is a member of - see SchoolService. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id")
    private School school;

    @Column(nullable = false)
    private String name;

    /** Unique per owner, not globally. */
    @Column(nullable = false)
    private String slug;

    @Column(columnDefinition = "text")
    private String description;

    @Column(name = "landing_description", columnDefinition = "text")
    private String landingDescription;

    @Column(name = "thumbnail_url", columnDefinition = "text")
    private String thumbnailUrl;

    @Column(nullable = false)
    @Builder.Default
    private CourseVisibility visibility = CourseVisibility.PUBLIC;

    @Column(nullable = false)
    @Builder.Default
    private CourseStatus status = CourseStatus.UNAVAILABLE;

    /** BCrypt hash of the password protecting a private course. */
    @Column(name = "password_hash")
    private String passwordHash;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "categories", columnDefinition = "text[]", nullable = false)
    @Builder.Default
    private List<String> categories = new ArrayList<>();

    @Column(name = "is_featured", nullable = false)
    @Builder.Default
    private boolean featured = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public boolean isPrivate() {
        return visibility == CourseVisibility.PRIVATE;
    }

    public boolean isPublished() {
        return status == CourseStatus.AVAILABLE;
    }
}
