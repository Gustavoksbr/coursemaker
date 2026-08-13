package com.coursemaker.service;

import com.coursemaker.domain.entity.Notification;
import com.coursemaker.domain.entity.User;
import com.coursemaker.domain.enums.EntityKind;
import com.coursemaker.domain.enums.NotificationType;
import com.coursemaker.dto.PageResponse;
import com.coursemaker.dto.notification.NotificationDtos.NotificationResponse;
import com.coursemaker.dto.notification.NotificationDtos.UnreadCountResponse;
import com.coursemaker.dto.user.UserSummary;
import com.coursemaker.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

/**
 * Creates notifications and pushes them live over the user's private WebSocket queue.
 *
 * <p>Anti-spam: before inserting anything, checks whether this exact (recipient, actor, type,
 * entity) tuple already produced a notification within {@code app.notifications.dedup-window-hours}
 * and silently skips if so - one indexed EXISTS query, no N+1. This also doubles as "never notify
 * yourself": a course owner enrolling in their own course, or commenting on their own content,
 * never reaches this far in {@code recipient == actor}.
 */
@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final int MAX_PAGE_SIZE = 50;

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Value("${app.notifications.dedup-window-hours}")
    private int dedupWindowHours;

    @Transactional
    public void notify(User recipient, User actor, NotificationType type, EntityKind entityKind,
                       UUID entityId, String entityTitle, String entityLink) {
        if (recipient.getId().equals(actor.getId())) {
            return;
        }

        Instant since = Instant.now().minus(Duration.ofHours(dedupWindowHours));
        boolean duplicate = notificationRepository.existsByRecipientIdAndActorIdAndTypeAndEntityIdAndCreatedAtAfter(
                recipient.getId(), actor.getId(), type, entityId, since);
        if (duplicate) {
            return;
        }

        // saveAndFlush, not save: @CreationTimestamp is only populated once Hibernate actually
        // prepares the INSERT, which a bare save() defers to the transaction's eventual commit -
        // the WS push below would carry a null createdAt otherwise (the REST list endpoint never
        // showed this because it always re-queries, getting the DB's real value back).
        Notification saved = notificationRepository.saveAndFlush(Notification.builder()
                .recipient(recipient)
                .actor(actor)
                .type(type)
                .entityKind(entityKind)
                .entityId(entityId)
                .entityTitle(entityTitle)
                .entityLink(entityLink)
                .build());
        // actor is already loaded (passed in by the caller), so toResponse needs no extra fetch.
        saved.setActor(actor);

        messagingTemplate.convertAndSendToUser(
                recipient.getId().toString(), "/queue/notifications", toResponse(saved));
    }

    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> list(User user, int page, int size) {
        Page<Notification> result = notificationRepository.findByRecipientOrdered(
                user.getId(), PageRequest.of(Math.max(0, page), Math.clamp(size, 1, MAX_PAGE_SIZE)));
        return PageResponse.of(result, result.getContent().stream().map(this::toResponse).toList());
    }

    @Transactional(readOnly = true)
    public UnreadCountResponse unreadCount(User user) {
        return new UnreadCountResponse(notificationRepository.countByRecipientIdAndReadAtIsNull(user.getId()));
    }

    @Transactional
    public void markRead(UUID id, User user) {
        notificationRepository.markRead(id, user.getId(), Instant.now());
    }

    @Transactional
    public void markAllRead(User user) {
        notificationRepository.markAllRead(user.getId(), Instant.now());
    }

    private NotificationResponse toResponse(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getType(),
                notification.getEntityKind(),
                notification.getEntityId(),
                notification.getEntityTitle(),
                notification.getEntityLink(),
                UserSummary.from(notification.getActor()),
                notification.getReadAt() != null,
                notification.getCreatedAt());
    }
}
