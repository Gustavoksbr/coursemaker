package com.coursemaker.service;

import com.coursemaker.domain.entity.Message;
import com.coursemaker.domain.entity.User;
import com.coursemaker.domain.enums.BlockType;
import com.coursemaker.dto.PageResponse;
import com.coursemaker.dto.message.MessageDtos.ConversationSummary;
import com.coursemaker.dto.message.MessageDtos.EditMessageRequest;
import com.coursemaker.dto.message.MessageDtos.MessageEvent;
import com.coursemaker.dto.message.MessageDtos.MessageEventType;
import com.coursemaker.dto.message.MessageDtos.MessageParentPreview;
import com.coursemaker.dto.message.MessageDtos.MessageResponse;
import com.coursemaker.dto.message.MessageDtos.SendMessageRequest;
import com.coursemaker.dto.message.MessageDtos.UnreadCountResponse;
import com.coursemaker.dto.user.UserSummary;
import com.coursemaker.exception.ApiExceptions.BadRequestException;
import com.coursemaker.exception.ApiExceptions.ForbiddenException;
import com.coursemaker.exception.ApiExceptions.ResourceNotFoundException;
import com.coursemaker.repository.ConversationSummaryProjection;
import com.coursemaker.repository.MessageRepository;
import com.coursemaker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * 1:1 direct messages between users. Deliberately soft-deletes ({@code deletedAt}) rather than
 * hard-deleting like {@link CommentService}: a later message can quote-reply to an earlier one, and
 * the deleted row still needs to resolve to a "mensagem apagada" placeholder in that preview.
 */
@Service
@RequiredArgsConstructor
public class MessageService {

    private static final int MAX_PAGE_SIZE = 50;
    private static final int PREVIEW_LENGTH = 140;

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final HtmlSanitizer htmlSanitizer;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public MessageResponse send(User sender, String recipientNickname, SendMessageRequest request) {
        User recipient = userRepository.findByNicknameIgnoreCase(recipientNickname)
                .orElseThrow(() -> ResourceNotFoundException.of("Usuario"));
        if (recipient.getId().equals(sender.getId())) {
            throw new BadRequestException("Voce nao pode enviar mensagem para si mesmo");
        }

        Message parent = null;
        if (request.parentId() != null) {
            parent = messageRepository.findByIdWithParties(request.parentId())
                    .orElseThrow(() -> ResourceNotFoundException.of("Mensagem"));
            if (!belongsToPair(parent, sender.getId(), recipient.getId())) {
                throw new BadRequestException("A mensagem respondida pertence a outra conversa");
            }
        }

        // saveAndFlush, not save: @CreationTimestamp is only populated once Hibernate actually
        // prepares the INSERT, which a bare save() defers to the transaction's eventual commit -
        // the in-memory `saved` object would still show createdAt as null right below otherwise.
        Message saved = messageRepository.saveAndFlush(Message.builder()
                .sender(sender)
                .recipient(recipient)
                .parent(parent)
                .content(htmlSanitizer.sanitize(BlockType.TEXT, request.content()))
                .build());

        push(MessageEventType.NEW_MESSAGE, saved, recipient);
        return toResponse(saved, sender);
    }

