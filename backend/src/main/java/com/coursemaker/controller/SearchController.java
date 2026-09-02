package com.coursemaker.controller;

import com.coursemaker.config.AuthenticatedUser;
import com.coursemaker.dto.search.SearchDtos.SearchResponse;
import com.coursemaker.service.SearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@Tag(name = "Busca unificada")
@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
@Validated
public class SearchController {

    private final SearchService searchService;

    @Operation(summary = "Busca cursos e posts simultaneamente. Sem termo, devolve destaques e recentes")
    @GetMapping
    public SearchResponse search(@RequestParam(required = false) @Size(max = 200) String q,
                                 @RequestParam(defaultValue = "6") int limit,
                                 @RequestParam(name = "area", required = false) List<UUID> areaIds,
                                 @AuthenticationPrincipal AuthenticatedUser principal) {
        return searchService.search(q, Math.clamp(limit, 1, 24), AuthenticatedUser.userOrNull(principal), areaIds);
    }
}
