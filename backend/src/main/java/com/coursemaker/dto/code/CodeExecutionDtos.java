package com.coursemaker.dto.code;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class CodeExecutionDtos {

    private CodeExecutionDtos() {
    }

    /** Prototipo do bloco de codigo executavel: so repassa pro gateway, sem bateria de testes. */
    public record ExecuteRequest(
            @NotBlank String language,
            @NotBlank @Size(max = 20_000) String code,
            @Size(max = 2_000) String stdin) {
    }

    public record ExecuteResponse(
            String stdout,
            String stderr,
            Integer exitCode,
            String compileOutput) {
    }

    /** O usuario manda so a funcao; o gateway gera a entrada, monta o programa e confere. */
    public record ExerciseRequest(
            @NotBlank String language,
            @NotBlank @Size(max = 20_000) String code) {
    }

    public record ExerciseResponse(
            Integer input,
            Integer expected,
            String actual,
            Boolean passed,
            String stderr,
            Integer exitCode) {
    }
}
