package com.coursemaker.controller;

import com.coursemaker.config.AuthenticatedUser;
import com.coursemaker.dto.PageResponse;
import com.coursemaker.dto.notification.NotificationDtos.NotificationResponse;
import com.coursemaker.dto.notification.NotificationDtos.UnreadCountResponse;
import com.coursemaker.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@Tag(name = "Notificacoes")
@RestController
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @Operation(summary = "Lista as notificacoes do usuario autenticado, paginado, mais recentes primeiro")
    @GetMapping("/api/v1/notifications")
    public PageResponse<NotificationResponse> list(@RequestParam(defaultValue = "0") int page,
                                                    @RequestParam(defaultValue = "20") int size,
                                                    @AuthenticationPrincipal AuthenticatedUser principal) {
        return notificationService.list(principal.user(), page, size);
    }

    @Operation(summary = "Quantidade de notificacoes nao lidas")
    @GetMapping("/api/v1/notifications/unread-count")
    public UnreadCountResponse unreadCount(@AuthenticationPrincipal AuthenticatedUser principal) {
        return notificationService.unreadCount(principal.user());
    }

    @Operation(summary = "Marca uma notificacao como lida")
    @PostMapping("/api/v1/notifications/{id}/read")
    public ResponseEntity<Void> markRead(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedUser principal) {
        notificationService.markRead(id, principal.user());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Marca todas as notificacoes do usuario como lidas")
    @PostMapping("/api/v1/notifications/read-all")
    public ResponseEntity<Void> markAllRead(@AuthenticationPrincipal AuthenticatedUser principal) {
        notificationService.markAllRead(principal.user());
        return ResponseEntity.noContent().build();
    }
}
