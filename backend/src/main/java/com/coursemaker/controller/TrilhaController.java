package com.coursemaker.controller;

import com.coursemaker.config.AuthenticatedUser;
import com.coursemaker.domain.enums.CourseVisibility;
import com.coursemaker.dto.PageResponse;
import com.coursemaker.dto.course.CourseDtos.SlugAvailability;
import com.coursemaker.dto.trilha.TrilhaDtos.AddTrilhaItemRequest;
import com.coursemaker.dto.trilha.TrilhaDtos.CreateTrilhaRequest;
import com.coursemaker.dto.trilha.TrilhaDtos.CreateTrilhaStepRequest;
import com.coursemaker.dto.trilha.TrilhaDtos.MoveTrilhaItemRequest;
import com.coursemaker.dto.trilha.TrilhaDtos.ReorderTrilhaItemsRequest;
import com.coursemaker.dto.trilha.TrilhaDtos.TrilhaDetail;
import com.coursemaker.dto.trilha.TrilhaDtos.TrilhaItemResponse;
import com.coursemaker.dto.trilha.TrilhaDtos.TrilhaProgressResponse;
import com.coursemaker.dto.trilha.TrilhaDtos.TrilhaStepResponse;
import com.coursemaker.dto.trilha.TrilhaDtos.TrilhaSummary;
import com.coursemaker.dto.trilha.TrilhaDtos.UpdateTrilhaItemRequest;
import com.coursemaker.dto.trilha.TrilhaDtos.UpdateTrilhaRequest;
import com.coursemaker.dto.trilha.TrilhaDtos.UpdateTrilhaStepRequest;
import com.coursemaker.service.CertificateService;
import com.coursemaker.service.TrilhaProgressService;
import com.coursemaker.service.TrilhaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@Tag(name = "Trilhas")
@RestController
@RequiredArgsConstructor
@Validated
public class TrilhaController {

    private final TrilhaService trilhaService;
    private final TrilhaProgressService trilhaProgressService;
    private final CertificateService certificateService;

    // -------------------------------------------------------------- trilhas

    @Operation(summary = "Lista trilhas com filtros, ordenacao e paginacao")
    @GetMapping("/api/v1/trilhas")
    public PageResponse<TrilhaSummary> search(
            @RequestParam(required = false) @Size(max = 200) String q,
            @RequestParam(required = false) @Size(max = 30) String author,
            @RequestParam(required = false) CourseVisibility visibility,
            @RequestParam(required = false) List<@Size(max = 50) String> category,
            @RequestParam(required = false) Boolean featured,
            @RequestParam(required = false) UUID areaId,
            @RequestParam(required = false, defaultValue = "recent") @Size(max = 20) String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @AuthenticationPrincipal AuthenticatedUser principal) {
        return trilhaService.search(q, author, visibility, category, featured, areaId, sort, page, size,
                AuthenticatedUser.userOrNull(principal));
    }

    @Operation(summary = "Verifica se um slug de trilha esta disponivel e sugere uma alternativa")
    @GetMapping("/api/v1/trilhas/slug-check")
    public SlugAvailability slugCheck(@RequestParam @NotBlank @Size(max = 255) String name,
                                      @AuthenticationPrincipal AuthenticatedUser principal) {
        return trilhaService.checkSlug(name, principal.user());
    }

    @Operation(summary = "Detalhes da trilha por id")
    @GetMapping("/api/v1/trilhas/{id}")
    public TrilhaDetail getById(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedUser principal) {
        return trilhaService.getById(id, AuthenticatedUser.userOrNull(principal));
    }

    @Operation(summary = "Detalhes da trilha pela URL publica /:nickname/:slug")
    @GetMapping("/api/v1/trilhas/by-slug/{nickname}/{slug}")
    public TrilhaDetail getBySlug(@PathVariable String nickname, @PathVariable String slug,
                                  @AuthenticationPrincipal AuthenticatedUser principal) {
        return trilhaService.getByNicknameAndSlug(nickname, slug, AuthenticatedUser.userOrNull(principal));
    }

    @Operation(summary = "Trilhas que o usuario autenticado segue, para a biblioteca")
    @GetMapping("/api/v1/trilhas/me/following")
    public List<TrilhaSummary> myFollowedTrilhas(@RequestParam(required = false) UUID areaId,
                                                 @AuthenticationPrincipal AuthenticatedUser principal) {
        return trilhaService.myFollowedTrilhas(principal.user(), areaId);
    }

    @Operation(summary = "Trilhas seguidas que o usuario autenticado ja concluiu, para a biblioteca")
    @GetMapping("/api/v1/trilhas/me/completed")
    public List<TrilhaSummary> myCompletedTrilhas(@RequestParam(required = false) UUID areaId,
                                                  @AuthenticationPrincipal AuthenticatedUser principal) {
        return trilhaService.myCompletedTrilhas(principal.user(), areaId);
    }

    @Operation(summary = "Cria uma trilha (nasce como rascunho)")
    @PostMapping("/api/v1/trilhas")
    public ResponseEntity<TrilhaSummary> create(@Valid @RequestBody CreateTrilhaRequest request,
                                                @AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(trilhaService.create(request, principal.user()));
    }

