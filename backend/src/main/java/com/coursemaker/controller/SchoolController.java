package com.coursemaker.controller;

import com.coursemaker.config.AuthenticatedUser;
import com.coursemaker.dto.school.SchoolDtos.CreateSchoolRequest;
import com.coursemaker.dto.school.SchoolDtos.SchoolSummary;
import com.coursemaker.dto.school.SchoolDtos.SchoolWithMembers;
import com.coursemaker.dto.school.SchoolDtos.UpdateSchoolRequest;
import com.coursemaker.service.SchoolService;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@Tag(name = "Escolas")
@RestController
@RequestMapping("/api/v1/schools")
@RequiredArgsConstructor
public class SchoolController {

    private final SchoolService schoolService;

    @Operation(summary = "Lista todas as escolas, em ordem alfabetica")
    @GetMapping
    public List<SchoolSummary> list() {
        return schoolService.list();
    }

    @Operation(summary = "Detalhes de uma escola pelo slug (pagina publica /escolas/:slug)")
    @GetMapping("/{slug}")
    public SchoolSummary getBySlug(@PathVariable String slug) {
        return schoolService.getBySlug(slug);
    }

    @Operation(summary = "Escola com a lista de membros autorizados a publicar por ela (apenas admin)")
    @GetMapping("/{id}/members")
    public SchoolWithMembers getWithMembers(@PathVariable UUID id,
                                            @AuthenticationPrincipal AuthenticatedUser principal) {
        return schoolService.getWithMembers(id, principal.user());
    }

    @Operation(summary = "Cria uma escola (apenas admin)")
    @PostMapping
    public ResponseEntity<SchoolSummary> create(@Valid @RequestBody CreateSchoolRequest request,
                                                @AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(schoolService.create(request, principal.user()));
    }

    @Operation(summary = "Atualiza uma escola (apenas admin)")
    @PatchMapping("/{id}")
    public SchoolSummary update(@PathVariable UUID id, @Valid @RequestBody UpdateSchoolRequest request,
                                @AuthenticationPrincipal AuthenticatedUser principal) {
        return schoolService.update(id, request, principal.user());
    }

    @Operation(summary = "Alterna o destaque da escola na home (apenas admin)")
    @PostMapping("/{id}/featured")
    public SchoolSummary toggleFeaturedOnHome(@PathVariable UUID id,
                                              @AuthenticationPrincipal AuthenticatedUser principal) {
        return schoolService.toggleFeaturedOnHome(id, principal.user());
    }

    @Operation(summary = "Exclui uma escola; o conteudo associado perde a atribuicao mas continua existindo (apenas admin)")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedUser principal) {
        schoolService.delete(id, principal.user());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Concede a um usuario permissao para publicar conteudo desta escola (apenas admin)")
    @PutMapping("/{id}/members/{userId}")
    public ResponseEntity<Void> grantMembership(@PathVariable UUID id, @PathVariable UUID userId,
                                                @AuthenticationPrincipal AuthenticatedUser principal) {
        schoolService.grantMembership(id, userId, principal.user());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Revoga a permissao de um usuario de publicar conteudo desta escola (apenas admin)")
    @DeleteMapping("/{id}/members/{userId}")
    public ResponseEntity<Void> revokeMembership(@PathVariable UUID id, @PathVariable UUID userId,
                                                 @AuthenticationPrincipal AuthenticatedUser principal) {
        schoolService.revokeMembership(id, userId, principal.user());
        return ResponseEntity.noContent().build();
    }
}
