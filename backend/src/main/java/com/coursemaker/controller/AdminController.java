package com.coursemaker.controller;

import com.coursemaker.config.AuthenticatedUser;
import com.coursemaker.dto.admin.AdminDtos.BlockedContentItem;
import com.coursemaker.service.AdminModerationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Admin")
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminModerationService adminModerationService;

    @Operation(summary = "Lista todo o conteudo bloqueado por um admin - cursos, posts e trilhas (apenas admin)")
    @GetMapping("/blocked-content")
    public List<BlockedContentItem> listBlockedContent(@AuthenticationPrincipal AuthenticatedUser principal) {
        return adminModerationService.listBlockedContent(principal.user());
    }
}
