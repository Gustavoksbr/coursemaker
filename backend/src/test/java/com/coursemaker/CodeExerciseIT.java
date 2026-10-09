package com.coursemaker;

import com.coursemaker.dto.code.CodeExecutionDtos.FunctionResult;
import com.coursemaker.dto.code.CodeExecutionDtos.OutputResult;
import com.coursemaker.dto.code.CodeExecutionDtos.RunOutputRequest;
import com.coursemaker.dto.code.CodeExecutionDtos.RunOutputResponse;
import com.coursemaker.dto.code.CodeExecutionDtos.RunTestsRequest;
import com.coursemaker.dto.code.CodeExecutionDtos.RunTestsResponse;
import com.coursemaker.service.CodeExecutionService;
import com.coursemaker.support.Fixtures.Curriculum;
import com.coursemaker.support.Fixtures.TestUser;
import com.coursemaker.support.IntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.LongNode;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Auto-graded code exercises. The piston-gateway is replaced by a tiny fake that "runs" two
 * recognisable programs (a sum and a difference), so these tests cover everything around the
 * execution: what is stored, what leaks to students, validation on save, attempts and gating.
 */
class CodeExerciseIT extends IntegrationTest {

    /** Hidden test marker: must never show up in anything a student can read. */
    private static final String HIDDEN_MARKER = "987654";

    private static final String SUM_SOLUTION = "def soma(a, b):\n    return a + b\n";
    private static final String DIFF_SOLUTION = "def soma(a, b):\n    return a - b\n";

    @MockitoBean
    CodeExecutionService gateway;

    @BeforeEach
    void fakeGateway() {
        given(gateway.runTests(any())).willAnswer(invocation -> fakeRunTests(invocation.getArgument(0)));
        given(gateway.runOutput(any())).willAnswer(invocation -> fakeRunOutput(invocation.getArgument(0)));
    }

    @AfterEach
    void restoreAreaFlag() {
        jdbc.update("UPDATE areas SET allows_code_exercises = TRUE WHERE slug = 'programacao'");
    }

    // ----------------------------------------------------------------- creating

    @Test
    @DisplayName("o bloco guarda so a parte publica; solucao e testes escondidos ficam so no servidor")
    void createsExerciseKeepingSecretsOnServer() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser student = fixtures.user("bruno");
        Curriculum curriculum = fixtures.courseWithLessons(owner, "Curso", 1);
        UUID lessonId = curriculum.lessonIds().get(0);

        JsonNode block = createFunctionExercise(owner, lessonId, SUM_SOLUTION);

        assertThat(block.get("type").asText()).isEqualTo("code_exercise");
        assertThat(block.get("language").asText()).isEqualTo("python");
        JsonNode content = json.readTree(block.get("content").asText());
        assertThat(content.get("mode").asText()).isEqualTo("function");
        assertThat(content.get("functionName").asText()).isEqualTo("soma");
        assertThat(content.get("params")).hasSize(2);
        assertThat(content.get("starterCode").asText()).contains("def soma");
        assertThat(content.get("examples")).hasSize(2);
        assertThat(content.get("hiddenCount").asInt()).isEqualTo(1);

        assertThat(count("code_exercises")).isEqualTo(1);
        assertThat(count("code_exercise_tests")).isEqualTo(3);

