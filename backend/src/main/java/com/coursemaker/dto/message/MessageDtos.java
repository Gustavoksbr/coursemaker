package com.coursemaker.dto.message;

import com.coursemaker.dto.user.UserSummary;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public final class MessageDtos {

    private MessageDtos() {
    }

    public record SendMessageRequest(
            @NotBlank @Size(max = 5000) String content,
            UUID parentId) {
    }

    public record EditMessageRequest(
            @NotBlank @Size(max = 5000) String content) {
    }

    /** Quoted-reply preview embedded in a message, so the client never needs a second fetch. */
    public record MessageParentPreview(
            UUID id,
            String senderName,
            String content,
            boolean deleted) {
    }

    public record MessageResponse(
            UUID id,
            UserSummary sender,
            UUID recipientId,
            String content,
            boolean deleted,
            boolean edited,
            Instant editedAt,
            Instant createdAt,
            boolean read,
            boolean canEdit,
            boolean canDelete,
            MessageParentPreview parent) {
    }

    public record ConversationSummary(
            UserSummary partner,
            UUID lastMessageId,
            String lastMessagePreview,
            boolean lastMessageDeleted,
            boolean lastMessageMine,
            Instant lastMessageAt,
            boolean lastMessageEdited,
            long unreadCount) {
    }

    public record UnreadCountResponse(long count) {
    }

    /** WebSocket envelope pushed to {@code /queue/messages}: one destination, three event kinds. */
    public record MessageEvent(MessageEventType type, MessageResponse message) {
    }

    public enum MessageEventType {
        NEW_MESSAGE,
        MESSAGE_EDITED,
        MESSAGE_DELETED
    }
}