    @Operation(summary = "Atualiza a trilha (apenas o dono)")
    @PatchMapping("/api/v1/trilhas/{id}")
    public TrilhaSummary update(@PathVariable UUID id, @Valid @RequestBody UpdateTrilhaRequest request,
                                @AuthenticationPrincipal AuthenticatedUser principal) {
        return trilhaService.update(id, request, principal.user());
    }

    @Operation(summary = "Exclui a trilha (apenas o dono)")
    @DeleteMapping("/api/v1/trilhas/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedUser principal) {
        trilhaService.delete(id, principal.user());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Alterna o destaque da trilha (apenas admin)")
    @PostMapping("/api/v1/trilhas/{id}/featured")
    public TrilhaSummary toggleFeatured(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedUser principal) {
        return trilhaService.toggleFeatured(id, principal.user());
    }

    // ---------------------------------------------------------------- items

    @Operation(summary = "Adiciona um curso ou post a trilha, opcionalmente dentro de uma etapa "
            + "(apenas o dono da trilha)")
    @PostMapping("/api/v1/trilhas/{id}/items")
    public ResponseEntity<TrilhaItemResponse> addItem(@PathVariable UUID id,
                                                       @Valid @RequestBody AddTrilhaItemRequest request,
                                                       @AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(trilhaService.addItem(id, request, principal.user()));
    }

    @Operation(summary = "Reordena um item da trilha ou atualiza a nota do dono sobre ele "
            + "(apenas o dono da trilha)")
    @PatchMapping("/api/v1/trilhas/{id}/items/{itemId}")
    public TrilhaItemResponse updateItem(@PathVariable UUID id, @PathVariable UUID itemId,
                                         @Valid @RequestBody UpdateTrilhaItemRequest request,
                                         @AuthenticationPrincipal AuthenticatedUser principal) {
        return trilhaService.updateItem(id, itemId, request, principal.user());
    }

    @Operation(summary = "Move um item para outra etapa, ou tira-o de qualquer etapa "
            + "(apenas o dono da trilha)")
    @PutMapping("/api/v1/trilhas/{id}/items/{itemId}/step")
    public TrilhaItemResponse moveItem(@PathVariable UUID id, @PathVariable UUID itemId,
                                       @Valid @RequestBody MoveTrilhaItemRequest request,
                                       @AuthenticationPrincipal AuthenticatedUser principal) {
        return trilhaService.moveItem(id, itemId, request, principal.user());
    }

    @Operation(summary = "Remove um item da trilha (apenas o dono da trilha)")
    @DeleteMapping("/api/v1/trilhas/{id}/items/{itemId}")
    public ResponseEntity<Void> removeItem(@PathVariable UUID id, @PathVariable UUID itemId,
                                           @AuthenticationPrincipal AuthenticatedUser principal) {
        trilhaService.removeItem(id, itemId, principal.user());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Reordena os itens de uma etapa, ou os itens sem etapa quando stepId e "
            + "nulo (apenas o dono da trilha)")
    @PutMapping("/api/v1/trilhas/{id}/items/reorder")
    public ResponseEntity<Void> reorderItems(@PathVariable UUID id,
                                             @Valid @RequestBody ReorderTrilhaItemsRequest request,
                                             @AuthenticationPrincipal AuthenticatedUser principal) {
        trilhaService.reorderItems(id, request.stepId(), request.ids(), principal.user());
        return ResponseEntity.noContent().build();
    }

    // ---------------------------------------------------------------- steps

    @Operation(summary = "Cria uma etapa na trilha, para agrupar itens (apenas o dono da trilha)")
    @PostMapping("/api/v1/trilhas/{id}/steps")
    public ResponseEntity<TrilhaStepResponse> createStep(@PathVariable UUID id,
                                                          @Valid @RequestBody CreateTrilhaStepRequest request,
                                                          @AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(trilhaService.createStep(id, request, principal.user()));
    }

    @Operation(summary = "Atualiza titulo/descricao de uma etapa (apenas o dono da trilha)")
    @PatchMapping("/api/v1/trilhas/{id}/steps/{stepId}")
    public TrilhaStepResponse updateStep(@PathVariable UUID id, @PathVariable UUID stepId,
                                         @Valid @RequestBody UpdateTrilhaStepRequest request,
                                         @AuthenticationPrincipal AuthenticatedUser principal) {
        return trilhaService.updateStep(id, stepId, request, principal.user());
    }

    @Operation(summary = "Exclui uma etapa e os itens que estao nela (apenas o dono da trilha)")
    @DeleteMapping("/api/v1/trilhas/{id}/steps/{stepId}")
    public ResponseEntity<Void> deleteStep(@PathVariable UUID id, @PathVariable UUID stepId,
                                           @AuthenticationPrincipal AuthenticatedUser principal) {
        trilhaService.deleteStep(id, stepId, principal.user());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Reordena as etapas da trilha (apenas o dono da trilha)")
    @PutMapping("/api/v1/trilhas/{id}/steps/reorder")
    public ResponseEntity<Void> reorderSteps(@PathVariable UUID id, @RequestBody List<UUID> ids,
                                             @AuthenticationPrincipal AuthenticatedUser principal) {
        trilhaService.reorderSteps(id, ids, principal.user());
        return ResponseEntity.noContent().build();
    }

    // ---------------------------------------------------- enrollment/progress

    @Operation(summary = "Segue a trilha (matricula o usuario autenticado)")
    @PostMapping("/api/v1/trilhas/{id}/enroll")
    public ResponseEntity<Void> enroll(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedUser principal) {
        trilhaProgressService.enroll(id, principal.user());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Deixa de seguir a trilha")
    @DeleteMapping("/api/v1/trilhas/{id}/enroll")
    public ResponseEntity<Void> unenroll(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedUser principal) {
        trilhaProgressService.unenroll(id, principal.user());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Progresso do usuario autenticado na trilha")
    @GetMapping("/api/v1/trilhas/{id}/progress")
    public TrilhaProgressResponse progress(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedUser principal) {
        return trilhaProgressService.getProgress(id, principal.user());
    }

    @Operation(summary = "Marca um item da trilha como concluido. Independe do progresso interno do curso")
    @PostMapping("/api/v1/trilha-items/{itemId}/complete")
    public TrilhaProgressResponse completeItem(@PathVariable UUID itemId,
                                               @AuthenticationPrincipal AuthenticatedUser principal) {
        return trilhaProgressService.markComplete(itemId, principal.user());
    }

    @Operation(summary = "Desmarca a conclusao de um item da trilha")
    @DeleteMapping("/api/v1/trilha-items/{itemId}/complete")
    public TrilhaProgressResponse uncompleteItem(@PathVariable UUID itemId,
                                                 @AuthenticationPrincipal AuthenticatedUser principal) {
        return trilhaProgressService.markIncomplete(itemId, principal.user());
    }

    @Operation(summary = "Baixa o certificado de conclusao da trilha em PDF "
            + "(apenas para quem ja concluiu todos os itens)")
    @GetMapping("/api/v1/trilhas/{id}/certificate")
    public ResponseEntity<byte[]> downloadCertificate(@PathVariable UUID id,
                                                       @AuthenticationPrincipal AuthenticatedUser principal) {
        byte[] pdf = certificateService.generateTrilhaCertificate(id, principal.user());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"certificado.pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    // ---------------------------------------------------------- course side

    @Operation(summary = "Todas as trilhas que contem este curso, paginado (botao \"ver mais\")")
    @GetMapping("/api/v1/courses/{courseId}/trilhas")
    public PageResponse<TrilhaSummary> trilhasContainingCourse(@PathVariable UUID courseId,
                                                                @RequestParam(defaultValue = "0") int page,
                                                                @RequestParam(defaultValue = "12") int size,
                                                                @AuthenticationPrincipal AuthenticatedUser principal) {
        return trilhaService.trilhasContainingCourse(courseId, page, size, AuthenticatedUser.userOrNull(principal));
    }

    @Operation(summary = "Trilhas em destaque na pagina do curso, curadas pelo dono do curso "
            + "(cai para as mais recentes ate o dono escolher)")
    @GetMapping("/api/v1/courses/{courseId}/trilhas/highlighted")
    public List<TrilhaSummary> highlightedTrilhas(@PathVariable UUID courseId,
                                                   @AuthenticationPrincipal AuthenticatedUser principal) {
        return trilhaService.listHighlighted(courseId, AuthenticatedUser.userOrNull(principal));
    }

    @Operation(summary = "Destaca uma trilha da qual o curso participa (apenas o dono do curso)")
    @PutMapping("/api/v1/courses/{courseId}/trilhas/{trilhaId}/highlight")
    public ResponseEntity<Void> highlightTrilha(@PathVariable UUID courseId, @PathVariable UUID trilhaId,
                                                @AuthenticationPrincipal AuthenticatedUser principal) {
        trilhaService.setHighlight(courseId, trilhaId, principal.user());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Remove uma trilha do destaque da pagina do curso (apenas o dono do curso)")
    @DeleteMapping("/api/v1/courses/{courseId}/trilhas/{trilhaId}/highlight")
    public ResponseEntity<Void> unhighlightTrilha(@PathVariable UUID courseId, @PathVariable UUID trilhaId,
                                                  @AuthenticationPrincipal AuthenticatedUser principal) {
        trilhaService.removeHighlight(courseId, trilhaId, principal.user());
        return ResponseEntity.noContent().build();
    }

    // ------------------------------------------------------------ post side

    @Operation(summary = "Todas as trilhas que contem este post, paginado")
    @GetMapping("/api/v1/posts/{postId}/trilhas")
    public PageResponse<TrilhaSummary> trilhasContainingPost(@PathVariable UUID postId,
                                                              @RequestParam(defaultValue = "0") int page,
                                                              @RequestParam(defaultValue = "12") int size,
                                                              @AuthenticationPrincipal AuthenticatedUser principal) {
        return trilhaService.trilhasContainingPost(postId, page, size, AuthenticatedUser.userOrNull(principal));
    }
}
