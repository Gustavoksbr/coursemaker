package com.coursemaker.controller;

import com.coursemaker.config.AuthenticatedUser;
import com.coursemaker.domain.enums.CourseVisibility;
import com.coursemaker.dto.PageResponse;
import com.coursemaker.dto.course.CourseDtos.CourseDetail;
import com.coursemaker.dto.course.CourseDtos.CourseSummary;
import com.coursemaker.dto.course.CourseDtos.CreateCourseRequest;
import com.coursemaker.dto.course.CourseDtos.SlugAvailability;
import com.coursemaker.dto.course.CourseDtos.UpdateCourseRequest;
import com.coursemaker.service.CertificateService;
import com.coursemaker.service.CourseService;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@Tag(name = "Cursos")
@RestController
@RequestMapping("/api/v1/courses")
@RequiredArgsConstructor
@Validated
public class CourseController {

    private final CourseService courseService;
    private final CertificateService certificateService;

    @Operation(summary = "Lista cursos com filtros, ordenacao e paginacao. "
            + "Repita category=... para filtrar por varias categorias (OR)")
    @GetMapping
    public PageResponse<CourseSummary> search(
            @RequestParam(required = false) @Size(max = 200) String q,
            @RequestParam(required = false) @Size(max = 30) String author,
            @RequestParam(required = false) CourseVisibility visibility,
            @RequestParam(required = false) List<@Size(max = 50) String> category,
            @RequestParam(required = false) Boolean featured,
            @RequestParam(name = "area", required = false) List<UUID> areaIds,
            @RequestParam(name = "school", required = false) UUID schoolId,
            @RequestParam(required = false, defaultValue = "recent") @Size(max = 20) String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @AuthenticationPrincipal AuthenticatedUser principal) {
        return courseService.search(q, author, visibility, category, featured, areaIds, schoolId, sort, page, size,
                AuthenticatedUser.userOrNull(principal));
    }

    @Operation(summary = "Verifica se um slug esta disponivel e sugere uma alternativa")
    @GetMapping("/slug-check")
    public SlugAvailability slugCheck(@RequestParam @NotBlank @Size(max = 255) String name,
                                      @AuthenticationPrincipal AuthenticatedUser principal) {
        return courseService.checkSlug(name, principal.user());
    }

    @Operation(summary = "Detalhes do curso por id")
    @GetMapping("/{id}")
    public CourseDetail getById(@PathVariable UUID id,
                                @AuthenticationPrincipal AuthenticatedUser principal) {
        return courseService.getById(id, AuthenticatedUser.userOrNull(principal));
    }

    @Operation(summary = "Detalhes do curso pela URL publica /:nickname/:slug")
    @GetMapping("/by-slug/{nickname}/{slug}")
    public CourseDetail getBySlug(@PathVariable String nickname, @PathVariable String slug,
                                  @AuthenticationPrincipal AuthenticatedUser principal) {
        return courseService.getByNicknameAndSlug(nickname, slug, AuthenticatedUser.userOrNull(principal));
    }

    @Operation(summary = "Cria um curso (nasce como rascunho)")
    @PostMapping
    public ResponseEntity<CourseSummary> create(@Valid @RequestBody CreateCourseRequest request,
                                                @AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(courseService.create(request, principal.user()));
    }

    @Operation(summary = "Atualiza o curso (apenas o dono)")
    @PatchMapping("/{id}")
    public CourseSummary update(@PathVariable UUID id,
                                @Valid @RequestBody UpdateCourseRequest request,
                                @AuthenticationPrincipal AuthenticatedUser principal) {
        return courseService.update(id, request, principal.user());
    }

    @Operation(summary = "Exclui o curso e todo o seu conteudo (apenas o dono)")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id,
                                       @AuthenticationPrincipal AuthenticatedUser principal) {
        courseService.delete(id, principal.user());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Alterna o destaque do curso (apenas admin)")
    @PostMapping("/{id}/featured")
    public CourseSummary toggleFeatured(@PathVariable UUID id,
                                        @AuthenticationPrincipal AuthenticatedUser principal) {
        return courseService.toggleFeatured(id, principal.user());
    }

    @Operation(summary = "Bloqueia ou desbloqueia o curso (apenas admin)")
    @PostMapping("/{id}/toggle-block")
    public CourseSummary toggleBlock(@PathVariable UUID id,
                                     @AuthenticationPrincipal AuthenticatedUser principal) {
        return courseService.toggleBlock(id, principal.user());
    }

    @Operation(summary = "Baixa o certificado de conclusao do curso em PDF "
            + "(apenas para quem ja concluiu todas as licoes)")
    @GetMapping("/{id}/certificate")
    public ResponseEntity<byte[]> downloadCertificate(@PathVariable UUID id,
                                                       @AuthenticationPrincipal AuthenticatedUser principal) {
        byte[] pdf = certificateService.generateCourseCertificate(id, principal.user());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"certificado.pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    @Operation(summary = "Previa do certificado em PNG, para exibir antes de baixar "
            + "(mesma regra de elegibilidade do download em PDF)")
    @GetMapping("/{id}/certificate/preview")
    public ResponseEntity<byte[]> previewCertificate(@PathVariable UUID id,
                                                      @AuthenticationPrincipal AuthenticatedUser principal) {
        byte[] png = certificateService.generateCourseCertificatePreview(id, principal.user());
        return ResponseEntity.ok().contentType(MediaType.IMAGE_PNG).body(png);
    }
}
