package com.coursemaker.dto.notification;

import com.coursemaker.domain.enums.EntityKind;
import com.coursemaker.domain.enums.NotificationType;
import com.coursemaker.dto.user.UserSummary;

import java.time.Instant;
import java.util.UUID;

public final class NotificationDtos {

    private NotificationDtos() {
    }

    public record NotificationResponse(
            UUID id,
            NotificationType type,
            EntityKind entityKind,
            UUID entityId,
            String entityTitle,
            String entityLink,
            UserSummary actor,
            boolean read,
            Instant createdAt) {
    }

    public record UnreadCountResponse(long count) {
    }
}
