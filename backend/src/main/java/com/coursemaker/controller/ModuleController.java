package com.coursemaker.controller;

import com.coursemaker.config.AuthenticatedUser;
import com.coursemaker.dto.curriculum.CurriculumDtos.CreateModuleRequest;
import com.coursemaker.dto.curriculum.CurriculumDtos.ModuleResponse;
import com.coursemaker.dto.curriculum.CurriculumDtos.ReorderRequest;
import com.coursemaker.dto.curriculum.CurriculumDtos.UpdateModuleRequest;
import com.coursemaker.service.ModuleService;
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

@Tag(name = "Modulos")
@RestController
@RequiredArgsConstructor
public class ModuleController {

    private final ModuleService moduleService;

    @Operation(summary = "Lista os modulos do curso com suas licoes")
    @GetMapping("/api/v1/courses/{courseId}/modules")
    public List<ModuleResponse> list(@PathVariable UUID courseId,
                                     @AuthenticationPrincipal AuthenticatedUser principal) {
        return moduleService.list(courseId, AuthenticatedUser.userOrNull(principal));
    }

    @Operation(summary = "Cria um modulo no fim do curriculo (apenas o dono)")
    @PostMapping("/api/v1/courses/{courseId}/modules")
    public ResponseEntity<ModuleResponse> create(@PathVariable UUID courseId,
                                                 @Valid @RequestBody CreateModuleRequest request,
                                                 @AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(moduleService.create(courseId, request, principal.user()));
    }

    @Operation(summary = "Atualiza titulo/descricao do modulo (apenas o dono)")
    @PatchMapping("/api/v1/modules/{id}")
    public ModuleResponse update(@PathVariable UUID id,
                                 @Valid @RequestBody UpdateModuleRequest request,
                                 @AuthenticationPrincipal AuthenticatedUser principal) {
        return moduleService.update(id, request, principal.user());
    }

    @Operation(summary = "Exclui o modulo e suas licoes (apenas o dono)")
    @DeleteMapping("/api/v1/modules/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id,
                                       @AuthenticationPrincipal AuthenticatedUser principal) {
        moduleService.delete(id, principal.user());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Reordena os modulos do curso (apenas o dono)")
    @PutMapping("/api/v1/courses/{courseId}/modules/reorder")
    public List<ModuleResponse> reorder(@PathVariable UUID courseId,
                                        @Valid @RequestBody ReorderRequest request,
                                        @AuthenticationPrincipal AuthenticatedUser principal) {
        return moduleService.reorder(courseId, request.ids(), principal.user());
    }
}