        // Nothing a student can fetch mentions the hidden test or the solution.
        String blocks = getOk("/api/v1/lessons/" + lessonId + "/blocks", student.caller()).toString();
        String course = getOk("/api/v1/courses/" + curriculum.courseId(), student.caller()).toString();
        for (String visibleToStudent : List.of(blocks, course)) {
            assertThat(visibleToStudent).doesNotContain(HIDDEN_MARKER).doesNotContain("return a + b");
        }
    }

    @Test
    @DisplayName("o dono abre o exercicio completo; o aluno nao")
    void onlyTheOwnerSeesTheFullSpec() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser student = fixtures.user("bruno");
        Curriculum curriculum = fixtures.courseWithLessons(owner, "Curso", 1);
        UUID blockId = blockId(createFunctionExercise(owner, curriculum.lessonIds().get(0), SUM_SOLUTION));

        JsonNode spec = getOk("/api/v1/blocks/" + blockId + "/exercise/spec", owner.caller());
        assertThat(spec.get("language").asText()).isEqualTo("python");
        assertThat(spec.get("exercise").get("solutionCode").asText()).isEqualTo(SUM_SOLUTION);
        assertThat(spec.get("exercise").get("tests")).hasSize(3);
        assertThat(spec.get("exercise").get("tests").get(2).get("visible").asBoolean()).isFalse();
        assertThat(spec.get("exercise").get("params")).hasSize(2);
        assertThat(spec.get("exercise").get("title").asText()).isEqualTo("Soma");

        get("/api/v1/blocks/" + blockId + "/exercise/spec", student.caller()).andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("nao salva um exercicio cuja solucao de referencia falha, e diz qual teste falhou")
    void rejectsExerciseWhoseSolutionFails() throws Exception {
        TestUser owner = fixtures.user("ana");
        Curriculum curriculum = fixtures.courseWithLessons(owner, "Curso", 1);

        JsonNode error = body(post("/api/v1/lessons/" + curriculum.lessonIds().get(0) + "/blocks",
                exerciseBlockBody("python", functionSpec(DIFF_SOLUTION)), owner.caller())
                .andExpect(status().isUnprocessableEntity()));

        JsonNode validation = error.get("validation");
        assertThat(validation.get("valid").asBoolean()).isFalse();
        assertThat(validation.get("results")).hasSize(3);
        assertThat(validation.get("results").get(0).get("passed").asBoolean()).isFalse();
        assertThat(validation.get("results").get(0).get("actual").asLong()).isEqualTo(-1);
        assertThat(count("lesson_blocks")).isZero();
        assertThat(count("code_exercises")).isZero();
    }

    @Test
    @DisplayName("'Testar solucao' responde 200 com o resultado de cada teste, sem salvar nada")
    void validateEndpointReportsWithoutSaving() throws Exception {
        TestUser owner = fixtures.user("ana");
        Curriculum curriculum = fixtures.courseWithLessons(owner, "Curso", 1);
        String path = "/api/v1/courses/" + curriculum.courseId() + "/code-exercise/validate";

        JsonNode bad = postOk(path, Map.of("language", "python", "exercise", functionSpec(DIFF_SOLUTION)),
                owner.caller());
        assertThat(bad.get("valid").asBoolean()).isFalse();
        assertThat(bad.get("passedCount").asInt()).isZero();

        JsonNode good = postOk(path, Map.of("language", "python", "exercise", functionSpec(SUM_SOLUTION)),
                owner.caller());
        assertThat(good.get("valid").asBoolean()).isTrue();
        assertThat(good.get("passedCount").asInt()).isEqualTo(3);

        assertThat(count("code_exercises")).isZero();
    }

    @Test
    @DisplayName("area sem a opcao ligada nao aceita exercicios; so o dono do curso cria")
    void areaFlagAndOwnershipAreEnforced() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser other = fixtures.user("bruno");
        Curriculum curriculum = fixtures.courseWithLessons(owner, "Curso", 1);
        String path = "/api/v1/lessons/" + curriculum.lessonIds().get(0) + "/blocks";

        post(path, exerciseBlockBody("python", functionSpec(SUM_SOLUTION)), other.caller())
                .andExpect(status().is4xxClientError());
        assertThat(count("code_exercises")).isZero();

        jdbc.update("UPDATE areas SET allows_code_exercises = FALSE WHERE slug = 'programacao'");
        post(path, exerciseBlockBody("python", functionSpec(SUM_SOLUTION)), owner.caller())
                .andExpect(status().isBadRequest());
        assertThat(count("code_exercises")).isZero();
    }

    @Test
    @DisplayName("recusa linguagem, funcao e testes invalidos para o modo escolhido")
    void rejectsInvalidSpecs() throws Exception {
        TestUser owner = fixtures.user("ana");
        Curriculum curriculum = fixtures.courseWithLessons(owner, "Curso", 1);
        String path = "/api/v1/lessons/" + curriculum.lessonIds().get(0) + "/blocks";

        // Java is typed: without a type per parameter the exercise cannot be built.
        post(path, exerciseBlockBody("java", functionSpec(SUM_SOLUTION)), owner.caller())
                .andExpect(status().isBadRequest());

        // C is typed too: without a type per parameter the exercise cannot be built.
        post(path, exerciseBlockBody("c", functionSpec(SUM_SOLUTION)), owner.caller())
                .andExpect(status().isBadRequest());

        // Function name must be an identifier.
        Map<String, Object> badName = functionSpec(SUM_SOLUTION);
        badName.put("functionName", "soma; drop");
        post(path, exerciseBlockBody("python", badName), owner.caller()).andExpect(status().isBadRequest());

        // Wrong number of arguments in a test.
        Map<String, Object> badArgs = functionSpec(SUM_SOLUTION);
        badArgs.put("tests", List.of(testCase(true, List.of(1), 1)));
        post(path, exerciseBlockBody("python", badArgs), owner.caller()).andExpect(status().isBadRequest());

        // At least one visible test.
        Map<String, Object> noVisible = functionSpec(SUM_SOLUTION);
        noVisible.put("tests", List.of(testCase(false, List.of(1, 2), 3)));
        post(path, exerciseBlockBody("python", noVisible), owner.caller()).andExpect(status().isBadRequest());

        assertThat(count("lesson_blocks")).isZero();
    }

    @Test
    @DisplayName("editar troca testes e conteudo; converter o tipo do bloco e proibido")
    void updatingReplacesTestsAndForbidsConversion() throws Exception {
        TestUser owner = fixtures.user("ana");
        Curriculum curriculum = fixtures.courseWithLessons(owner, "Curso", 1);
        UUID blockId = blockId(createFunctionExercise(owner, curriculum.lessonIds().get(0), SUM_SOLUTION));

        Map<String, Object> edited = functionSpec(SUM_SOLUTION);
        edited.put("title", "Soma de dois numeros");
        edited.put("tests", List.of(testCase(true, List.of(10, 20), 30)));
        JsonNode updated = patchOk("/api/v1/blocks/" + blockId, Map.of("exercise", edited), owner.caller());

        JsonNode content = json.readTree(updated.get("content").asText());
        assertThat(content.get("title").asText()).isEqualTo("Soma de dois numeros");
        assertThat(content.get("examples")).hasSize(1);
        assertThat(content.get("hiddenCount").asInt()).isZero();
        assertThat(count("code_exercise_tests")).isEqualTo(1);

        // Content sent by the client never overrides the one derived from the spec.
        JsonNode untouched = patchOk("/api/v1/blocks/" + blockId, Map.of("content", "<p>hack</p>"), owner.caller());
        assertThat(untouched.get("content").asText()).doesNotContain("hack");

        // A failing edit leaves the stored exercise as it was.
        Map<String, Object> broken = functionSpec(DIFF_SOLUTION);
        patch("/api/v1/blocks/" + blockId, Map.of("exercise", broken), owner.caller())
                .andExpect(status().isUnprocessableEntity());
        assertThat(count("code_exercise_tests")).isEqualTo(1);

        patch("/api/v1/blocks/" + blockId, Map.of("type", "text"), owner.caller())
                .andExpect(status().isBadRequest());
        UUID textBlock = fixtures.textBlock(owner, curriculum.lessonIds().get(0), "<p>oi</p>");
        patch("/api/v1/blocks/" + textBlock, Map.of("type", "code_exercise"), owner.caller())
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("excluir o bloco leva solucao, testes e andamento dos alunos junto")
    void deletingTheBlockCascades() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser student = fixtures.user("bruno");
        Curriculum curriculum = fixtures.courseWithLessons(owner, "Curso", 1);
        UUID blockId = blockId(createFunctionExercise(owner, curriculum.lessonIds().get(0), SUM_SOLUTION));
        postOk("/api/v1/blocks/" + blockId + "/exercise/submit", Map.of("code", SUM_SOLUTION), student.caller());
        assertThat(count("code_exercise_progress")).isEqualTo(1);

        delete("/api/v1/blocks/" + blockId, owner.caller()).andExpect(status().isNoContent());

        assertThat(count("code_exercises")).isZero();
        assertThat(count("code_exercise_tests")).isZero();
        assertThat(count("code_exercise_progress")).isZero();
    }

    @Test
    @DisplayName("posts ainda nao aceitam exercicios de codigo")
    void postsRejectExercises() throws Exception {
        TestUser owner = fixtures.user("ana");
        UUID postId = fixtures.publishedPost(owner, "Post");

        post("/api/v1/posts/" + postId + "/blocks",
                exerciseBlockBody("python", functionSpec(SUM_SOLUTION)), owner.caller())
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("o admin liga e desliga exercicios de codigo por area; omitir o campo nao mexe nele")
    void adminTogglesAreaFlag() throws Exception {
        TestUser admin = fixtures.admin("root");
        TestUser regular = fixtures.user("ana");
        String path = "/api/v1/areas/" + fixtures.defaultAreaId();

        JsonNode off = patchOk(path, Map.of("name", "Programação", "allowsCodeExercises", false), admin.caller());
        assertThat(off.get("allowsCodeExercises").asBoolean()).isFalse();

        JsonNode renamedOnly = patchOk(path, Map.of("name", "Programação"), admin.caller());
        assertThat(renamedOnly.get("allowsCodeExercises").asBoolean()).isFalse();

        JsonNode on = patchOk(path, Map.of("name", "Programação", "allowsCodeExercises", true), admin.caller());
        assertThat(on.get("allowsCodeExercises").asBoolean()).isTrue();

        patch(path, Map.of("name", "Programação", "allowsCodeExercises", false), regular.caller())
                .andExpect(status().isForbidden());

        // The flag is part of the area every course carries, which is how the editor knows to offer the block.
        TestUser owner = fixtures.user("bia");
        UUID courseId = fixtures.draftCourse(owner, "Curso");
        JsonNode course = getOk("/api/v1/courses/" + courseId, owner.caller());
        assertThat(course.get("summary").get("area").get("allowsCodeExercises").asBoolean()).isTrue();
    }

    // --------------------------------------------------------------- java, function mode

    private static final String JAVA_SUM = "static int soma(int a, int b) {\n  return a + b;\n}\n";
    private static final String JAVA_DIFF = "static int soma(int a, int b) {\n  return a - b;\n}\n";

    private Map<String, Object> javaFunctionSpec(String solution) {
        Map<String, Object> spec = functionSpec(solution);
        spec.put("paramTypes", List.of("int", "int"));
        spec.put("returnType", "int");
        spec.put("starterCode", "static int soma(int a, int b) {\n    return 0;\n}\n");
        return spec;
    }

    @Test
    @DisplayName("Java no modo funcao: tipos viajam ao gateway, ficam no conteudo publico e voltam ao dono")
    void javaFunctionMode() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser student = fixtures.user("bruno");
        Curriculum curriculum = fixtures.courseWithLessons(owner, "Curso", 1);
        UUID lessonId = curriculum.lessonIds().get(0);

        JsonNode block = body(post("/api/v1/lessons/" + lessonId + "/blocks",
                exerciseBlockBody("java", javaFunctionSpec(JAVA_SUM)), owner.caller()).andExpect(status().isCreated()));
        UUID blockId = blockId(block);

        // The gateway was asked to run Java with the declared parameter types.
        ArgumentCaptor<RunTestsRequest> sent = ArgumentCaptor.forClass(RunTestsRequest.class);
        verify(gateway).runTests(sent.capture());
        assertThat(sent.getValue().language()).isEqualTo("java");
        assertThat(sent.getValue().paramTypes()).containsExactly("int", "int");

        JsonNode content = json.readTree(block.get("content").asText());
        assertThat(content.get("paramTypes")).hasSize(2);
        assertThat(content.get("returnType").asText()).isEqualTo("int");

        JsonNode spec = getOk("/api/v1/blocks/" + blockId + "/exercise/spec", owner.caller());
        assertThat(spec.get("exercise").get("paramTypes").get(0).asText()).isEqualTo("int");
        assertThat(spec.get("exercise").get("returnType").asText()).isEqualTo("int");

        JsonNode wrong = postOk("/api/v1/blocks/" + blockId + "/exercise/submit", Map.of("code", JAVA_DIFF), student.caller());
        assertThat(wrong.get("allPassed").asBoolean()).isFalse();
        JsonNode right = postOk("/api/v1/blocks/" + blockId + "/exercise/submit", Map.of("code", JAVA_SUM), student.caller());
        assertThat(right.get("allPassed").asBoolean()).isTrue();
        assertThat(right.toString()).doesNotContain(HIDDEN_MARKER);
    }

    @Test
    @DisplayName("outras linguagens tipadas no modo funcao: Go leva os tipos ao gateway e C recusa arrays")
    void otherTypedLanguagesInFunctionMode() throws Exception {
        TestUser owner = fixtures.user("ana");
        Curriculum curriculum = fixtures.courseWithLessons(owner, "Curso", 1);
        String path = "/api/v1/lessons/" + curriculum.lessonIds().get(0) + "/blocks";

        Map<String, Object> go = javaFunctionSpec("func soma(a int, b int) int {\n  return a + b\n}\n");
        post(path, exerciseBlockBody("go", go), owner.caller()).andExpect(status().isCreated());
        ArgumentCaptor<RunTestsRequest> sent = ArgumentCaptor.forClass(RunTestsRequest.class);
        verify(gateway).runTests(sent.capture());
        assertThat(sent.getValue().language()).isEqualTo("go");
        assertThat(sent.getValue().paramTypes()).containsExactly("int", "int");

        // C only has scalars and text: an array cannot be a parameter.
        Map<String, Object> cArray = javaFunctionSpec("int soma(int a, int b) { return a + b; }\n");
        cArray.put("paramTypes", List.of("int[]", "int"));
        JsonNode error = body(post(path, exerciseBlockBody("c", cArray), owner.caller()).andExpect(status().isBadRequest()));
        assertThat(error.toString()).contains("Em C so ha escalares");

        Map<String, Object> cScalars = javaFunctionSpec("int soma(int a, int b) { return a + b; }\n");
        post(path, exerciseBlockBody("c", cScalars), owner.caller()).andExpect(status().isCreated());
    }

    @Test
    @DisplayName("so oferece e aceita as linguagens que o executor em uso sabe rodar")
    void languagesFollowTheRunner() throws Exception {
        TestUser owner = fixtures.user("ana");
        Curriculum curriculum = fixtures.courseWithLessons(owner, "Curso", 1);
        String path = "/api/v1/lessons/" + curriculum.lessonIds().get(0) + "/blocks";

        // Sem resposta do gateway: vale a lista fixa, com todas as linguagens.
        JsonNode all = getOk("/api/v1/code-exercises/languages", owner.caller());
        assertThat(all.get("function").toString()).contains("go", "rust", "kotlin");

        // Executor que so roda Python e Java (como o local da Render roda 5): o resto some e e recusado.
        given(gateway.runnerLanguages()).willReturn(java.util.Optional.of(
                new com.coursemaker.dto.code.CodeExerciseDtos.LanguagesResponse(List.of("python", "java"), List.of("python"))));
        JsonNode narrowed = getOk("/api/v1/code-exercises/languages", owner.caller());
        assertThat(narrowed.get("function")).hasSize(2);
        assertThat(narrowed.get("output")).hasSize(1);

        Map<String, Object> go = javaFunctionSpec("func soma(a int, b int) int {\n  return a + b\n}\n");
        post(path, exerciseBlockBody("go", go), owner.caller()).andExpect(status().isBadRequest());
        post(path, exerciseBlockBody("python", functionSpec(SUM_SOLUTION)), owner.caller()).andExpect(status().isCreated());
    }

    @Test
    @DisplayName("linguagens dinamicas novas (TypeScript, PHP, Ruby) nao levam tipos e linguagens fora da lista sao recusadas")
    void dynamicLanguagesAndUnknownLanguages() throws Exception {
        TestUser owner = fixtures.user("ana");
        Curriculum curriculum = fixtures.courseWithLessons(owner, "Curso", 1);
        String path = "/api/v1/lessons/" + curriculum.lessonIds().get(0) + "/blocks";

        for (String language : List.of("typescript", "php", "ruby")) {
            post(path, exerciseBlockBody(language, functionSpec(SUM_SOLUTION)), owner.caller())
                    .andExpect(status().isCreated());
        }
        post(path, exerciseBlockBody("brainfuck", functionSpec(SUM_SOLUTION)), owner.caller())
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Java no modo funcao: exige tipos validos e valores que cabem neles")
    void javaFunctionModeValidatesTypes() throws Exception {
        TestUser owner = fixtures.user("ana");
        Curriculum curriculum = fixtures.courseWithLessons(owner, "Curso", 1);
        String path = "/api/v1/lessons/" + curriculum.lessonIds().get(0) + "/blocks";

        Map<String, Object> missingReturn = javaFunctionSpec(JAVA_SUM);
        missingReturn.remove("returnType");
        post(path, exerciseBlockBody("java", missingReturn), owner.caller()).andExpect(status().isBadRequest());

        Map<String, Object> unsupported = javaFunctionSpec(JAVA_SUM);
        unsupported.put("paramTypes", List.of("int", "Object"));
        post(path, exerciseBlockBody("java", unsupported), owner.caller()).andExpect(status().isBadRequest());

        Map<String, Object> tooFewTypes = javaFunctionSpec(JAVA_SUM);
        tooFewTypes.put("paramTypes", List.of("int"));
        post(path, exerciseBlockBody("java", tooFewTypes), owner.caller()).andExpect(status().isBadRequest());

        // A text where an int is declared: the message points at the test and the parameter.
        Map<String, Object> wrongValue = javaFunctionSpec(JAVA_SUM);
        wrongValue.put("tests", List.of(testCase(true, List.of("abc", 3), 5)));
        JsonNode error = body(post(path, exerciseBlockBody("java", wrongValue), owner.caller())
                .andExpect(status().isBadRequest()));
        assertThat(error.get("message").asText()).contains("Teste 1").contains("a (int)").contains("inteiro");

        // The expected value is checked against the return type too.
        Map<String, Object> wrongExpected = javaFunctionSpec(JAVA_SUM);
        wrongExpected.put("returnType", "boolean");
        post(path, exerciseBlockBody("java", wrongExpected), owner.caller()).andExpect(status().isBadRequest());

        // Out of the int range.
        Map<String, Object> tooBig = javaFunctionSpec(JAVA_SUM);
        tooBig.put("tests", List.of(testCase(true, List.of(3000000000L, 1), 5)));
        post(path, exerciseBlockBody("java", tooBig), owner.caller()).andExpect(status().isBadRequest());

        assertThat(count("lesson_blocks")).isZero();
    }

    @Test
    @DisplayName("Java no modo funcao: erro de compilacao da solucao volta como compileError no 422")
    void javaFunctionModeCompileError() throws Exception {
        TestUser owner = fixtures.user("ana");
        Curriculum curriculum = fixtures.courseWithLessons(owner, "Curso", 1);

        JsonNode error = body(post("/api/v1/lessons/" + curriculum.lessonIds().get(0) + "/blocks",
                exerciseBlockBody("java", javaFunctionSpec("CE-JAVA")), owner.caller())
                .andExpect(status().isUnprocessableEntity()));

        assertThat(error.get("validation").get("compileError").asText()).contains("';' expected");
        assertThat(error.get("message").asText()).contains("nao compilou");
    }

    @Test
    @DisplayName("os tipos escalares e de lista cobrem arrays e List<...> nos testes")
    void javaFunctionModeAcceptsArraysAndLists() throws Exception {
        TestUser owner = fixtures.user("ana");
        Curriculum curriculum = fixtures.courseWithLessons(owner, "Curso", 1);
        String path = "/api/v1/courses/" + curriculum.courseId() + "/code-exercise/validate";

        // Validation reaches the (fake) gateway only when every value fits its declared type.
        Map<String, Object> spec = new LinkedHashMap<>();
        spec.put("mode", "function");
        spec.put("functionName", "soma");
        spec.put("params", List.of("a", "b"));
        spec.put("paramTypes", List.of("int[]", "List<String>"));
        spec.put("returnType", "double[]");
        spec.put("solutionCode", JAVA_SUM);
        spec.put("tests", List.of(testCase(true, List.of(List.of(1, 2), List.of("x", "y")), List.of(1, 2.5))));
        // The shapes are fine (so no 400); the fake runner cannot read arrays, hence the 5xx is its own doing.
        int httpStatus = post(path, Map.of("language", "java", "exercise", spec), owner.caller())
                .andReturn().getResponse().getStatus();
        assertThat(httpStatus).isNotEqualTo(400);

        Map<String, Object> bad = new LinkedHashMap<>(spec);
        bad.put("tests", List.of(testCase(true, List.of(List.of(1, "dois"), List.of("x")), List.of(1))));
        post(path, Map.of("language", "java", "exercise", bad), owner.caller()).andExpect(status().isBadRequest());
    }

    // ------------------------------------------------------------------ student

    @Test
    @DisplayName("fluxo do aluno: exemplos nao contam, solucao sempre disponivel, conclusao exige resolver")
    void studentFlow() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser student = fixtures.user("bruno");
        Curriculum curriculum = fixtures.courseWithLessons(owner, "Curso", 1);
        enroll(curriculum.courseId(), student.caller());
        UUID lessonId = curriculum.lessonIds().get(0);
        UUID blockId = blockId(createFunctionExercise(owner, lessonId, SUM_SOLUTION));
        String base = "/api/v1/blocks/" + blockId + "/exercise";

        // "Executar exemplos": only the two visible tests run, and nothing is counted.
        JsonNode run = postOk(base + "/run", Map.of("code", SUM_SOLUTION), student.caller());
        assertThat(run.get("allPassed").asBoolean()).isTrue();
        assertThat(run.get("total").asInt()).isEqualTo(2);
        assertThat(run.get("tests")).hasSize(2);
        assertThat(run.get("tests").get(0).get("expected").asLong()).isEqualTo(5);
        assertThat(run.toString()).doesNotContain(HIDDEN_MARKER);
        JsonNode afterRun = getOk(base + "/progress", student.caller());
        assertThat(afterRun.get("failedSubmissions").asInt()).isZero();
        assertThat(afterRun.get("lastCode").asText()).isEqualTo(SUM_SOLUTION);

        // The lesson cannot be completed yet.
        post("/api/v1/lessons/" + lessonId + "/complete", null, student.caller()).andExpect(status().isBadRequest());

        // The solution is open from the start - nothing to earn first.
        assertThat(getOk(base + "/solution", student.caller()).get("solutionCode").asText()).isEqualTo(SUM_SOLUTION);

        // First wrong submission: counted.
        JsonNode first = postOk(base + "/submit", Map.of("code", DIFF_SOLUTION), student.caller());
        assertThat(first.get("allPassed").asBoolean()).isFalse();
        assertThat(first.get("failedSubmissions").asInt()).isEqualTo(1);
        assertThat(first.get("solutionAvailable").asBoolean()).isTrue();
        assertThat(first.get("hiddenTotal").asInt()).isEqualTo(1);
        assertThat(first.get("hiddenPassed").asInt()).isZero();
        assertThat(first.get("visible")).hasSize(2);
        assertThat(first.toString()).doesNotContain(HIDDEN_MARKER);

        JsonNode second = postOk(base + "/submit", Map.of("code", DIFF_SOLUTION), student.caller());
        assertThat(second.get("failedSubmissions").asInt()).isEqualTo(2);
        assertThat(second.get("solutionAvailable").asBoolean()).isTrue();

        // Passing: permanent, and it unlocks the lesson.
        JsonNode passed = postOk(base + "/submit", Map.of("code", SUM_SOLUTION), student.caller());
        assertThat(passed.get("allPassed").asBoolean()).isTrue();
        assertThat(passed.get("exercisePassed").asBoolean()).isTrue();
        assertThat(passed.get("hiddenPassed").asInt()).isEqualTo(1);
        assertThat(passed.toString()).doesNotContain(HIDDEN_MARKER);

        JsonNode afterPass = postOk(base + "/submit", Map.of("code", DIFF_SOLUTION), student.caller());
        assertThat(afterPass.get("allPassed").asBoolean()).isFalse();
        assertThat(afterPass.get("exercisePassed").asBoolean()).isTrue();
        assertThat(afterPass.get("failedSubmissions").asInt()).isEqualTo(2);

        JsonNode course = getOk("/api/v1/courses/" + curriculum.courseId(), student.caller());
        List<String> passedIds = new ArrayList<>();
        course.get("passedExerciseBlockIds").forEach(id -> passedIds.add(id.asText()));
        assertThat(passedIds).containsExactly(blockId.toString());

        postOk("/api/v1/lessons/" + lessonId + "/complete", null, student.caller());
    }

    @Test
    @DisplayName("a solucao esta disponivel sem ter tentado nada")
    void solutionAvailableWithoutAnyAttempt() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser student = fixtures.user("bruno");
        Curriculum curriculum = fixtures.courseWithLessons(owner, "Curso", 1);
        UUID blockId = blockId(createFunctionExercise(owner, curriculum.lessonIds().get(0), SUM_SOLUTION));

        getOk("/api/v1/blocks/" + blockId + "/exercise/solution", student.caller());
    }

    @Test
    @DisplayName("modo saida: o programa roda com o input de cada teste")
    void outputMode() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser student = fixtures.user("bruno");
        Curriculum curriculum = fixtures.courseWithLessons(owner, "Curso", 1);
        UUID lessonId = curriculum.lessonIds().get(0);

        Map<String, Object> spec = new LinkedHashMap<>();
        spec.put("mode", "output");
        spec.put("starterCode", "// leia dois numeros e imprima a soma");
        spec.put("solutionCode", "SUM");
        spec.put("tests", List.of(
                outputTest(true, "2 3\n", "5"),
                outputTest(true, "10 20\n", "30"),
                outputTest(false, "987000 654\n", HIDDEN_MARKER)));
        UUID blockId = blockId(body(post("/api/v1/lessons/" + lessonId + "/blocks",
                exerciseBlockBody("cpp", spec), owner.caller()).andExpect(status().isCreated())));

        JsonNode content = json.readTree(getOk("/api/v1/lessons/" + lessonId + "/blocks", student.caller())
                .get(0).get("content").asText());
        assertThat(content.get("mode").asText()).isEqualTo("output");
        assertThat(content.get("examples").get(0).get("input").asText()).isEqualTo("2 3\n");
        assertThat(content.has("functionName")).isFalse();

        JsonNode wrong = postOk("/api/v1/blocks/" + blockId + "/exercise/submit",
                Map.of("code", "BAD"), student.caller());
        assertThat(wrong.get("allPassed").asBoolean()).isFalse();
        assertThat(wrong.get("visible").get(0).get("actual").asText()).contains("6");

        JsonNode right = postOk("/api/v1/blocks/" + blockId + "/exercise/submit",
                Map.of("code", "SUM"), student.caller());
        assertThat(right.get("allPassed").asBoolean()).isTrue();
        assertThat(right.get("hiddenPassed").asInt()).isEqualTo(1);
    }

    @Test
    @DisplayName("modo saida: programa que nao compila e rejeitado ao salvar, com a mensagem do compilador")
    void outputModeCompileError() throws Exception {
        TestUser owner = fixtures.user("ana");
        Curriculum curriculum = fixtures.courseWithLessons(owner, "Curso", 1);

        Map<String, Object> spec = new LinkedHashMap<>();
        spec.put("mode", "output");
        spec.put("solutionCode", "CE");
        spec.put("tests", List.of(outputTest(true, "1\n", "1")));

        JsonNode error = body(post("/api/v1/lessons/" + curriculum.lessonIds().get(0) + "/blocks",
                exerciseBlockBody("cpp", spec), owner.caller()).andExpect(status().isUnprocessableEntity()));
        assertThat(error.get("validation").get("compileError").asText()).contains("erro de compilacao");
        assertThat(error.get("message").asText()).contains("nao compilou");
    }

    @Test
    @DisplayName("quem nao tem acesso ao curso nao executa nem envia")
    void accessIsRequired() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser outsider = fixtures.user("carla");
        UUID courseId = fixtures.privateCourse(owner, "Privado", "segredo123");
        UUID moduleId = fixtures.module(owner, courseId, "Modulo");
        UUID lessonId = fixtures.lesson(owner, moduleId, "Licao");
        UUID blockId = blockId(createFunctionExercise(owner, lessonId, SUM_SOLUTION));

        post("/api/v1/blocks/" + blockId + "/exercise/run", Map.of("code", SUM_SOLUTION), outsider.caller())
                .andExpect(status().is4xxClientError());
        post("/api/v1/blocks/" + blockId + "/exercise/submit", Map.of("code", SUM_SOLUTION), Caller.ANONYMOUS)
                .andExpect(status().isUnauthorized());
        assertThat(count("code_exercise_progress")).isZero();
    }

    @Test
    @DisplayName("limita quantas execucoes um usuario faz por minuto")
    void rateLimitsRuns() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser student = fixtures.user("bruno");
        Curriculum curriculum = fixtures.courseWithLessons(owner, "Curso", 1);
        UUID blockId = blockId(createFunctionExercise(owner, curriculum.lessonIds().get(0), SUM_SOLUTION));

        int accepted = 0;
        boolean limited = false;
        for (int i = 0; i < 40 && !limited; i++) {
            int httpStatus = post("/api/v1/blocks/" + blockId + "/exercise/run", Map.of("code", SUM_SOLUTION),
                    student.caller()).andReturn().getResponse().getStatus();
            if (httpStatus == 429) {
                limited = true;
            } else {
                assertThat(httpStatus).isEqualTo(200);
                accepted++;
            }
        }
        assertThat(limited).isTrue();
        assertThat(accepted).isEqualTo(30);
    }

    // ------------------------------------------------------------------ helpers

    private JsonNode createFunctionExercise(TestUser owner, UUID lessonId, String solution) throws Exception {
        return body(post("/api/v1/lessons/" + lessonId + "/blocks",
                exerciseBlockBody("python", functionSpec(solution)), owner.caller())
                .andExpect(status().isCreated()));
    }

    private Map<String, Object> exerciseBlockBody(String language, Map<String, Object> spec) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("type", "code_exercise");
        body.put("language", language);
        body.put("exercise", spec);
        return body;
    }

    private Map<String, Object> functionSpec(String solution) {
        Map<String, Object> spec = new LinkedHashMap<>();
        spec.put("mode", "function");
        spec.put("title", "Soma");
        spec.put("functionName", "soma");
        spec.put("params", List.of("a", "b"));
        spec.put("starterCode", "def soma(a, b):\n    pass\n");
        spec.put("solutionCode", solution);
        spec.put("tests", List.of(
                testCase(true, List.of(2, 3), 5),
                testCase(true, List.of(-5, -7), -12),
                testCase(false, List.of(987000, 654), Integer.parseInt(HIDDEN_MARKER))));
        return spec;
    }

    private Map<String, Object> testCase(boolean visible, List<Object> args, Object expected) {
        Map<String, Object> test = new LinkedHashMap<>();
        test.put("visible", visible);
        test.put("args", args);
        test.put("expected", expected);
        return test;
    }

    private Map<String, Object> outputTest(boolean visible, String input, String expected) {
        Map<String, Object> test = new LinkedHashMap<>();
        test.put("visible", visible);
        test.put("input", input);
        test.put("expected", expected);
        return test;
    }

    private UUID blockId(JsonNode block) {
        return UUID.fromString(block.get("id").asText());
    }

    private long count(String table) {
        Long count = jdbc.queryForObject("SELECT count(*) FROM " + table, Long.class);
        return count == null ? 0 : count;
    }

    // -------------------------------------------------------------- fake gateway

    /** "Runs" a function: a + b, a - b, or anything else (every test errors out). */
    private RunTestsResponse fakeRunTests(RunTestsRequest request) {
        List<FunctionResult> results = new ArrayList<>();
        if (request.code().equals("CE-JAVA")) {
            for (int i = 0; i < request.tests().size(); i++) {
                results.add(new FunctionResult(i, false, null, "o programa terminou antes de executar este teste"));
            }
            return new RunTestsResponse(results, 0, results.size(), "", "", 1, false, "Main.java:2: error: ';' expected");
        }
        int passed = 0;
        for (int i = 0; i < request.tests().size(); i++) {
            var test = request.tests().get(i);
            long a = test.args().get(0).asLong();
            long b = test.args().get(1).asLong();
            if (request.code().contains("a + b") || request.code().contains("a - b")) {
                long actual = request.code().contains("a + b") ? a + b : a - b;
                boolean ok = actual == test.expected().asLong();
                passed += ok ? 1 : 0;
                results.add(new FunctionResult(i, ok, LongNode.valueOf(actual), null));
            } else {
                results.add(new FunctionResult(i, false, null, "NameError: nao entendi o codigo"));
            }
        }
        return new RunTestsResponse(results, passed, results.size(), "", "", 0, false, null);
    }

    /** "Runs" a program: SUM prints the sum of the input, BAD prints one more, CE does not compile. */
    private RunOutputResponse fakeRunOutput(RunOutputRequest request) {
        List<OutputResult> results = new ArrayList<>();
        if (request.code().equals("CE")) {
            for (int i = 0; i < request.tests().size(); i++) {
                results.add(new OutputResult(i, false, "", "", 1, false));
            }
            return new RunOutputResponse(results, 0, results.size(), "main.cpp:1: erro de compilacao");
        }
        int passed = 0;
        for (int i = 0; i < request.tests().size(); i++) {
            var test = request.tests().get(i);
            String[] numbers = test.input().trim().split("\\s+");
            long sum = Long.parseLong(numbers[0]) + Long.parseLong(numbers[1]) + (request.code().equals("BAD") ? 1 : 0);
            String actual = sum + "\n";
            boolean ok = actual.trim().equals(test.expected().trim());
            passed += ok ? 1 : 0;
            results.add(new OutputResult(i, ok, actual, "", 0, false));
        }
        return new RunOutputResponse(results, passed, results.size(), null);
    }
}
