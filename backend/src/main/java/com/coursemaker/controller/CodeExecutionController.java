package com.coursemaker.controller;

import com.coursemaker.dto.code.CodeExecutionDtos.ExecuteRequest;
import com.coursemaker.dto.code.CodeExecutionDtos.ExecuteResponse;
import com.coursemaker.dto.code.CodeExecutionDtos.ExerciseRequest;
import com.coursemaker.dto.code.CodeExecutionDtos.ExerciseResponse;
import com.coursemaker.service.CodeExecutionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Prototipo: endpoint cru pra testar o bloco de codigo executavel. Sem persistencia, sem entidade
 * de atividade ainda - isso entra quando a experiencia estiver validada.
 */
@Tag(name = "Execucao de codigo (prototipo)")
@RestController
@RequestMapping("/api/v1/code-execution")
@RequiredArgsConstructor
public class CodeExecutionController {

    private final CodeExecutionService codeExecutionService;

    @Operation(summary = "Executa um trecho de codigo via Piston e devolve stdout/stderr")
    @PostMapping("/run")
    public ExecuteResponse run(@Valid @RequestBody ExecuteRequest request) {
        return codeExecutionService.execute(request);
    }

    @Operation(summary = "Atividade 'quadrado': roda a funcao square(n) do usuario com um n aleatorio e confere")
    @PostMapping("/exercises/square/run")
    public ExerciseResponse runSquare(@Valid @RequestBody ExerciseRequest request) {
        return codeExecutionService.runSquareExercise(request);
    }
}
