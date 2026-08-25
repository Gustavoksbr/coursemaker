package com.coursemaker.controller;

import com.coursemaker.config.AuthenticatedUser;
import com.coursemaker.dto.PageResponse;
import com.coursemaker.dto.library.LibraryDtos.CreateLibraryFolderRequest;
import com.coursemaker.dto.library.LibraryDtos.LibraryFolderResponse;
import com.coursemaker.dto.library.LibraryDtos.LibraryItemResponse;
import com.coursemaker.dto.library.LibraryDtos.LibraryStatusResponse;
import com.coursemaker.dto.library.LibraryDtos.MoveLibraryItemRequest;
import com.coursemaker.dto.library.LibraryDtos.UpdateLibraryFolderRequest;
import com.coursemaker.service.LibraryService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * A user's personal library: saved content, organised into folders. Every endpoint here acts on
 * the caller's own library -- there is no "view someone else's library" concept, so the whole
 * controller sits behind authentication (the default security rule, no explicit permit needed).
 */
@Tag(name = "Biblioteca")
@RestController
@RequestMapping("/api/v1/library")
@RequiredArgsConstructor
public class LibraryController {

    private final LibraryService libraryService;

    // ------------------------------------------------------ status/save/unsave

    @Operation(summary = "Estado do curso na biblioteca: salvo ou nao, e em qual pasta")
    @GetMapping("/courses/{courseId}/status")
    public LibraryStatusResponse courseStatus(@PathVariable UUID courseId,
                                              @AuthenticationPrincipal AuthenticatedUser principal) {
        return libraryService.statusForCourse(courseId, principal.user());
    }

    @Operation(summary = "Remove o curso dos salvos")
    @DeleteMapping("/courses/{courseId}")
    public LibraryStatusResponse unsaveCourse(@PathVariable UUID courseId,
                                              @AuthenticationPrincipal AuthenticatedUser principal) {
        return libraryService.unsaveCourse(courseId, principal.user());
    }

    @Operation(summary = "Salva o curso numa pasta (folderId nulo = pasta Favoritos). "
            + "E tambem como se salva pela primeira vez -- nao ha uma acao de \"favoritar\" separada")
    @PutMapping("/courses/{courseId}/folder")
    public LibraryStatusResponse moveCourse(@PathVariable UUID courseId,
                                            @RequestBody MoveLibraryItemRequest request,
                                            @AuthenticationPrincipal AuthenticatedUser principal) {
        return libraryService.moveCourseToFolder(courseId, request.folderId(), principal.user());
    }

    @Operation(summary = "Estado do post na biblioteca: salvo ou nao, e em qual pasta")
    @GetMapping("/posts/{postId}/status")
    public LibraryStatusResponse postStatus(@PathVariable UUID postId,
                                            @AuthenticationPrincipal AuthenticatedUser principal) {
        return libraryService.statusForPost(postId, principal.user());
    }

    @Operation(summary = "Remove o post dos salvos")
    @DeleteMapping("/posts/{postId}")
    public LibraryStatusResponse unsavePost(@PathVariable UUID postId,
                                            @AuthenticationPrincipal AuthenticatedUser principal) {
        return libraryService.unsavePost(postId, principal.user());
    }

    @Operation(summary = "Salva o post numa pasta (folderId nulo = pasta Favoritos)")
    @PutMapping("/posts/{postId}/folder")
    public LibraryStatusResponse movePost(@PathVariable UUID postId,
                                          @RequestBody MoveLibraryItemRequest request,
                                          @AuthenticationPrincipal AuthenticatedUser principal) {
        return libraryService.movePostToFolder(postId, request.folderId(), principal.user());
    }

    @Operation(summary = "Estado da trilha na biblioteca: salva ou nao, e em qual pasta")
    @GetMapping("/trilhas/{trilhaId}/status")
    public LibraryStatusResponse trilhaStatus(@PathVariable UUID trilhaId,
                                              @AuthenticationPrincipal AuthenticatedUser principal) {
        return libraryService.statusForTrilha(trilhaId, principal.user());
    }

    @Operation(summary = "Remove a trilha dos salvos")
    @DeleteMapping("/trilhas/{trilhaId}")
    public LibraryStatusResponse unsaveTrilha(@PathVariable UUID trilhaId,
                                              @AuthenticationPrincipal AuthenticatedUser principal) {
        return libraryService.unsaveTrilha(trilhaId, principal.user());
    }

    @Operation(summary = "Salva a trilha numa pasta (folderId nulo = pasta Favoritos)")
    @PutMapping("/trilhas/{trilhaId}/folder")
    public LibraryStatusResponse moveTrilha(@PathVariable UUID trilhaId,
                                            @RequestBody MoveLibraryItemRequest request,
                                            @AuthenticationPrincipal AuthenticatedUser principal) {
        return libraryService.moveTrilhaToFolder(trilhaId, request.folderId(), principal.user());
    }

    // -------------------------------------------------------------- folders

    @Operation(summary = "Lista as pastas da biblioteca (contagens filtradas pela area quando informada)")
    @GetMapping("/folders")
    public List<LibraryFolderResponse> folders(@RequestParam(required = false) UUID areaId,
                                               @AuthenticationPrincipal AuthenticatedUser principal) {
        return libraryService.listFolders(principal.user(), areaId);
    }

    @Operation(summary = "Cria uma pasta")
    @PostMapping("/folders")
    public ResponseEntity<LibraryFolderResponse> createFolder(@Valid @RequestBody CreateLibraryFolderRequest request,
                                                               @AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(libraryService.createFolder(request, principal.user()));
    }

    @Operation(summary = "Renomeia uma pasta. A pasta Favoritos nao pode ser renomeada")
    @PatchMapping("/folders/{folderId}")
    public LibraryFolderResponse renameFolder(@PathVariable UUID folderId,
                                              @Valid @RequestBody UpdateLibraryFolderRequest request,
                                              @AuthenticationPrincipal AuthenticatedUser principal) {
        return libraryService.renameFolder(folderId, request, principal.user());
    }

    @Operation(summary = "Exclui uma pasta. Os itens dela voltam para Favoritos. A propria Favoritos nao pode ser excluida")
    @DeleteMapping("/folders/{folderId}")
    public ResponseEntity<Void> deleteFolder(@PathVariable UUID folderId,
                                             @AuthenticationPrincipal AuthenticatedUser principal) {
        libraryService.deleteFolder(folderId, principal.user());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Detalhes de uma pasta")
    @GetMapping("/folders/{folderId}")
    public LibraryFolderResponse getFolder(@PathVariable UUID folderId,
                                           @RequestParam(required = false) UUID areaId,
                                           @AuthenticationPrincipal AuthenticatedUser principal) {
        return libraryService.getFolder(folderId, principal.user(), areaId);
    }

    @Operation(summary = "Itens de uma pasta, paginado")
    @GetMapping("/folders/{folderId}/items")
    public PageResponse<LibraryItemResponse> folderItems(@PathVariable UUID folderId,
                                                          @RequestParam(required = false) UUID areaId,
                                                          @RequestParam(defaultValue = "0") int page,
                                                          @RequestParam(defaultValue = "12") int size,
                                                          @AuthenticationPrincipal AuthenticatedUser principal) {
        return libraryService.listFolderItems(folderId, principal.user(), areaId, page, size);
    }
}
