package com.coursemaker;

import com.coursemaker.support.Fixtures.TestUser;
import com.coursemaker.support.IntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Modules, lessons and content blocks: CRUD, ordering and who is allowed to touch them. */
class CurriculumIT extends IntegrationTest {

    @Test
    @DisplayName("modulos e licoes nascem no fim, com ordem sequencial")
    void newItemsAreAppendedInOrder() throws Exception {
        TestUser owner = fixtures.user("ana");
        UUID courseId = fixtures.draftCourse(owner, "Curso");

        fixtures.module(owner, courseId, "Primeiro");
        fixtures.module(owner, courseId, "Segundo");
        UUID third = fixtures.module(owner, courseId, "Terceiro");

        JsonNode modules = getOk("/api/v1/courses/" + courseId + "/modules", owner.caller());
        assertThat(modules).hasSize(3);
        assertThat(modules.get(0).get("order").asInt()).isZero();
        assertThat(modules.get(2).get("order").asInt()).isEqualTo(2);
        assertThat(modules.get(2).get("id").asText()).isEqualTo(third.toString());
    }

    @Test
    @DisplayName("reordena modulos e persiste a nova ordem")
    void reordersModules() throws Exception {
        TestUser owner = fixtures.user("ana");
        UUID courseId = fixtures.draftCourse(owner, "Curso");
        UUID first = fixtures.module(owner, courseId, "Primeiro");
        UUID second = fixtures.module(owner, courseId, "Segundo");
        UUID third = fixtures.module(owner, courseId, "Terceiro");

        putOk("/api/v1/courses/" + courseId + "/modules/reorder",
                Map.of("ids", List.of(third, first, second)), owner.caller());

        JsonNode modules = getOk("/api/v1/courses/" + courseId + "/modules", owner.caller());
        assertThat(titles(modules)).containsExactly("Terceiro", "Primeiro", "Segundo");
    }

    @Test
    @DisplayName("reordena licoes dentro do modulo")
    void reordersLessons() throws Exception {
        TestUser owner = fixtures.user("ana");
        UUID courseId = fixtures.draftCourse(owner, "Curso");
        UUID moduleId = fixtures.module(owner, courseId, "Modulo");
        UUID a = fixtures.lesson(owner, moduleId, "A");
        UUID b = fixtures.lesson(owner, moduleId, "B");

        putOk("/api/v1/modules/" + moduleId + "/lessons/reorder",
                Map.of("ids", List.of(b, a)), owner.caller());

        JsonNode lessons = getOk("/api/v1/modules/" + moduleId + "/lessons", owner.caller());
        assertThat(titles(lessons)).containsExactly("B", "A");
    }

    @Test
    @DisplayName("excluir modulo leva as licoes e os blocos junto")
    void deletingModuleCascades() throws Exception {
        TestUser owner = fixtures.user("ana");
        UUID courseId = fixtures.draftCourse(owner, "Curso");
        UUID moduleId = fixtures.module(owner, courseId, "Modulo");
        UUID lessonId = fixtures.lesson(owner, moduleId, "Licao");
        fixtures.textBlock(owner, lessonId, "<p>Oi</p>");

        delete("/api/v1/modules/" + moduleId, owner.caller()).andExpect(status().isNoContent());

        assertThat(count("modules")).isZero();
        assertThat(count("lessons")).isZero();
        assertThat(count("lesson_blocks")).isZero();
        // The course itself survives.
        assertThat(count("courses")).isEqualTo(1);
    }

    @Test
    @DisplayName("estranhos nao criam nem alteram curriculo")
    void strangersCannotTouchTheCurriculum() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser stranger = fixtures.user("bruno");
        UUID courseId = fixtures.publishedCourse(owner, "Curso");
        UUID moduleId = fixtures.module(owner, courseId, "Modulo");
        UUID lessonId = fixtures.lesson(owner, moduleId, "Licao");

        post("/api/v1/courses/" + courseId + "/modules", Map.of("title", "Invasao"), stranger.caller())
                .andExpect(status().isForbidden());
        patch("/api/v1/modules/" + moduleId, Map.of("title", "Renomeado"), stranger.caller())
                .andExpect(status().isForbidden());
        delete("/api/v1/lessons/" + lessonId, stranger.caller())
                .andExpect(status().isForbidden());
        post("/api/v1/lessons/" + lessonId + "/blocks",
                Map.of("type", "text", "content", "<p>x</p>"), stranger.caller())
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("visitante anonimo precisa de autenticacao para escrever")
    void anonymousCannotWrite() throws Exception {
        TestUser owner = fixtures.user("ana");
        UUID courseId = fixtures.publishedCourse(owner, "Curso");

        post("/api/v1/courses/" + courseId + "/modules", Map.of("title", "Invasao"), Caller.ANONYMOUS)
                .andExpect(status().isUnauthorized());
    }

