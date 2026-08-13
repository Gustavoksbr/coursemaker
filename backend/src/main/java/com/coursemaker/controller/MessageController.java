package com.coursemaker.controller;

import com.coursemaker.config.AuthenticatedUser;
import com.coursemaker.dto.PageResponse;
import com.coursemaker.dto.message.MessageDtos.ConversationSummary;
import com.coursemaker.dto.message.MessageDtos.EditMessageRequest;
import com.coursemaker.dto.message.MessageDtos.MessageResponse;
import com.coursemaker.dto.message.MessageDtos.SendMessageRequest;
import com.coursemaker.dto.message.MessageDtos.UnreadCountResponse;
import com.coursemaker.service.MessageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@Tag(name = "Mensagens")
@RestController
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    @Operation(summary = "Lista as conversas do usuario autenticado, mais recente primeiro")
    @GetMapping("/api/v1/messages/conversations")
    public List<ConversationSummary> conversations(@AuthenticationPrincipal AuthenticatedUser principal) {
        return messageService.listConversations(principal.user());
    }

    @Operation(summary = "Quantidade total de mensagens nao lidas")
    @GetMapping("/api/v1/messages/unread-count")
    public UnreadCountResponse unreadCount(@AuthenticationPrincipal AuthenticatedUser principal) {
        return messageService.unreadCount(principal.user());
    }

    @Operation(summary = "Historico de mensagens com um usuario, paginado. Marca a conversa como lida")
    @GetMapping("/api/v1/messages/with/{nickname}")
    public PageResponse<MessageResponse> thread(@PathVariable String nickname,
                                                @RequestParam(defaultValue = "0") int page,
                                                @RequestParam(defaultValue = "20") int size,
                                                @AuthenticationPrincipal AuthenticatedUser principal) {
        return messageService.listThread(principal.user(), nickname, page, size);
    }

    @Operation(summary = "Envia uma mensagem para um usuario, opcionalmente respondendo outra")
    @PostMapping("/api/v1/messages/with/{nickname}")
    public ResponseEntity<MessageResponse> send(@PathVariable String nickname,
                                                @Valid @RequestBody SendMessageRequest request,
                                                @AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(messageService.send(principal.user(), nickname, request));
    }

    @Operation(summary = "Edita uma mensagem propria")
    @PatchMapping("/api/v1/messages/{id}")
    public MessageResponse edit(@PathVariable UUID id, @Valid @RequestBody EditMessageRequest request,
                                @AuthenticationPrincipal AuthenticatedUser principal) {
        return messageService.edit(id, request, principal.user());
    }

    @Operation(summary = "Exclui uma mensagem propria")
    @DeleteMapping("/api/v1/messages/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedUser principal) {
        messageService.delete(id, principal.user());
        return ResponseEntity.noContent().build();
    }
}
