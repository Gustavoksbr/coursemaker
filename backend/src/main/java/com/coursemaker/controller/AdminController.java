package com.coursemaker.controller;

import com.coursemaker.config.AuthenticatedUser;
import com.coursemaker.dto.admin.AdminDtos.BlockedContentItem;
import com.coursemaker.dto.admin.AdminDtos.HomePicksResponse;
import com.coursemaker.dto.admin.AdminDtos.SetHomePicksRequest;
import com.coursemaker.service.AdminHomeCurationService;
import com.coursemaker.service.AdminModerationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Admin")
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminModerationService adminModerationService;
    private final AdminHomeCurationService adminHomeCurationService;

    @Operation(summary = "Lista todo o conteudo bloqueado por um admin - cursos, posts e trilhas (apenas admin)")
    @GetMapping("/blocked-content")
    public List<BlockedContentItem> listBlockedContent(@AuthenticationPrincipal AuthenticatedUser principal) {
        return adminModerationService.listBlockedContent(principal.user());
    }

    @Operation(summary = "O que esta escolhido para a home hoje: cursos, posts, trilhas e escolas (apenas admin)")
    @GetMapping("/home-picks")
    public HomePicksResponse getHomePicks(@AuthenticationPrincipal AuthenticatedUser principal) {
        return adminHomeCurationService.getHomePicks(principal.user());
    }

    @Operation(summary = "Define exatamente quais cursos/posts/trilhas/escolas aparecem na home, e em que "
            + "ordem (apenas admin). kind: courses, posts, trilhas ou schools")
    @PutMapping("/home-picks/{kind}")
    public Object setHomePicks(@PathVariable String kind, @Valid @RequestBody SetHomePicksRequest request,
                               @AuthenticationPrincipal AuthenticatedUser principal) {
        return adminHomeCurationService.setHomePicks(kind, request.ids(), principal.user());
    }
}