    @Transactional
    public MessageResponse edit(UUID id, EditMessageRequest request, User viewer) {
        Message message = messageRepository.findByIdWithParties(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Mensagem"));
        if (message.getDeletedAt() != null) {
            throw new BadRequestException("Mensagem apagada nao pode ser editada");
        }
        if (!message.getSender().getId().equals(viewer.getId())) {
            throw new ForbiddenException("Voce so pode editar suas proprias mensagens");
        }

        message.setContent(htmlSanitizer.sanitize(BlockType.TEXT, request.content()));
        message.setEditedAt(Instant.now());
        Message saved = messageRepository.save(message);

        push(MessageEventType.MESSAGE_EDITED, saved, message.getRecipient());
        return toResponse(saved, viewer);
    }

    @Transactional
    public void delete(UUID id, User viewer) {
        Message message = messageRepository.findByIdWithParties(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Mensagem"));
        if (message.getDeletedAt() != null) {
            return;
        }
        if (!message.getSender().getId().equals(viewer.getId())) {
            throw new ForbiddenException("Voce so pode excluir suas proprias mensagens");
        }

        message.setDeletedAt(Instant.now());
        Message saved = messageRepository.save(message);

        push(MessageEventType.MESSAGE_DELETED, saved, message.getRecipient());
    }

    @Transactional(readOnly = true)
    public List<ConversationSummary> listConversations(User viewer) {
        return messageRepository.conversationSummaries(viewer.getId()).stream()
                .map(row -> new ConversationSummary(
                        new UserSummary(row.getPartnerId(), row.getPartnerNickname(), row.getPartnerName(),
                                row.getPartnerImage()),
                        row.getLastMessageId(),
                        row.getLastDeletedAt() != null ? null : preview(row.getLastContent()),
                        row.getLastDeletedAt() != null,
                        row.getLastSenderId().equals(viewer.getId()),
                        row.getLastCreatedAt(),
                        row.getLastEditedAt() != null,
                        row.getUnreadCount()))
                .toList();
    }

    @Transactional
    public PageResponse<MessageResponse> listThread(User viewer, String partnerNickname, int page, int size) {
        User partner = userRepository.findByNicknameIgnoreCase(partnerNickname)
                .orElseThrow(() -> ResourceNotFoundException.of("Usuario"));

        Page<Message> result = messageRepository.findThread(viewer.getId(), partner.getId(),
                PageRequest.of(Math.max(0, page), Math.clamp(size, 1, MAX_PAGE_SIZE)));

        // Opening a thread is reading it - unlike a multi-sender notification feed, there is no
        // scenario where viewing the full thread should leave part of it unread.
        messageRepository.markThreadRead(viewer.getId(), partner.getId(), Instant.now());

        return PageResponse.of(result, result.getContent().stream()
                .map(message -> toResponse(message, viewer))
                .toList());
    }

    @Transactional(readOnly = true)
    public UnreadCountResponse unreadCount(User viewer) {
        return new UnreadCountResponse(
                messageRepository.countByRecipientIdAndReadAtIsNullAndDeletedAtIsNull(viewer.getId()));
    }

    // ---------------------------------------------------------------- helpers

    private boolean belongsToPair(Message message, UUID userId, UUID otherId) {
        UUID a = message.getSender().getId();
        UUID b = message.getRecipient().getId();
        return (a.equals(userId) && b.equals(otherId)) || (a.equals(otherId) && b.equals(userId));
    }

    private void push(MessageEventType type, Message message, User recipient) {
        MessageEvent event = new MessageEvent(type, toResponse(message, recipient));
        messagingTemplate.convertAndSendToUser(recipient.getId().toString(), "/queue/messages", event);
    }

    private String preview(String content) {
        if (content == null) {
            return null;
        }
        String stripped = content.replaceAll("<[^>]*>", " ").trim();
        return stripped.length() > PREVIEW_LENGTH ? stripped.substring(0, PREVIEW_LENGTH) + "..." : stripped;
    }

    private MessageResponse toResponse(Message message, User viewer) {
        boolean deleted = message.getDeletedAt() != null;
        boolean isSender = message.getSender().getId().equals(viewer.getId());

        MessageParentPreview parentPreview = null;
        Message parent = message.getParent();
        if (parent != null) {
            boolean parentDeleted = parent.getDeletedAt() != null;
            parentPreview = new MessageParentPreview(
                    parent.getId(),
                    parent.getSender().getName(),
                    parentDeleted ? null : parent.getContent(),
                    parentDeleted);
        }

        return new MessageResponse(
                message.getId(),
                UserSummary.from(message.getSender()),
                message.getRecipient().getId(),
                deleted ? null : message.getContent(),
                deleted,
                message.getEditedAt() != null,
                message.getEditedAt(),
                message.getCreatedAt(),
                message.getReadAt() != null,
                !deleted && isSender,
                !deleted && isSender,
                parentPreview);
    }
}
