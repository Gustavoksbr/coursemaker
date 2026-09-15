package com.coursemaker.controller;

import com.coursemaker.config.AuthenticatedUser;
import com.coursemaker.dto.curriculum.CurriculumDtos.AnswerBlockRequest;
import com.coursemaker.dto.curriculum.CurriculumDtos.AnswerBlockResponse;
import com.coursemaker.dto.curriculum.CurriculumDtos.BlockResponse;
import com.coursemaker.dto.curriculum.CurriculumDtos.CreateBlockRequest;
import com.coursemaker.dto.curriculum.CurriculumDtos.CreateLessonRequest;
import com.coursemaker.dto.curriculum.CurriculumDtos.LessonResponse;
import com.coursemaker.dto.curriculum.CurriculumDtos.ReorderRequest;
import com.coursemaker.dto.curriculum.CurriculumDtos.UpdateBlockRequest;
import com.coursemaker.dto.curriculum.CurriculumDtos.UpdateLessonRequest;
import com.coursemaker.service.LessonBlockService;
import com.coursemaker.service.LessonService;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@Tag(name = "Licoes e blocos")
@RestController
@RequiredArgsConstructor
public class LessonController {

    private final LessonService lessonService;
    private final LessonBlockService blockService;

    // ----------------------------------------------------------------- lessons

    @Operation(summary = "Lista as licoes de um modulo")
    @GetMapping("/api/v1/modules/{moduleId}/lessons")
    public List<LessonResponse> list(@PathVariable UUID moduleId,
                                     @AuthenticationPrincipal AuthenticatedUser principal) {
        return lessonService.list(moduleId, AuthenticatedUser.userOrNull(principal));
    }

    @Operation(summary = "Cria uma licao no fim do modulo (apenas o dono)")
    @PostMapping("/api/v1/modules/{moduleId}/lessons")
    public ResponseEntity<LessonResponse> create(@PathVariable UUID moduleId,
                                                 @Valid @RequestBody CreateLessonRequest request,
                                                 @AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(lessonService.create(moduleId, request, principal.user()));
    }

    @Operation(summary = "Atualiza o titulo da licao (apenas o dono)")
    @PatchMapping("/api/v1/lessons/{id}")
    public LessonResponse update(@PathVariable UUID id,
                                 @Valid @RequestBody UpdateLessonRequest request,
                                 @AuthenticationPrincipal AuthenticatedUser principal) {
        return lessonService.update(id, request, principal.user());
    }

    @Operation(summary = "Exclui a licao (apenas o dono)")
    @DeleteMapping("/api/v1/lessons/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id,
                                       @AuthenticationPrincipal AuthenticatedUser principal) {
        lessonService.delete(id, principal.user());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Reordena as licoes do modulo (apenas o dono)")
    @PutMapping("/api/v1/modules/{moduleId}/lessons/reorder")
    public List<LessonResponse> reorder(@PathVariable UUID moduleId,
                                        @Valid @RequestBody ReorderRequest request,
                                        @AuthenticationPrincipal AuthenticatedUser principal) {
        return lessonService.reorder(moduleId, request.ids(), principal.user());
    }

    // ------------------------------------------------------------------ blocks

    @Operation(summary = "Lista os blocos de conteudo da licao")
    @GetMapping("/api/v1/lessons/{lessonId}/blocks")
    public List<BlockResponse> listBlocks(@PathVariable UUID lessonId,
                                          @AuthenticationPrincipal AuthenticatedUser principal) {
        return blockService.list(lessonId, AuthenticatedUser.userOrNull(principal));
    }

    @Operation(summary = "Adiciona um bloco no fim da licao (apenas o dono)")
    @PostMapping("/api/v1/lessons/{lessonId}/blocks")
    public ResponseEntity<BlockResponse> createBlock(@PathVariable UUID lessonId,
                                                     @Valid @RequestBody CreateBlockRequest request,
                                                     @AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(blockService.create(lessonId, request, principal.user()));
    }

    @Operation(summary = "Atualiza um bloco (apenas o dono)")
    @PatchMapping("/api/v1/blocks/{id}")
    public BlockResponse updateBlock(@PathVariable UUID id,
                                     @Valid @RequestBody UpdateBlockRequest request,
                                     @AuthenticationPrincipal AuthenticatedUser principal) {
        return blockService.update(id, request, principal.user());
    }

    @Operation(summary = "Exclui um bloco (apenas o dono)")
    @DeleteMapping("/api/v1/blocks/{id}")
    public ResponseEntity<Void> deleteBlock(@PathVariable UUID id,
                                            @AuthenticationPrincipal AuthenticatedUser principal) {
        blockService.delete(id, principal.user());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Reordena os blocos da licao (apenas o dono)")
    @PutMapping("/api/v1/lessons/{lessonId}/blocks/reorder")
    public List<BlockResponse> reorderBlocks(@PathVariable UUID lessonId,
                                             @Valid @RequestBody ReorderRequest request,
                                             @AuthenticationPrincipal AuthenticatedUser principal) {
        return blockService.reorder(lessonId, request.ids(), principal.user());
    }

    @Operation(summary = "Registra a alternativa escolhida em um bloco de questao")
    @PostMapping("/api/v1/blocks/{id}/answer")
    public AnswerBlockResponse answer(@PathVariable UUID id,
                                      @Valid @RequestBody AnswerBlockRequest request,
                                      @AuthenticationPrincipal AuthenticatedUser principal) {
        return blockService.answer(id, request, principal.user());
    }
}
