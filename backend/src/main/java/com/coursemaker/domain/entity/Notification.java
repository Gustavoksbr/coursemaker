package com.coursemaker.domain.entity;

import com.coursemaker.domain.enums.EntityKind;
import com.coursemaker.domain.enums.NotificationType;
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

@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "actor_id", nullable = false)
    private User actor;

    @Column(nullable = false)
    private NotificationType type;

    @Column(name = "entity_kind", nullable = false)
    private EntityKind entityKind;

    @Column(name = "entity_id", nullable = false)
    private UUID entityId;

    /** Course/post/trilha title (or comment target's title), snapshotted at creation time. */
    @Column(name = "entity_title", nullable = false)
    private String entityTitle;

    /** Frontend route to navigate to, precomputed so the client never has to resolve it. */
    @Column(name = "entity_link", nullable = false, columnDefinition = "text")
    private String entityLink;

    @Column(name = "read_at")
    private Instant readAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
