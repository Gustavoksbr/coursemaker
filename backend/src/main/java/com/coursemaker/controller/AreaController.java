package com.coursemaker.controller;

import com.coursemaker.config.AuthenticatedUser;
import com.coursemaker.dto.area.AreaDtos.AreaSummary;
import com.coursemaker.dto.area.AreaDtos.CreateAreaRequest;
import com.coursemaker.dto.area.AreaDtos.UpdateAreaRequest;
import com.coursemaker.service.AreaService;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@Tag(name = "Areas")
@RestController
@RequestMapping("/api/v1/areas")
@RequiredArgsConstructor
public class AreaController {

    private final AreaService areaService;

    @Operation(summary = "Lista todas as areas, em ordem alfabetica")
    @GetMapping
    public List<AreaSummary> list() {
        return areaService.list();
    }

    @Operation(summary = "Cria uma area (apenas admin)")
    @PostMapping
    public ResponseEntity<AreaSummary> create(@Valid @RequestBody CreateAreaRequest request,
                                              @AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(areaService.create(request, principal.user()));
    }

    @Operation(summary = "Renomeia uma area (apenas admin)")
    @PatchMapping("/{id}")
    public AreaSummary update(@PathVariable UUID id, @Valid @RequestBody UpdateAreaRequest request,
                              @AuthenticationPrincipal AuthenticatedUser principal) {
        return areaService.update(id, request, principal.user());
    }

    @Operation(summary = "Exclui uma area sem conteudo (apenas admin)")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedUser principal) {
        areaService.delete(id, principal.user());
        return ResponseEntity.noContent().build();
    }
}
