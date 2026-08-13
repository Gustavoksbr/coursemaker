package com.coursemaker.repository;

import com.coursemaker.domain.entity.Notification;
import com.coursemaker.domain.enums.NotificationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    @Query("SELECT n FROM Notification n JOIN FETCH n.actor WHERE n.recipient.id = :recipientId "
            + "ORDER BY n.createdAt DESC")
    Page<Notification> findByRecipientOrdered(@Param("recipientId") UUID recipientId, Pageable pageable);

    long countByRecipientIdAndReadAtIsNull(UUID recipientId);

    /** The anti-spam dedup check: has this actor already triggered this exact notification recently? */
    boolean existsByRecipientIdAndActorIdAndTypeAndEntityIdAndCreatedAtAfter(
            UUID recipientId, UUID actorId, NotificationType type, UUID entityId, Instant after);

    @Modifying
    @Query("UPDATE Notification n SET n.readAt = :now WHERE n.id = :id AND n.recipient.id = :recipientId "
            + "AND n.readAt IS NULL")
    int markRead(@Param("id") UUID id, @Param("recipientId") UUID recipientId, @Param("now") Instant now);

    @Modifying
    @Query("UPDATE Notification n SET n.readAt = :now WHERE n.recipient.id = :recipientId AND n.readAt IS NULL")
    int markAllRead(@Param("recipientId") UUID recipientId, @Param("now") Instant now);
}
