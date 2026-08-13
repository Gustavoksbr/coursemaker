package com.coursemaker.controller;

import com.coursemaker.config.AuthenticatedUser;
import com.coursemaker.dto.PageResponse;
import com.coursemaker.dto.auth.AuthDtos.AuthResponse;
import com.coursemaker.dto.user.PersonSummary;
import com.coursemaker.dto.user.PublicProfileResponse;
import com.coursemaker.dto.user.UpdateUserRequest;
import com.coursemaker.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@Tag(name = "Usuarios")
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Validated
public class UserController {

    private final UserService userService;

    @Operation(summary = "Verifica se um nickname esta disponivel")
    @GetMapping("/nickname-available")
    public Map<String, Boolean> nicknameAvailable(@RequestParam @NotBlank @Size(max = 30) String nickname) {
        return Map.of("available", userService.isNicknameAvailable(nickname));
    }

    @Operation(summary = "Busca usuarios por nome ou nickname, paginado")
    @GetMapping("/search")
    public PageResponse<PersonSummary> search(@RequestParam(required = false) @Size(max = 200) String q,
                                              @RequestParam(required = false, defaultValue = "recent") @Size(max = 20) String sort,
                                              @RequestParam(defaultValue = "0") int page,
                                              @RequestParam(defaultValue = "12") int size) {
        return userService.search(q, sort, page, size);
    }

    @Operation(summary = "Perfil publico com os cursos e posts do autor")
    @GetMapping("/{nickname}")
    public PublicProfileResponse publicProfile(@PathVariable String nickname,
                                               @AuthenticationPrincipal AuthenticatedUser principal) {
        return userService.getPublicProfile(nickname, AuthenticatedUser.userOrNull(principal));
    }

    @Operation(summary = "Atualiza o proprio perfil. O nickname so pode ser definido uma vez. "
            + "Devolve um novo token, ja que nickname/nome fazem parte das claims")
    @PatchMapping("/{id}")
    public AuthResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateUserRequest request,
                               @AuthenticationPrincipal AuthenticatedUser principal) {
        return userService.updateProfile(id, request, principal.user());
    }
}
