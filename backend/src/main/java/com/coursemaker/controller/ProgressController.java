package com.coursemaker.controller;

import com.coursemaker.config.AuthenticatedUser;
import com.coursemaker.dto.course.CourseDtos.ProgressResponse;
import com.coursemaker.service.ProgressService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@Tag(name = "Progresso")
@RestController
@RequiredArgsConstructor
public class ProgressController {

    private final ProgressService progressService;

    @Operation(summary = "Marca a licao como concluida")
    @PostMapping("/api/v1/lessons/{id}/complete")
    public ProgressResponse complete(@PathVariable UUID id,
                                     @AuthenticationPrincipal AuthenticatedUser principal) {
        return progressService.markComplete(id, principal.user());
    }

    @Operation(summary = "Desmarca a conclusao da licao")
    @DeleteMapping("/api/v1/lessons/{id}/complete")
    public ProgressResponse uncomplete(@PathVariable UUID id,
                                       @AuthenticationPrincipal AuthenticatedUser principal) {
        return progressService.markIncomplete(id, principal.user());
    }

    @Operation(summary = "Progresso do usuario autenticado no curso")
    @GetMapping("/api/v1/courses/{id}/progress")
    public ProgressResponse progress(@PathVariable UUID id,
                                     @AuthenticationPrincipal AuthenticatedUser principal) {
        return progressService.getProgress(id, principal.user());
    }
}
