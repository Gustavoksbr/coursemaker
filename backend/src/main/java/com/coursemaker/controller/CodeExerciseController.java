package com.coursemaker.controller;

import com.coursemaker.config.AuthenticatedUser;
import com.coursemaker.dto.code.CodeExerciseDtos.ExerciseProgressResponse;
import com.coursemaker.dto.code.CodeExerciseDtos.LanguagesResponse;
import com.coursemaker.dto.code.CodeExerciseDtos.OwnerExercise;
import com.coursemaker.dto.code.CodeExerciseDtos.RunCodeRequest;
import com.coursemaker.dto.code.CodeExerciseDtos.RunResponse;
import com.coursemaker.dto.code.CodeExerciseDtos.SolutionResponse;
import com.coursemaker.dto.code.CodeExerciseDtos.SubmitResponse;
import com.coursemaker.dto.code.CodeExerciseDtos.ValidateExerciseRequest;
import com.coursemaker.dto.code.CodeExerciseDtos.ValidationResponse;
import com.coursemaker.service.CodeExerciseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

import java.util.UUID;

/**
 * Auto-graded code exercises (CODE_EXERCISE blocks). Creating and editing the block itself goes
 * through the regular lesson block endpoints; these are the extra actions around it.
 */
@Tag(name = "Exercicios de codigo")
@RestController
@RequiredArgsConstructor
public class CodeExerciseController {

    private final CodeExerciseService exerciseService;

    @Operation(summary = "Linguagens aceitas em cada modo de correcao")
    @GetMapping("/api/v1/code-exercises/languages")
    public LanguagesResponse languages() {
        return exerciseService.languages();
    }

    // ------------------------------------------------------------------ creator

    @Operation(summary = "Roda a solucao de referencia contra os testes, sem salvar (apenas o dono da licao)")
    @PostMapping("/api/v1/lessons/{lessonId}/code-exercise/validate")
    public ValidationResponse validate(@PathVariable UUID lessonId,
                                       @Valid @RequestBody ValidateExerciseRequest request,
                                       @AuthenticationPrincipal AuthenticatedUser principal) {
        return exerciseService.validate(lessonId, request, principal.user());
    }

    @Operation(summary = "Exercicio completo, com testes escondidos e solucao, para edicao (apenas o dono)")
    @GetMapping("/api/v1/blocks/{id}/exercise/spec")
    public OwnerExercise spec(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedUser principal) {
        return exerciseService.getForOwner(id, principal.user());
    }

    // ------------------------------------------------------------------ student

    @Operation(summary = "Executar exemplos: roda so os testes visiveis, nao conta como envio")
    @PostMapping("/api/v1/blocks/{id}/exercise/run")
    public RunResponse run(@PathVariable UUID id,
                           @Valid @RequestBody RunCodeRequest request,
                           @AuthenticationPrincipal AuthenticatedUser principal) {
        return exerciseService.run(id, request.code(), principal.user());
    }

    @Operation(summary = "Enviar solucao: roda todos os testes e registra a tentativa")
    @PostMapping("/api/v1/blocks/{id}/exercise/submit")
    public SubmitResponse submit(@PathVariable UUID id,
                                 @Valid @RequestBody RunCodeRequest request,
                                 @AuthenticationPrincipal AuthenticatedUser principal) {
        return exerciseService.submit(id, request.code(), principal.user());
    }

    @Operation(summary = "Andamento do aluno no exercicio (resolvido, tentativas, ultimo codigo)")
    @GetMapping("/api/v1/blocks/{id}/exercise/progress")
    public ExerciseProgressResponse progress(@PathVariable UUID id,
                                             @AuthenticationPrincipal AuthenticatedUser principal) {
        return exerciseService.progress(id, principal.user());
    }

    @Operation(summary = "Solucao de referencia, liberada depois de resolver ou de 2 envios sem sucesso")
    @GetMapping("/api/v1/blocks/{id}/exercise/solution")
    public SolutionResponse solution(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedUser principal) {
        return exerciseService.solution(id, principal.user());
    }
}
