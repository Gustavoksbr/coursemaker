package com.coursemaker.controller;

import com.coursemaker.config.AuthenticatedUser;
import com.coursemaker.service.LikeService;
import com.coursemaker.service.LikeService.LikeStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@Tag(name = "Curtidas")
@RestController
@RequiredArgsConstructor
public class LikeController {

    private final LikeService likeService;

    @Operation(summary = "Curte um curso")
    @PostMapping("/api/v1/courses/{id}/like")
    public LikeStatus likeCourse(@PathVariable UUID id,
                                 @AuthenticationPrincipal AuthenticatedUser principal) {
        return likeService.likeCourse(id, principal.user());
    }

    @Operation(summary = "Descurte um curso")
    @DeleteMapping("/api/v1/courses/{id}/like")
    public LikeStatus unlikeCourse(@PathVariable UUID id,
                                   @AuthenticationPrincipal AuthenticatedUser principal) {
        return likeService.unlikeCourse(id, principal.user());
    }

    @Operation(summary = "Curte um post")
    @PostMapping("/api/v1/posts/{id}/like")
    public LikeStatus likePost(@PathVariable UUID id,
                               @AuthenticationPrincipal AuthenticatedUser principal) {
        return likeService.likePost(id, principal.user());
    }

    @Operation(summary = "Descurte um post")
    @DeleteMapping("/api/v1/posts/{id}/like")
    public LikeStatus unlikePost(@PathVariable UUID id,
                                 @AuthenticationPrincipal AuthenticatedUser principal) {
        return likeService.unlikePost(id, principal.user());
    }
}
