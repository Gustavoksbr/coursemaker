package com.coursemaker.domain.entity;

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

import java.time.Instant;
import java.util.UUID;

/**
 * One slot in a trilha's ordered sequence. Exactly one of {@code course}/{@code post} is set.
 * Only the trilha's owner ever writes here, which is why a public course can end up in trilhas
 * belonging to people other than its own owner.
 */
@Entity
@Table(name = "trilha_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrilhaItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trilha_id", nullable = false)
    private Trilha trilha;

    /** The step this item is grouped under, or null when it sits directly under the trilha. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "step_id")
    private TrilhaStep step;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id")
    private Course course;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id")
    private Post post;

    @Column(name = "order_index", nullable = false)
    @Builder.Default
    private int orderIndex = 0;

    /** The trilha owner's own note about why this item is here -- not a discussion thread. */
    @Column(columnDefinition = "text")
    private String note;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
