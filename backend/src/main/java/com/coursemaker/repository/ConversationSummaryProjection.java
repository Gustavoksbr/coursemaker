package com.coursemaker.repository;

import java.time.Instant;
import java.util.UUID;

/** One row per conversation partner, from {@link MessageRepository#conversationSummaries}. */
public interface ConversationSummaryProjection {
    UUID getPartnerId();
    String getPartnerNickname();
    String getPartnerName();
    String getPartnerImage();
    UUID getLastMessageId();
    String getLastContent();
    Instant getLastDeletedAt();
    UUID getLastSenderId();
    Instant getLastCreatedAt();
    Instant getLastEditedAt();
    long getUnreadCount();
}
