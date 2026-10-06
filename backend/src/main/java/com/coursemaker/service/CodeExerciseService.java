package com.coursemaker.service;

import com.coursemaker.domain.entity.CodeExercise;
import com.coursemaker.domain.entity.CodeExerciseProgress;
import com.coursemaker.domain.entity.CodeExerciseTest;
import com.coursemaker.domain.entity.CompositeIds.UserBlockId;
import com.coursemaker.domain.entity.Course;
import com.coursemaker.domain.entity.LessonBlock;
import com.coursemaker.domain.entity.User;
import com.coursemaker.domain.enums.BlockType;
import com.coursemaker.domain.enums.ExerciseMode;
import com.coursemaker.dto.code.CodeExecutionDtos.FunctionResult;
import com.coursemaker.dto.code.CodeExecutionDtos.FunctionTest;
import com.coursemaker.dto.code.CodeExecutionDtos.OutputResult;
import com.coursemaker.dto.code.CodeExecutionDtos.OutputTest;
import com.coursemaker.dto.code.CodeExecutionDtos.RunOutputRequest;
import com.coursemaker.dto.code.CodeExecutionDtos.RunOutputResponse;
import com.coursemaker.dto.code.CodeExecutionDtos.RunTestsRequest;
import com.coursemaker.dto.code.CodeExecutionDtos.RunTestsResponse;
import com.coursemaker.dto.code.CodeExerciseDtos.ExerciseProgressResponse;
import com.coursemaker.dto.code.CodeExerciseDtos.ExerciseSpec;
import com.coursemaker.dto.code.CodeExerciseDtos.LanguagesResponse;
import com.coursemaker.dto.code.CodeExerciseDtos.OwnerExercise;
import com.coursemaker.dto.code.CodeExerciseDtos.RunResponse;
import com.coursemaker.dto.code.CodeExerciseDtos.SolutionResponse;
import com.coursemaker.dto.code.CodeExerciseDtos.SubmitResponse;
import com.coursemaker.dto.code.CodeExerciseDtos.TestOutcome;
import com.coursemaker.dto.code.CodeExerciseDtos.TestSpec;
import com.coursemaker.dto.code.CodeExerciseDtos.ValidateExerciseRequest;
import com.coursemaker.dto.code.CodeExerciseDtos.ValidationResponse;
import com.coursemaker.dto.code.CodeExerciseDtos.VisibleOutcome;
import com.coursemaker.exception.ApiExceptions.BadRequestException;
import com.coursemaker.exception.ApiExceptions.ForbiddenException;
import com.coursemaker.exception.ApiExceptions.ResourceNotFoundException;
import com.coursemaker.exception.ExerciseValidationException;
import com.coursemaker.repository.AreaRepository;
import com.coursemaker.repository.CodeExerciseProgressRepository;
import com.coursemaker.repository.CodeExerciseRepository;
import com.coursemaker.repository.CodeExerciseTestRepository;
import com.coursemaker.repository.LessonBlockRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.node.TextNode;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Auto-graded code exercises: validating and storing what the creator writes, and grading what
 * students submit, by delegating the actual execution to the piston-gateway.
 *
 * <p>What is public and what is not: the block's {@code content} (built here, never taken from the
 * client) carries the starter code and the <em>visible</em> examples. The reference solution and the
 * hidden tests are only in the code_exercises tables, and the student-facing responses reduce hidden
 * tests to a count.
 *
 * <p>The public methods are deliberately not {@code @Transactional}: a gateway call can take several
 * seconds, and a database transaction (and its pooled connection) has no reason to stay open across
 * it. Reads and writes use short {@link TransactionTemplate} blocks around it instead.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CodeExerciseService {

    public static final List<String> FUNCTION_LANGUAGES = List.of("javascript", "python", "java");
    public static final List<String> OUTPUT_LANGUAGES = List.of("javascript", "python", "java", "c", "cpp");

    /** "Ver solucao" unlocks after this many unsuccessful submissions. */
    public static final int SOLUTION_UNLOCK_AFTER_FAILURES = 2;

    static final int MAX_FUNCTION_TESTS = 100;
    static final int MAX_OUTPUT_TESTS = 20;
    static final int MAX_VALUE_CHARS = 10_000;
    static final int MAX_PARAMS = 10;
    private static final int MAX_ERROR_CHARS = 2_000;

    private static final Pattern IDENTIFIER = Pattern.compile("^[A-Za-z_][A-Za-z0-9_]*$");

    private final CodeExecutionService gateway;
    private final CodeExerciseRepository exerciseRepository;
    private final CodeExerciseTestRepository testRepository;
    private final CodeExerciseProgressRepository progressRepository;
    private final LessonBlockRepository blockRepository;
    private final AreaRepository areaRepository;
    private final CourseAccessService accessService;
    private final CourseService courseService;
    private final ObjectMapper objectMapper;
    private final TransactionTemplate tx;

    private final SlidingWindowLimiter limiter = new SlidingWindowLimiter(
            30, Duration.ofMinutes(1), "Voce executou codigo muitas vezes em pouco tempo. Aguarde um instante.");

    private TransactionTemplate readOnlyTx;

    @PostConstruct
    void init() {
        readOnlyTx = new TransactionTemplate(tx.getTransactionManager());
        readOnlyTx.setReadOnly(true);
    }

    // ------------------------------------------------------------------ shapes

    /** A test in the form every step below works with. {@code expected} is always a JSON value. */
    private record TestData(boolean visible, List<JsonNode> args, String input, JsonNode expected) {
    }

    /** The creator's spec after validation, with defaults applied. */
    private record Normalized(ExerciseMode mode, String language, String title, String functionName,
                              List<String> params, List<String> paramTypes, String returnType,
                              String starterCode, String solutionCode, List<TestData> tests) {
    }

    /** What came back from the gateway, in one shape for both modes. */
    private record GatewayRun(List<TestOutcome> outcomes, int passedCount, String compileError, String stderr,
                              String output, boolean timedOut, int exitCode) {
    }

    /** An exercise that passed validation, ready to be written inside the caller's transaction. */
    public record PreparedExercise(ExerciseMode mode, String language, String functionName,
                                   String solutionCode, String publicContent, List<CodeExerciseTest> tests) {
    }

    private record Loaded(UUID blockId, String language, CodeExercise exercise, List<CodeExerciseTest> tests,
                          List<String> paramTypes) {
    }

    // ----------------------------------------------------------------- creator

    public LanguagesResponse languages() {
        return new LanguagesResponse(FUNCTION_LANGUAGES, OUTPUT_LANGUAGES);
    }

    /**
     * Validates the spec and runs the reference solution against every test ("validate on save"):
     * an exercise nobody can pass is rejected here with a 422 carrying the per-test results.
     *
     * @param requireAreaFlag true when creating a block, which needs the course's area to allow
     *                        exercises; editing an existing one stays possible if the admin later
     *                        switches the area off
     */
    public PreparedExercise prepare(UUID courseId, String language, ExerciseSpec spec, boolean requireAreaFlag,
                                    User viewer) {
        if (spec == null) {
            throw new BadRequestException("Informe os dados do exercicio");
        }
        if (requireAreaFlag) {
            requireAreaAllows(courseId);
        }
        Normalized exercise = normalize(language, spec);

        limiter.check(viewer.getId());
        ValidationResponse validation = runSolution(exercise);
        if (!validation.valid()) {
            throw new ExerciseValidationException(describeFailure(validation), validation);
        }

        return new PreparedExercise(
                exercise.mode(),
                exercise.language(),
                exercise.functionName(),
                exercise.solutionCode(),
                publicContent(exercise),
                toEntities(exercise.tests()));
    }

    /** "Testar solucao": same checks as saving, but nothing is persisted and a failing solution is a normal answer. */
    public ValidationResponse validate(UUID courseId, ValidateExerciseRequest request, User viewer) {
        // Keyed by course, not lesson: a lesson created in the editor draft does not exist yet.
        Course course = courseService.loadForEditing(courseId, viewer);
        requireAreaAllows(course.getId());

        Normalized exercise = normalize(request.language(), request.exercise());
        limiter.check(viewer.getId());
        return runSolution(exercise);
    }

    /** Writes the server-only half of the exercise. Call inside a transaction, after the block exists. */
    public void persist(UUID blockId, PreparedExercise prepared) {
        CodeExercise exercise = exerciseRepository.findById(blockId)
                .orElseGet(() -> CodeExercise.builder().blockId(blockId).build());
        exercise.setMode(prepared.mode());
        exercise.setFunctionName(prepared.functionName());
        exercise.setSolutionCode(prepared.solutionCode());
        exerciseRepository.save(exercise);

        testRepository.deleteByBlockId(blockId);
        for (CodeExerciseTest test : prepared.tests()) {
            test.setBlockId(blockId);
        }
        testRepository.saveAll(prepared.tests());
    }

    /** The full spec, hidden tests and solution included, for the creator who owns the block. */
    public OwnerExercise getForOwner(UUID blockId, User viewer) {
        return readOnlyTx.execute(status -> {
            LessonBlock block = blockRepository.findByIdWithCourse(blockId)
                    .orElseThrow(() -> ResourceNotFoundException.of("Bloco"));
            accessService.requireOwner(block.getLesson().getModule().getCourse(), viewer);
            requireExerciseBlock(block);

            CodeExercise exercise = exerciseRepository.findById(blockId)
                    .orElseThrow(() -> ResourceNotFoundException.of("Exercicio"));
            JsonNode content = parse(block.getContent());

            List<String> params = new ArrayList<>();
            content.path("params").forEach(param -> params.add(param.asText()));

            List<TestSpec> tests = testRepository.findByBlockIdOrderByPositionAsc(blockId).stream()
                    .map(test -> toSpec(exercise.getMode(), test))
                    .toList();

            List<String> paramTypes = new ArrayList<>();
            content.path("paramTypes").forEach(type -> paramTypes.add(type.asText()));

            ExerciseSpec spec = new ExerciseSpec(
                    exercise.getMode(),
                    content.path("title").isMissingNode() || content.path("title").isNull()
                            ? null : content.path("title").asText(),
                    exercise.getFunctionName(),
                    params,
                    paramTypes.isEmpty() ? null : paramTypes,
                    content.path("returnType").isMissingNode() ? null : content.path("returnType").asText(),
                    content.path("starterCode").asText(""),
                    exercise.getSolutionCode(),
                    tests);
            return new OwnerExercise(block.getLanguage(), spec);
        });
    }

    // ----------------------------------------------------------------- student

    /** "Executar exemplos": runs only the visible tests, so everything can be shown. Does not count as a submission. */
    public RunResponse run(UUID blockId, String code, User viewer) {
        limiter.check(viewer.getId());
        Loaded loaded = loadForStudent(blockId, viewer);

        List<Integer> visibleIndexes = new ArrayList<>();
        List<TestData> visibleTests = new ArrayList<>();
        List<TestData> all = toData(loaded.tests());
        for (int i = 0; i < all.size(); i++) {
            if (all.get(i).visible()) {
                visibleIndexes.add(i);
                visibleTests.add(all.get(i));
            }
        }

        GatewayRun result = execute(loaded.exercise().getMode(), loaded.language(),
                loaded.exercise().getFunctionName(), loaded.paramTypes(), code, visibleTests);
        rememberCode(viewer.getId(), blockId, code);

        List<VisibleOutcome> tests = new ArrayList<>();
        for (int i = 0; i < result.outcomes().size(); i++) {
            tests.add(visibleOutcome(visibleIndexes.get(i), visibleTests.get(i), result.outcomes().get(i)));
        }
        return new RunResponse(
                result.passedCount() == visibleTests.size() && result.compileError() == null,
                result.passedCount(),
                visibleTests.size(),
                tests,
                result.compileError(),
                result.stderr(),
                result.output(),
                result.timedOut());
    }

    /** "Enviar solucao": runs every test and records the attempt. Hidden tests are reduced to a count. */
    public SubmitResponse submit(UUID blockId, String code, User viewer) {
        limiter.check(viewer.getId());
        Loaded loaded = loadForStudent(blockId, viewer);

        List<TestData> all = toData(loaded.tests());
        GatewayRun result = execute(loaded.exercise().getMode(), loaded.language(),
                loaded.exercise().getFunctionName(), loaded.paramTypes(), code, all);

        boolean allPassed = result.compileError() == null && result.passedCount() == all.size();

        List<VisibleOutcome> visible = new ArrayList<>();
        int hiddenTotal = 0;
        int hiddenPassed = 0;
        for (int i = 0; i < all.size(); i++) {
            TestOutcome outcome = i < result.outcomes().size() ? result.outcomes().get(i) : null;
            boolean passed = outcome != null && outcome.passed();
            if (all.get(i).visible()) {
                visible.add(visibleOutcome(i, all.get(i), outcome));
            } else {
                hiddenTotal++;
                if (passed) {
                    hiddenPassed++;
                }
            }
        }

        CodeExerciseProgress progress = tx.execute(status -> {
            UserBlockId id = new UserBlockId(viewer.getId(), blockId);
            CodeExerciseProgress row = progressRepository.findById(id)
                    .orElseGet(() -> CodeExerciseProgress.of(viewer.getId(), blockId));
            row.setLastCode(code);
            row.setUpdatedAt(Instant.now());
            if (allPassed) {
                row.setPassed(true);
            } else if (!row.isPassed()) {
                row.setFailedSubmissions(row.getFailedSubmissions() + 1);
            }
            return progressRepository.save(row);
        });

        // The program's own stderr is only returned when it died outright (syntax error, crash before
        // the tests): while the hidden tests run, anything it writes could spell out what they contain.
        String stderr = result.exitCode() != 0 ? result.stderr() : null;

        return new SubmitResponse(
                allPassed,
                result.passedCount(),
                all.size(),
                visible,
                hiddenPassed,
                hiddenTotal,
                result.compileError(),
                stderr,
                result.timedOut(),
                progress.isPassed(),
                progress.getFailedSubmissions(),
                solutionAvailable(progress));
    }

    public ExerciseProgressResponse progress(UUID blockId, User viewer) {
        return readOnlyTx.execute(status -> {
            LessonBlock block = loadBlockForContent(blockId, viewer);
            requireExerciseBlock(block);
            return progressRepository.findById(new UserBlockId(viewer.getId(), blockId))
                    .map(row -> new ExerciseProgressResponse(
                            blockId, row.isPassed(), row.getFailedSubmissions(), solutionAvailable(row), row.getLastCode()))
                    .orElse(new ExerciseProgressResponse(blockId, false, 0, false, null));
        });
    }

    /** The reference solution, once the student passed or failed enough times; never before. */
    public SolutionResponse solution(UUID blockId, User viewer) {
        return readOnlyTx.execute(status -> {
            LessonBlock block = loadBlockForContent(blockId, viewer);
            requireExerciseBlock(block);

            boolean unlocked = progressRepository.findById(new UserBlockId(viewer.getId(), blockId))
                    .map(CodeExerciseService::solutionAvailable)
                    .orElse(false);
            if (!unlocked) {
                throw new ForbiddenException("A solucao so fica disponivel depois de "
                        + SOLUTION_UNLOCK_AFTER_FAILURES + " envios sem sucesso");
            }
            CodeExercise exercise = exerciseRepository.findById(blockId)
                    .orElseThrow(() -> ResourceNotFoundException.of("Exercicio"));
            return new SolutionResponse(exercise.getSolutionCode());
        });
    }

    private static boolean solutionAvailable(CodeExerciseProgress progress) {
        return progress.isPassed() || progress.getFailedSubmissions() >= SOLUTION_UNLOCK_AFTER_FAILURES;
    }

    // ------------------------------------------------------------------ loading

    private LessonBlock loadBlockForContent(UUID blockId, User viewer) {
        LessonBlock block = blockRepository.findByIdWithCourse(blockId)
                .orElseThrow(() -> ResourceNotFoundException.of("Bloco"));
        accessService.requireContentAccess(block.getLesson().getModule().getCourse(), viewer);
        return block;
    }

    private Loaded loadForStudent(UUID blockId, User viewer) {
        return readOnlyTx.execute(status -> {
            LessonBlock block = loadBlockForContent(blockId, viewer);
            requireExerciseBlock(block);
            CodeExercise exercise = exerciseRepository.findById(blockId)
                    .orElseThrow(() -> ResourceNotFoundException.of("Exercicio"));
            List<String> paramTypes = new ArrayList<>();
            parse(block.getContent()).path("paramTypes").forEach(type -> paramTypes.add(type.asText()));
            return new Loaded(blockId, block.getLanguage(), exercise,
                    testRepository.findByBlockIdOrderByPositionAsc(blockId), paramTypes);
        });
    }

    private void requireExerciseBlock(LessonBlock block) {
        if (block.getType() != BlockType.CODE_EXERCISE) {
            throw new BadRequestException("Este bloco nao e um exercicio de codigo");
        }
    }

    private void requireAreaAllows(UUID courseId) {
        if (!Boolean.TRUE.equals(areaRepository.courseAllowsCodeExercises(courseId))) {
            throw new BadRequestException("A area deste curso ainda nao aceita exercicios de codigo");
        }
    }

    private void rememberCode(UUID userId, UUID blockId, String code) {
        tx.executeWithoutResult(status -> {
            CodeExerciseProgress row = progressRepository.findById(new UserBlockId(userId, blockId))
                    .orElseGet(() -> CodeExerciseProgress.of(userId, blockId));
            row.setLastCode(code);
            row.setUpdatedAt(Instant.now());
            progressRepository.save(row);
        });
    }

    // --------------------------------------------------------------- validation

    private Normalized normalize(String rawLanguage, ExerciseSpec spec) {
        ExerciseMode mode = spec.mode();
        String language = rawLanguage == null ? "" : rawLanguage.trim().toLowerCase(Locale.ROOT);
        List<String> allowed = mode == ExerciseMode.FUNCTION ? FUNCTION_LANGUAGES : OUTPUT_LANGUAGES;
        if (!allowed.contains(language)) {
            throw new BadRequestException("Linguagem nao suportada neste modo de correcao: " + rawLanguage
                    + " (use " + String.join(", ", allowed) + ")");
        }

        List<TestSpec> specs = spec.tests();
        int maxTests = mode == ExerciseMode.FUNCTION ? MAX_FUNCTION_TESTS : MAX_OUTPUT_TESTS;
        if (specs == null || specs.isEmpty() || specs.size() > maxTests) {
            throw new BadRequestException("Informe entre 1 e " + maxTests + " testes");
        }
        if (specs.stream().noneMatch(TestSpec::visible)) {
            throw new BadRequestException("Deixe pelo menos um teste visivel: e o exemplo que o aluno enxerga");
        }

        String functionName = null;
        List<String> params = List.of();
        List<String> paramTypes = List.of();
        String returnType = null;
        List<TestData> tests = new ArrayList<>();

        if (mode == ExerciseMode.FUNCTION) {
            functionName = spec.functionName() == null ? "" : spec.functionName().trim();
            if (!IDENTIFIER.matcher(functionName).matches()) {
                throw new BadRequestException("Nome de funcao invalido");
            }
            params = spec.params() == null ? List.of() : spec.params().stream().map(String::trim).toList();
            if (params.size() > MAX_PARAMS) {
                throw new BadRequestException("No maximo " + MAX_PARAMS + " parametros");
            }
            Set<String> seen = new HashSet<>();
            for (String param : params) {
                if (!IDENTIFIER.matcher(param).matches() || !seen.add(param)) {
                    throw new BadRequestException("Parametro invalido ou repetido: " + param);
                }
            }
            if (language.equals("java")) {
                paramTypes = spec.paramTypes() == null ? List.of() : spec.paramTypes().stream().map(String::trim).toList();
                returnType = spec.returnType() == null ? "" : spec.returnType().trim();
                if (paramTypes.size() != params.size()) {
                    throw new BadRequestException("Informe o tipo de cada parametro (Java e tipado)");
                }
                for (String type : paramTypes) {
                    requireJavaType(type, "parametro");
                }
                requireJavaType(returnType, "retorno");
            }
            for (int i = 0; i < specs.size(); i++) {
                TestSpec test = specs.get(i);
                int number = i + 1;
                if (test.args() == null || test.args().size() != params.size()) {
                    throw new BadRequestException("O teste " + number + " precisa de " + params.size() + " argumento(s)");
                }
                if (test.expected() == null) {
                    throw new BadRequestException("O teste " + number + " precisa do retorno esperado");
                }
                requireSmall(test.expected().toString(), number);
                test.args().forEach(arg -> requireSmall(arg.toString(), number));
                if (language.equals("java")) {
                    for (int arg = 0; arg < params.size(); arg++) {
                        requireFits(paramTypes.get(arg), test.args().get(arg), number, params.get(arg));
                    }
                    requireFits(returnType, test.expected(), number, "retorno esperado");
                }
                tests.add(new TestData(test.visible(), List.copyOf(test.args()), null, test.expected()));
            }
        } else {
            for (int i = 0; i < specs.size(); i++) {
                TestSpec test = specs.get(i);
                int number = i + 1;
                if (test.expected() == null || !test.expected().isTextual()) {
                    throw new BadRequestException("O teste " + number + " precisa da saida esperada (texto)");
                }
                String input = test.input() == null ? "" : test.input();
                requireSmall(input, number);
                requireSmall(test.expected().asText(), number);
                tests.add(new TestData(test.visible(), null, input, test.expected()));
            }
        }

        String title = spec.title() == null || spec.title().isBlank() ? null : spec.title().trim();
        String starter = spec.starterCode() == null ? "" : spec.starterCode();
        return new Normalized(mode, language, title, functionName, params, paramTypes, returnType, starter,
                spec.solutionCode(), tests);
    }

    private void requireJavaType(String type, String what) {
        if (!JavaTypes.isSupported(type)) {
            throw new BadRequestException("Tipo de " + what + " nao suportado em Java: \"" + type
                    + "\" (use int, long, double, boolean, String, int[], String[]..., List<Integer>...)");
        }
    }

    private void requireFits(String type, JsonNode value, int testNumber, String where) {
        String problem = JavaTypes.problemWith(type, value);
        if (problem != null) {
            throw new BadRequestException("Teste " + testNumber + ", " + where + " (" + type + "): " + problem);
        }
    }

    private void requireSmall(String value, int testNumber) {
        if (value.length() > MAX_VALUE_CHARS) {
            throw new BadRequestException("O teste " + testNumber + " tem um valor grande demais (limite de "
                    + MAX_VALUE_CHARS + " caracteres)");
        }
    }

    private ValidationResponse runSolution(Normalized exercise) {
        GatewayRun result = execute(exercise.mode(), exercise.language(), exercise.functionName(),
                exercise.paramTypes(), exercise.solutionCode(), exercise.tests());
        int total = exercise.tests().size();
        boolean valid = result.compileError() == null && result.outcomes().size() == total
                && result.passedCount() == total;
        return new ValidationResponse(valid, result.passedCount(), total, result.outcomes(),
                result.compileError(), result.stderr(), result.output(), result.timedOut());
    }

    private String describeFailure(ValidationResponse validation) {
        if (validation.compileError() != null) {
            return "A solucao de referencia nao compilou";
        }
        return "A solucao de referencia passou em " + validation.passedCount() + " de " + validation.total()
                + " testes. Corrija a solucao ou os testes antes de salvar.";
    }

    // ---------------------------------------------------------------- gateway

    /** Per-test inputs, expected and actual values in the log (dev only: hidden tests' expected values are in there). */
    @Value("${code-runner.log-details:false}")
    private boolean logDetails;

    private GatewayRun execute(ExerciseMode mode, String language, String functionName, List<String> paramTypes,
                               String code, List<TestData> tests) {
        long start = System.nanoTime();
        GatewayRun result = mode == ExerciseMode.FUNCTION
                ? executeFunction(language, functionName, paramTypes, code, tests)
                : executeOutput(language, code, tests);
        logRun(mode, language, functionName, tests, result, (System.nanoTime() - start) / 1_000_000);
        return result;
    }

    /** One summary line per run; with code-runner.log-details also one line per test. Never logs the code itself. */
    private void logRun(ExerciseMode mode, String language, String functionName, List<TestData> tests,
                        GatewayRun result, long millis) {
        log.info("[code-runner] {} {} {}: {}/{} testes passaram em {} ms{}{}", mode.getValue(), language,
                functionName == null ? "" : functionName + "()", result.passedCount(), tests.size(), millis,
                result.compileError() != null ? " (erro de compilacao)" : "",
                result.timedOut() ? " (tempo limite)" : "");
        if (!logDetails) {
            return;
        }
        if (result.compileError() != null) {
            log.info("[code-runner]   compilador: {}", shorten(result.compileError()));
        }
        for (int i = 0; i < tests.size(); i++) {
            TestData test = tests.get(i);
            TestOutcome outcome = i < result.outcomes().size() ? result.outcomes().get(i) : null;
            String entrada = test.args() != null ? test.args().toString() : shorten(test.input());
            log.info("[code-runner]   teste {} ({}) {}  entrada={}  esperado={}  obtido={}{}",
                    i + 1, test.visible() ? "visivel" : "escondido",
                    outcome != null && outcome.passed() ? "OK  " : "FALHA", entrada,
                    shorten(test.expected().toString()),
                    outcome == null || outcome.actual() == null ? "-" : shorten(outcome.actual().toString()),
                    outcome != null && outcome.error() != null ? "  erro=" + shorten(outcome.error()) : "");
        }
    }

    private static String shorten(String value) {
        if (value == null) {
            return "";
        }
        String oneLine = value.replace("\r", "").replace("\n", "\\n");
        return oneLine.length() <= 200 ? oneLine : oneLine.substring(0, 200) + "...";
    }

    private GatewayRun executeFunction(String language, String functionName, List<String> paramTypes, String code,
                                       List<TestData> tests) {
        RunTestsResponse response = gateway.runTests(new RunTestsRequest(language, code, functionName,
                tests.stream().map(test -> new FunctionTest(test.args(), test.expected())).toList(), paramTypes));

        List<TestOutcome> outcomes = new ArrayList<>();
        if (response.results() != null) {
            for (FunctionResult result : response.results()) {
                outcomes.add(new TestOutcome(result.index(), result.passed(), result.actual(), result.error()));
            }
        }
        String compileError = response.compileError() == null || response.compileError().isBlank()
                ? null : response.compileError();
        return new GatewayRun(outcomes, response.passedCount(), compileError, response.stderr(), response.output(),
                response.timedOut(), response.exitCode());
    }

    private GatewayRun executeOutput(String language, String code, List<TestData> tests) {
        RunOutputResponse response = gateway.runOutput(new RunOutputRequest(language, code,
                tests.stream().map(test -> new OutputTest(test.input(), test.expected().asText())).toList()));

        String compileError = response.compileError() == null || response.compileError().isBlank()
                ? null : response.compileError();

        List<TestOutcome> outcomes = new ArrayList<>();
        if (response.results() != null) {
            for (OutputResult result : response.results()) {
                // With a compile error no test ran: the compiler message says it all.
                outcomes.add(new TestOutcome(result.index(), result.passed(),
                        new TextNode(result.actual() == null ? "" : result.actual()),
                        compileError == null ? outputError(result) : null));
            }
        }
        return new GatewayRun(outcomes, response.passedCount(), compileError, null, null,
                outcomes.stream().anyMatch(outcome -> "tempo limite excedido".equals(outcome.error())), 0);
    }

    private String outputError(OutputResult result) {
        if (result.timedOut()) {
            return "tempo limite excedido";
        }
        if (!result.passed() && result.exitCode() != 0) {
            String stderr = result.stderr() == null ? "" : result.stderr().trim();
            if (stderr.length() > MAX_ERROR_CHARS) {
                stderr = stderr.substring(0, MAX_ERROR_CHARS) + "...";
            }
            return stderr.isEmpty() ? "o programa terminou com erro (codigo " + result.exitCode() + ")" : stderr;
        }
        return null;
    }

    // --------------------------------------------------------------- mapping

    private VisibleOutcome visibleOutcome(int index, TestData test, TestOutcome outcome) {
        return new VisibleOutcome(
                index,
                outcome != null && outcome.passed(),
                test.args(),
                test.input(),
                test.expected(),
                outcome == null ? null : outcome.actual(),
                outcome == null ? "nao executado" : outcome.error());
    }

    /** Public half of the exercise, stored in the block's content. Visible tests only. */
    private String publicContent(Normalized exercise) {
        ObjectNode root = objectMapper.createObjectNode();
        root.put("mode", exercise.mode().getValue());
        if (exercise.title() != null) {
            root.put("title", exercise.title());
        }
        if (exercise.mode() == ExerciseMode.FUNCTION) {
            root.put("functionName", exercise.functionName());
            ArrayNode params = root.putArray("params");
            exercise.params().forEach(params::add);
            if (!exercise.paramTypes().isEmpty() || exercise.returnType() != null && !exercise.returnType().isEmpty()) {
                ArrayNode types = root.putArray("paramTypes");
                exercise.paramTypes().forEach(types::add);
                root.put("returnType", exercise.returnType());
            }
        }
        root.put("starterCode", exercise.starterCode());

        ArrayNode examples = root.putArray("examples");
        int hidden = 0;
        for (TestData test : exercise.tests()) {
            if (!test.visible()) {
                hidden++;
                continue;
            }
            ObjectNode example = examples.addObject();
            if (exercise.mode() == ExerciseMode.FUNCTION) {
                ArrayNode args = example.putArray("args");
                test.args().forEach(args::add);
            } else {
                example.put("input", test.input());
            }
            example.set("expected", test.expected());
        }
        root.put("hiddenCount", hidden);
        return root.toString();
    }

    private List<CodeExerciseTest> toEntities(List<TestData> tests) {
        List<CodeExerciseTest> entities = new ArrayList<>();
        for (int i = 0; i < tests.size(); i++) {
            TestData test = tests.get(i);
            ArrayNode args = null;
            if (test.args() != null) {
                args = objectMapper.createArrayNode();
                test.args().forEach(args::add);
            }
            entities.add(CodeExerciseTest.builder()
                    .position(i)
                    .visible(test.visible())
                    .args(args == null ? null : args.toString())
                    .input(test.input())
                    .expected(test.expected().toString())
                    .build());
        }
        return entities;
    }

    private List<TestData> toData(List<CodeExerciseTest> entities) {
        List<TestData> tests = new ArrayList<>();
        for (CodeExerciseTest entity : entities) {
            List<JsonNode> args = null;
            if (entity.getArgs() != null) {
                args = new ArrayList<>();
                parse(entity.getArgs()).forEach(args::add);
            }
            tests.add(new TestData(entity.isVisible(), args, entity.getInput(), parse(entity.getExpected())));
        }
        return tests;
    }

    private TestSpec toSpec(ExerciseMode mode, CodeExerciseTest entity) {
        TestData data = toData(List.of(entity)).get(0);
        return mode == ExerciseMode.FUNCTION
                ? new TestSpec(entity.isVisible(), data.args(), data.expected(), null)
                : new TestSpec(entity.isVisible(), null, data.expected(), data.input());
    }

    private JsonNode parse(String json) {
        try {
            return objectMapper.readTree(json);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("JSON invalido guardado em um exercicio de codigo", e);
        }
    }
}