    // ------------------------------------------------------------------ blocks

    @Test
    @DisplayName("cria blocos de cada tipo e devolve na ordem")
    void createsBlocksOfEveryType() throws Exception {
        TestUser owner = fixtures.user("ana");
        UUID lessonId = lessonOf(owner);

        postOk("/api/v1/lessons/" + lessonId + "/blocks",
                Map.of("type", "text", "content", "<p>Introducao</p>"), owner.caller());
        postOk("/api/v1/lessons/" + lessonId + "/blocks",
                Map.of("type", "code", "content", "System.out.println();", "language", "java"), owner.caller());
        postOk("/api/v1/lessons/" + lessonId + "/blocks",
                Map.of("type", "image", "content", "https://cdn.example.com/a.png"), owner.caller());
        postOk("/api/v1/lessons/" + lessonId + "/blocks",
                Map.of("type", "video", "content", "https://youtube.com/watch?v=abc"), owner.caller());

        JsonNode blocks = getOk("/api/v1/lessons/" + lessonId + "/blocks", owner.caller());
        assertThat(blocks).hasSize(4);
        assertThat(blocks.get(0).get("type").asText()).isEqualTo("text");
        assertThat(blocks.get(1).get("language").asText()).isEqualTo("java");
        assertThat(blocks.get(3).get("type").asText()).isEqualTo("video");
    }

    @Test
    @DisplayName("sanitiza o HTML dos blocos de texto")
    void sanitizesTextBlocks() throws Exception {
        TestUser owner = fixtures.user("ana");
        UUID lessonId = lessonOf(owner);

        JsonNode block = postOk("/api/v1/lessons/" + lessonId + "/blocks", Map.of(
                "type", "text",
                "content", "<p>Ola <strong>mundo</strong></p><script>alert('xss')</script>"
                        + "<img src=x onerror=alert(1)>"), owner.caller());

        String content = block.get("content").asText();
        assertThat(content).contains("<strong>mundo</strong>");
        assertThat(content).doesNotContain("<script>", "onerror");
    }

    @Test
    @DisplayName("atualiza e reordena blocos")
    void updatesAndReordersBlocks() throws Exception {
        TestUser owner = fixtures.user("ana");
        UUID lessonId = lessonOf(owner);
        UUID first = fixtures.textBlock(owner, lessonId, "<p>Primeiro</p>");
        UUID second = fixtures.textBlock(owner, lessonId, "<p>Segundo</p>");

        JsonNode updated = patchOk("/api/v1/blocks/" + first,
                Map.of("content", "<p>Editado</p>"), owner.caller());
        assertThat(updated.get("content").asText()).contains("Editado");

        putOk("/api/v1/lessons/" + lessonId + "/blocks/reorder",
                Map.of("ids", List.of(second, first)), owner.caller());

        JsonNode blocks = getOk("/api/v1/lessons/" + lessonId + "/blocks", owner.caller());
        assertThat(blocks.get(0).get("id").asText()).isEqualTo(second.toString());
    }

    @Test
    @DisplayName("blocos de rascunho ficam invisiveis para estranhos")
    void draftBlocksAreHiddenFromStrangers() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser stranger = fixtures.user("bruno");
        UUID lessonId = lessonOf(owner);
        fixtures.textBlock(owner, lessonId, "<p>Segredo</p>");

        get("/api/v1/lessons/" + lessonId + "/blocks", stranger.caller())
                .andExpect(status().isNotFound());
        assertThat(getOk("/api/v1/lessons/" + lessonId + "/blocks", owner.caller())).hasSize(1);
    }

    @Test
    @DisplayName("bloco com tipo desconhecido e rejeitado")
    void rejectsUnknownBlockType() throws Exception {
        TestUser owner = fixtures.user("ana");
        UUID lessonId = lessonOf(owner);

        post("/api/v1/lessons/" + lessonId + "/blocks",
                Map.of("type", "hologram", "content", "x"), owner.caller())
                .andExpect(status().isBadRequest());
    }

    // ----------------------------------------------------------------- helpers

    private UUID lessonOf(TestUser owner) {
        UUID courseId = fixtures.draftCourse(owner, "Curso " + UUID.randomUUID());
        UUID moduleId = fixtures.module(owner, courseId, "Modulo");
        return fixtures.lesson(owner, moduleId, "Licao");
    }

    private List<String> titles(JsonNode array) {
        return java.util.stream.StreamSupport.stream(array.spliterator(), false)
                .map(node -> node.get("title").asText())
                .toList();
    }

    private long count(String table) {
        return jdbc.queryForObject("SELECT count(*) FROM " + table, Long.class);
    }
}
