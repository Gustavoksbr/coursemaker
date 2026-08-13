package com.coursemaker.repository;

import com.coursemaker.domain.entity.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MessageRepository extends JpaRepository<Message, UUID> {

    @Query("SELECT m FROM Message m JOIN FETCH m.sender JOIN FETCH m.recipient "
            + "LEFT JOIN FETCH m.parent p LEFT JOIN FETCH p.sender WHERE m.id = :id")
    Optional<Message> findByIdWithParties(@Param("id") UUID id);

    @Query("SELECT m FROM Message m JOIN FETCH m.sender JOIN FETCH m.recipient "
            + "LEFT JOIN FETCH m.parent p LEFT JOIN FETCH p.sender "
            + "WHERE (m.sender.id = :userId AND m.recipient.id = :partnerId) "
            + "   OR (m.sender.id = :partnerId AND m.recipient.id = :userId) "
            + "ORDER BY m.createdAt DESC")
    Page<Message> findThread(@Param("userId") UUID userId, @Param("partnerId") UUID partnerId, Pageable pageable);

    long countByRecipientIdAndReadAtIsNullAndDeletedAtIsNull(UUID recipientId);

    @Modifying
    @Query("UPDATE Message m SET m.readAt = :now WHERE m.recipient.id = :userId AND m.sender.id = :partnerId "
            + "AND m.readAt IS NULL")
    int markThreadRead(@Param("userId") UUID userId, @Param("partnerId") UUID partnerId, @Param("now") Instant now);

    /**
     * One row per conversation partner: their latest message plus how many of their messages to
     * this user are still unread. Native SQL because {@code DISTINCT ON} is the clean way to express
     * "latest row per group" in Postgres and JPQL cannot express it - same justification as
     * {@link CourseRepository#search}'s native query.
     */
    @Query(value = """
            SELECT
              u.id AS partnerId, u.nickname AS partnerNickname, u.name AS partnerName, u.image AS partnerImage,
              lm.id AS lastMessageId, lm.content AS lastContent, lm.deleted_at AS lastDeletedAt,
              lm.sender_id AS lastSenderId, lm.created_at AS lastCreatedAt, lm.edited_at AS lastEditedAt,
              COALESCE(uc.unread_count, 0) AS unreadCount
            FROM (
              SELECT DISTINCT ON (partner_id) partner_id, id, content, deleted_at, sender_id, created_at, edited_at
              FROM (
                SELECT CASE WHEN sender_id = CAST(:userId AS uuid) THEN recipient_id ELSE sender_id END AS partner_id,
                       id, content, deleted_at, sender_id, created_at, edited_at
                FROM messages WHERE sender_id = CAST(:userId AS uuid) OR recipient_id = CAST(:userId AS uuid)
              ) sub
              ORDER BY partner_id, created_at DESC
            ) lm
            JOIN users u ON u.id = lm.partner_id
            LEFT JOIN (
              SELECT sender_id AS partner_id, count(*) AS unread_count
              FROM messages
              WHERE recipient_id = CAST(:userId AS uuid) AND read_at IS NULL AND deleted_at IS NULL
              GROUP BY sender_id
            ) uc ON uc.partner_id = lm.partner_id
            ORDER BY lm.created_at DESC
            """, nativeQuery = true)
    List<ConversationSummaryProjection> conversationSummaries(@Param("userId") UUID userId);
}
