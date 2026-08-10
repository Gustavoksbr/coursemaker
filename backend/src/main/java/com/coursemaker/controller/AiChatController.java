package com.coursemaker.controller;

import com.coursemaker.config.AuthenticatedUser;
import com.coursemaker.dto.ai.AiChatDtos.ChatRequest;
import com.coursemaker.dto.ai.AiChatDtos.ChatResponse;
import com.coursemaker.service.AiChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@Tag(name = "Assistente de IA")
@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AiChatController {

    private final AiChatService aiChatService;

    @Operation(summary = "Conversa com o assistente sobre o conteudo de um curso")
    @PostMapping("/courses/{courseId}/chat")
    public ChatResponse chatAboutCourse(@PathVariable UUID courseId,
                                        @Valid @RequestBody ChatRequest request,
                                        @AuthenticationPrincipal AuthenticatedUser principal) {
        return aiChatService.chatAboutCourse(courseId, request, principal.user());
    }

    @Operation(summary = "Conversa com o assistente sobre o conteudo de um post")
    @PostMapping("/posts/{postId}/chat")
    public ChatResponse chatAboutPost(@PathVariable UUID postId,
                                      @Valid @RequestBody ChatRequest request,
                                      @AuthenticationPrincipal AuthenticatedUser principal) {
        return aiChatService.chatAboutPost(postId, request, principal.user());
    }
}
