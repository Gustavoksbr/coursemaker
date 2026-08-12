package com.coursemaker.controller;

import com.coursemaker.config.AuthenticatedUser;
import com.coursemaker.domain.enums.CourseVisibility;
import com.coursemaker.dto.PageResponse;
import com.coursemaker.dto.course.CourseDtos.SlugAvailability;
import com.coursemaker.dto.curriculum.CurriculumDtos.BlockResponse;
import com.coursemaker.dto.curriculum.CurriculumDtos.CreateBlockRequest;
import com.coursemaker.dto.curriculum.CurriculumDtos.ReorderRequest;
import com.coursemaker.dto.curriculum.CurriculumDtos.UpdateBlockRequest;
import com.coursemaker.dto.post.PostDtos.CreatePostRequest;
import com.coursemaker.dto.post.PostDtos.PostDetail;
import com.coursemaker.dto.post.PostDtos.PostSummary;
import com.coursemaker.dto.post.PostDtos.PrivateAccessResponse;
import com.coursemaker.dto.post.PostDtos.UpdatePostRequest;
import com.coursemaker.dto.post.PostDtos.ValidatePostAccessRequest;
import com.coursemaker.service.PostBlockService;
import com.coursemaker.service.PostService;
import com.coursemaker.service.PrivatePostAccessService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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

@Tag(name = "Posts")
@RestController
@RequiredArgsConstructor
@Validated
public class PostController {

    private final PostService postService;
    private final PostBlockService blockService;
    private final PrivatePostAccessService privateAccessService;

    @Operation(summary = "Lista posts com filtros, ordenacao e paginacao. "
            + "Repita category=... para filtrar por varias categorias (OR)")
    @GetMapping("/api/v1/posts")
    public PageResponse<PostSummary> search(
            @RequestParam(required = false) @Size(max = 200) String q,
            @RequestParam(required = false) @Size(max = 30) String author,
            @RequestParam(required = false) CourseVisibility visibility,
            @RequestParam(required = false) List<@Size(max = 50) String> category,
            @RequestParam(required = false) Boolean featured,
            @RequestParam(required = false, defaultValue = "recent") @Size(max = 20) String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @AuthenticationPrincipal AuthenticatedUser principal) {
        return postService.search(q, author, visibility, category, featured, sort, page, size,
                AuthenticatedUser.userOrNull(principal));
    }

    @Operation(summary = "Verifica se um slug de post esta disponivel")
    @GetMapping("/api/v1/posts/slug-check")
    public SlugAvailability slugCheck(@RequestParam @NotBlank @Size(max = 255) String title,
                                      @AuthenticationPrincipal AuthenticatedUser principal) {
        return postService.checkSlug(title, principal.user());
    }

    @Operation(summary = "Detalhes do post por id, com os blocos de conteudo")
    @GetMapping("/api/v1/posts/{id}")
    public PostDetail getById(@PathVariable UUID id,
                              @AuthenticationPrincipal AuthenticatedUser principal) {
        return postService.getById(id, AuthenticatedUser.userOrNull(principal));
    }

    @Operation(summary = "Detalhes do post pela URL publica /:nickname/:slug")
    @GetMapping("/api/v1/posts/by-slug/{nickname}/{slug}")
    public PostDetail getBySlug(@PathVariable String nickname, @PathVariable String slug,
                                @AuthenticationPrincipal AuthenticatedUser principal) {
        return postService.getByNicknameAndSlug(nickname, slug, AuthenticatedUser.userOrNull(principal));
    }

    @Operation(summary = "Cria um post (nasce como rascunho)")
    @PostMapping("/api/v1/posts")
    public ResponseEntity<PostSummary> create(@Valid @RequestBody CreatePostRequest request,
                                              @AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(postService.create(request, principal.user()));
    }

    @Operation(summary = "Atualiza o post (apenas o dono)")
    @PatchMapping("/api/v1/posts/{id}")
    public PostSummary update(@PathVariable UUID id, @Valid @RequestBody UpdatePostRequest request,
                              @AuthenticationPrincipal AuthenticatedUser principal) {
        return postService.update(id, request, principal.user());
    }

    @Operation(summary = "Exclui o post e seus blocos (apenas o dono)")
    @DeleteMapping("/api/v1/posts/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id,
                                       @AuthenticationPrincipal AuthenticatedUser principal) {
        postService.delete(id, principal.user());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Alterna o destaque do post (apenas admin)")
    @PostMapping("/api/v1/posts/{id}/featured")
    public PostSummary toggleFeatured(@PathVariable UUID id,
                                      @AuthenticationPrincipal AuthenticatedUser principal) {
        return postService.toggleFeatured(id, principal.user());
    }

    @Operation(summary = "Valida a senha de um post privado e libera o conteudo")
    @PostMapping("/api/v1/posts/private-access/validate")
    public PrivateAccessResponse validatePrivateAccess(
            @Valid @RequestBody ValidatePostAccessRequest request,
            @AuthenticationPrincipal AuthenticatedUser principal) {
        return privateAccessService.validatePassword(request.postId(), request.password(), principal.user());
    }

    // ------------------------------------------------------------ post blocks

    @Operation(summary = "Lista os blocos do post")
    @GetMapping("/api/v1/posts/{postId}/blocks")
    public List<BlockResponse> listBlocks(@PathVariable UUID postId,
                                          @AuthenticationPrincipal AuthenticatedUser principal) {
        return blockService.list(postId, AuthenticatedUser.userOrNull(principal));
    }

    @Operation(summary = "Adiciona um bloco no fim do post (apenas o dono)")
    @PostMapping("/api/v1/posts/{postId}/blocks")
    public ResponseEntity<BlockResponse> createBlock(@PathVariable UUID postId,
                                                     @Valid @RequestBody CreateBlockRequest request,
                                                     @AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(blockService.create(postId, request, principal.user()));
    }

    @Operation(summary = "Atualiza um bloco do post (apenas o dono)")
    @PatchMapping("/api/v1/post-blocks/{id}")
    public BlockResponse updateBlock(@PathVariable UUID id, @Valid @RequestBody UpdateBlockRequest request,
                                     @AuthenticationPrincipal AuthenticatedUser principal) {
        return blockService.update(id, request, principal.user());
    }

    @Operation(summary = "Exclui um bloco do post (apenas o dono)")
    @DeleteMapping("/api/v1/post-blocks/{id}")
    public ResponseEntity<Void> deleteBlock(@PathVariable UUID id,
                                            @AuthenticationPrincipal AuthenticatedUser principal) {
        blockService.delete(id, principal.user());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Reordena os blocos do post (apenas o dono)")
    @PutMapping("/api/v1/posts/{postId}/blocks/reorder")
    public List<BlockResponse> reorderBlocks(@PathVariable UUID postId,
                                             @Valid @RequestBody ReorderRequest request,
                                             @AuthenticationPrincipal AuthenticatedUser principal) {
        return blockService.reorder(postId, request.ids(), principal.user());
    }
}
