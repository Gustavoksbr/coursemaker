package com.coursemaker.controller;

import com.coursemaker.config.AuthenticatedUser;
import com.coursemaker.dto.home.HomeDtos.CreateTestimonialRequest;
import com.coursemaker.dto.home.HomeDtos.SiteSettingsResponse;
import com.coursemaker.dto.home.HomeDtos.StatsResponse;
import com.coursemaker.dto.home.HomeDtos.TestimonialResponse;
import com.coursemaker.dto.home.HomeDtos.UpdateSiteSettingsRequest;
import com.coursemaker.dto.home.HomeDtos.UpdateTestimonialRequest;
import com.coursemaker.service.HomeService;
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
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@Tag(name = "Landing page")
@RestController
@RequiredArgsConstructor
public class HomeController {

    private final HomeService homeService;

    @Operation(summary = "Textos editaveis da home")
    @GetMapping("/api/v1/site-settings")
    public SiteSettingsResponse settings() {
        return homeService.getSettings();
    }

    @Operation(summary = "Atualiza os textos da home (apenas admin)")
    @PatchMapping("/api/v1/site-settings")
    public SiteSettingsResponse updateSettings(@Valid @RequestBody UpdateSiteSettingsRequest request,
                                               @AuthenticationPrincipal AuthenticatedUser principal) {
        return homeService.updateSettings(request, principal.user());
    }

    @Operation(summary = "Contadores reais da home: cursos, trilhas, posts e criadores publicados")
    @GetMapping("/api/v1/stats")
    public StatsResponse stats() {
        return homeService.stats();
    }

    @Operation(summary = "Depoimentos publicados, na ordem definida pelo admin")
    @GetMapping("/api/v1/testimonials")
    public List<TestimonialResponse> testimonials() {
        return homeService.listPublished();
    }

    @Operation(summary = "Todos os depoimentos, incluindo os nao publicados (apenas admin)")
    @GetMapping("/api/v1/testimonials/all")
    public List<TestimonialResponse> allTestimonials(@AuthenticationPrincipal AuthenticatedUser principal) {
        return homeService.listAll(principal.user());
    }

    @Operation(summary = "Cria um depoimento (apenas admin)")
    @PostMapping("/api/v1/testimonials")
    public ResponseEntity<TestimonialResponse> createTestimonial(
            @Valid @RequestBody CreateTestimonialRequest request,
            @AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(homeService.create(request, principal.user()));
    }

    @Operation(summary = "Atualiza um depoimento (apenas admin)")
    @PatchMapping("/api/v1/testimonials/{id}")
    public TestimonialResponse updateTestimonial(@PathVariable UUID id,
                                                 @Valid @RequestBody UpdateTestimonialRequest request,
                                                 @AuthenticationPrincipal AuthenticatedUser principal) {
        return homeService.update(id, request, principal.user());
    }

    @Operation(summary = "Exclui um depoimento (apenas admin)")
    @DeleteMapping("/api/v1/testimonials/{id}")
    public ResponseEntity<Void> deleteTestimonial(@PathVariable UUID id,
                                                  @AuthenticationPrincipal AuthenticatedUser principal) {
        homeService.delete(id, principal.user());
        return ResponseEntity.noContent().build();
    }
}
