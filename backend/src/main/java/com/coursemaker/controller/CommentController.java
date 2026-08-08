package com.coursemaker.controller;

import com.coursemaker.config.AuthenticatedUser;
import com.coursemaker.dto.comment.CommentDtos.CommentResponse;
import com.coursemaker.dto.comment.CommentDtos.CreateCommentRequest;
import com.coursemaker.service.CommentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@Tag(name = "Comentarios")
@RestController
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @Operation(summary = "Lista os comentarios do curso, ja aninhados em threads")
    @GetMapping("/api/v1/courses/{courseId}/comments")
    public List<CommentResponse> list(@PathVariable UUID courseId,
                                      @AuthenticationPrincipal AuthenticatedUser principal) {
        return commentService.list(courseId, AuthenticatedUser.userOrNull(principal));
    }

    @Operation(summary = "Publica um comentario ou uma resposta")
    @PostMapping("/api/v1/courses/{courseId}/comments")
    public ResponseEntity<CommentResponse> create(@PathVariable UUID courseId,
                                                  @Valid @RequestBody CreateCommentRequest request,
                                                  @AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(commentService.create(courseId, request, principal.user()));
    }

    @Operation(summary = "Exclui um comentario (autor, dono do curso ou admin)")
    @DeleteMapping("/api/v1/comments/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id,
                                       @AuthenticationPrincipal AuthenticatedUser principal) {
        commentService.delete(id, principal.user());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Impede um usuario de comentar no curso (apenas o dono)")
    @PostMapping("/api/v1/courses/{courseId}/bans/{userId}")
    public ResponseEntity<Void> ban(@PathVariable UUID courseId, @PathVariable UUID userId,
                                    @AuthenticationPrincipal AuthenticatedUser principal) {
        commentService.ban(courseId, userId, principal.user());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Remove o banimento (apenas o dono)")
    @DeleteMapping("/api/v1/courses/{courseId}/bans/{userId}")
    public ResponseEntity<Void> unban(@PathVariable UUID courseId, @PathVariable UUID userId,
                                      @AuthenticationPrincipal AuthenticatedUser principal) {
        commentService.unban(courseId, userId, principal.user());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Lista os usuarios banidos do curso (apenas o dono)")
    @GetMapping("/api/v1/courses/{courseId}/bans")
    public List<UUID> bans(@PathVariable UUID courseId,
                           @AuthenticationPrincipal AuthenticatedUser principal) {
        return commentService.listBans(courseId, principal.user());
    }
}
