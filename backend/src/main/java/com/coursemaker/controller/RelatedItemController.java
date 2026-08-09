package com.coursemaker.controller;

import com.coursemaker.config.AuthenticatedUser;
import com.coursemaker.dto.PageResponse;
import com.coursemaker.dto.related.RelatedItemDtos.AddRelatedItemRequest;
import com.coursemaker.dto.related.RelatedItemDtos.RelatedItemResponse;
import com.coursemaker.service.RelatedItemService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Related courses/posts, curated only by the owner of the source course/post. Not reciprocal:
 * relating X to Y never makes Y's own page show X.
 */
@Tag(name = "Relacionados")
@RestController
@RequiredArgsConstructor
public class RelatedItemController {

    private final RelatedItemService relatedItemService;

    @Operation(summary = "Lista os cursos/posts relacionados a este curso, paginado")
    @GetMapping("/api/v1/courses/{courseId}/related")
    public PageResponse<RelatedItemResponse> listForCourse(@PathVariable UUID courseId,
                                                            @RequestParam(defaultValue = "0") int page,
                                                            @RequestParam(defaultValue = "12") int size,
                                                            @AuthenticationPrincipal AuthenticatedUser principal) {
        return relatedItemService.listForCourse(courseId, page, size, AuthenticatedUser.userOrNull(principal));
    }

    @Operation(summary = "Relaciona um curso/post a este curso (apenas o dono do curso)")
    @PostMapping("/api/v1/courses/{courseId}/related")
    public ResponseEntity<RelatedItemResponse> addToCourse(@PathVariable UUID courseId,
                                                            @Valid @RequestBody AddRelatedItemRequest request,
                                                            @AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(relatedItemService.addToCourse(courseId, request, principal.user()));
    }

    @Operation(summary = "Remove um relacionado do curso (apenas o dono do curso)")
    @DeleteMapping("/api/v1/courses/{courseId}/related/{relatedItemId}")
    public ResponseEntity<Void> removeFromCourse(@PathVariable UUID courseId, @PathVariable UUID relatedItemId,
                                                 @AuthenticationPrincipal AuthenticatedUser principal) {
        relatedItemService.removeFromCourse(courseId, relatedItemId, principal.user());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Lista os cursos/posts relacionados a este post, paginado")
    @GetMapping("/api/v1/posts/{postId}/related")
    public PageResponse<RelatedItemResponse> listForPost(@PathVariable UUID postId,
                                                          @RequestParam(defaultValue = "0") int page,
                                                          @RequestParam(defaultValue = "12") int size,
                                                          @AuthenticationPrincipal AuthenticatedUser principal) {
        return relatedItemService.listForPost(postId, page, size, AuthenticatedUser.userOrNull(principal));
    }

    @Operation(summary = "Relaciona um curso/post a este post (apenas o dono do post)")
    @PostMapping("/api/v1/posts/{postId}/related")
    public ResponseEntity<RelatedItemResponse> addToPost(@PathVariable UUID postId,
                                                          @Valid @RequestBody AddRelatedItemRequest request,
                                                          @AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(relatedItemService.addToPost(postId, request, principal.user()));
    }

    @Operation(summary = "Remove um relacionado do post (apenas o dono do post)")
    @DeleteMapping("/api/v1/posts/{postId}/related/{relatedItemId}")
    public ResponseEntity<Void> removeFromPost(@PathVariable UUID postId, @PathVariable UUID relatedItemId,
                                               @AuthenticationPrincipal AuthenticatedUser principal) {
        relatedItemService.removeFromPost(postId, relatedItemId, principal.user());
        return ResponseEntity.noContent().build();
    }
}
