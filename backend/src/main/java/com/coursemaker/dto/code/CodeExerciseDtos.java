package com.coursemaker.dto.code;

import com.coursemaker.domain.enums.ExerciseMode;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

/** Requests and responses of the auto-graded code exercises (CODE_EXERCISE lesson blocks). */
public final class CodeExerciseDtos {

    private CodeExerciseDtos() {
    }

    private static final int MAX_CODE_LENGTH = 50_000;

    // ------------------------------------------------------------- creator side

    /**
     * One test case as the creator writes it. FUNCTION mode uses {@code args} (one JSON value per
     * parameter) and {@code expected} (the JSON value returned); OUTPUT mode uses {@code input}
     * (stdin) and {@code expected} as a JSON string (the text expected on stdout).
     */
    public record TestSpec(boolean visible, List<JsonNode> args, JsonNode expected, String input) {
    }

    /**
     * Everything the creator controls, including what students must never see (the reference
     * solution and the hidden tests). It only travels creator -> server and back to the creator.
     */
    public record ExerciseSpec(
            @NotNull ExerciseMode mode,
            @Size(max = 100) String title,
            @Size(max = 60) String functionName,
            @Size(max = 10) List<@Size(max = 60) String> params,
            // Java only (it is typed): one type per parameter and the return type, from a closed set
            // (see JavaTypes). Ignored for the dynamic languages.
            @Size(max = 10) List<@Size(max = 30) String> paramTypes,
            @Size(max = 30) String returnType,
            @Size(max = MAX_CODE_LENGTH) String starterCode,
            @NotBlank @Size(max = MAX_CODE_LENGTH) String solutionCode,
            @NotEmpty @Size(max = 100) List<@Valid TestSpec> tests) {
    }

    /** Body of the "test the solution" button: nothing is saved. */
    public record ValidateExerciseRequest(
            @NotBlank @Size(max = 50) String language,
            @NotNull @Valid ExerciseSpec exercise) {
    }

    /** What the creator gets back when opening an existing exercise for editing. */
    public record OwnerExercise(String language, ExerciseSpec exercise) {
    }

    /** One test's result when the reference solution is run against the creator's tests. */
    public record TestOutcome(int index, boolean passed, JsonNode actual, String error) {
    }

    public record ValidationResponse(
            boolean valid,
            int passedCount,
            int total,
            List<TestOutcome> results,
            String compileError,
            String stderr,
            String output,
            boolean timedOut) {
    }

    /** Which languages each mode supports, so the editor offers only what the gateway can run. */
    public record LanguagesResponse(List<String> function, List<String> output) {
    }

    // ------------------------------------------------------------- student side

    public record RunCodeRequest(@NotBlank @Size(max = MAX_CODE_LENGTH) String code) {
    }

    /**
     * Outcome of one test the student is allowed to see in full. {@code index} is the test's
     * position among all the exercise's tests (hidden ones included), so gaps are expected.
     */
    public record VisibleOutcome(
            int index,
            boolean passed,
            List<JsonNode> args,
            String input,
            JsonNode expected,
            JsonNode actual,
            String error) {
    }

    /**
     * Result of "Executar exemplos": only the visible tests ran, so everything - including what the
     * program printed - can be shown.
     */
    public record RunResponse(
            boolean allPassed,
            int passedCount,
            int total,
            List<VisibleOutcome> tests,
            String compileError,
            String stderr,
            String output,
            boolean timedOut) {
    }

    /**
     * Result of "Enviar solucao": every test ran. Hidden ones are reduced to a count, so what they
     * contain (and what the program printed while running them) stays on the server.
     */
    public record SubmitResponse(
            boolean allPassed,
            int passedCount,
            int total,
            List<VisibleOutcome> visible,
            int hiddenPassed,
            int hiddenTotal,
            String compileError,
            String stderr,
            boolean timedOut,
            boolean exercisePassed,
            int failedSubmissions,
            boolean solutionAvailable) {
    }

    public record ExerciseProgressResponse(
            UUID blockId,
            boolean passed,
            int failedSubmissions,
            boolean solutionAvailable,
            String lastCode) {
    }

    public record SolutionResponse(String solutionCode) {
    }
}
