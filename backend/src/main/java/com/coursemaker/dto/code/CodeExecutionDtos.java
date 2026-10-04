package com.coursemaker.dto.code;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

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

    // ---------------------------------------------------- piston-gateway: /run-tests

    /** Modo "funcao": o gateway chama functionName com cada args e compara o retorno com expected. */
    public record RunTestsRequest(String language, String code, String functionName, List<FunctionTest> tests) {
    }

    public record FunctionTest(List<JsonNode> args, JsonNode expected) {
    }

    public record RunTestsResponse(
            List<FunctionResult> results,
            int passedCount,
            int total,
            String output,
            String stderr,
            int exitCode,
            boolean timedOut) {
    }

    public record FunctionResult(int index, boolean passed, JsonNode actual, String error) {
    }

    // --------------------------------------------------- piston-gateway: /run-output

    /** Modo "saida": o gateway roda o programa uma vez por teste, com input no stdin. */
    public record RunOutputRequest(String language, String code, List<OutputTest> tests) {
    }

    public record OutputTest(String input, String expected) {
    }

    public record RunOutputResponse(
            List<OutputResult> results,
            int passedCount,
            int total,
            String compileError) {
    }

    public record OutputResult(int index, boolean passed, String actual, String stderr, int exitCode, boolean timedOut) {
    }
}
