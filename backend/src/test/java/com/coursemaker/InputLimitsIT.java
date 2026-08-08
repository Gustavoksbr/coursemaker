package com.coursemaker;

import com.coursemaker.support.Fixtures.TestUser;
import com.coursemaker.support.IntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Every oversized input - a request body field past its {@code @Size}, or a query parameter past
 * its own limit - must answer 400, never 500 and never a silent truncation. Boundary cases confirm
 * the limits are not stricter than documented (a value right at the max still succeeds).
 */
@DisplayName("Limites de tamanho de entrada")
class InputLimitsIT extends IntegrationTest {

    private static String chars(int length) {
        return "a".repeat(length);
    }

    // ------------------------------------------------------------------- auth

    @Test
    @DisplayName("senha de registro alem de 72 caracteres (limite do BCrypt) e rejeitada")
    void registerPasswordPast72CharsIsRejected() throws Exception {
        post("/api/v1/auth/register",
                Map.of("email", "ana@example.com", "password", chars(73), "name", "Ana"),
                Caller.ANONYMOUS)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.password").exists());
    }

    @Test
    @DisplayName("senha de exatamente 72 caracteres e aceita")
    void registerPasswordAt72CharsSucceeds() throws Exception {
        post("/api/v1/auth/register",
                Map.of("email", "ana@example.com", "password", chars(72), "name", "Ana"),
                Caller.ANONYMOUS)
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("senha de login alem de 72 caracteres e rejeitada com 400, nao processada")
    void loginPasswordPast72CharsIsRejected() throws Exception {
        post("/api/v1/auth/login", Map.of("email", "ana@example.com", "password", chars(200)),
                Caller.ANONYMOUS)
                .andExpect(status().isBadRequest());
    }

    // ----------------------------------------------------------------- courses

    @Test
    @DisplayName("senha de curso privado alem de 72 caracteres e rejeitada")
    void privateCoursePasswordPast72CharsIsRejected() throws Exception {
        TestUser owner = fixtures.user("ana");

        post("/api/v1/courses", Map.of(
                "name", "Curso Fechado",
                "visibility", "private",
                "password", chars(73)), owner.caller())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.password").exists());
    }

    @Test
    @DisplayName("categoria alem de 50 caracteres e rejeitada")
    void categoryPast50CharsIsRejected() throws Exception {
        TestUser owner = fixtures.user("ana");

        post("/api/v1/courses", Map.of("name", "Curso", "categories", List.of(chars(51))),
                owner.caller())
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("categoria de exatamente 50 caracteres e aceita")
    void categoryAt50CharsSucceeds() throws Exception {
        TestUser owner = fixtures.user("ana");

        post("/api/v1/courses", Map.of("name", "Curso", "categories", List.of(chars(50))),
                owner.caller())
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("filtro de autor alem de 30 caracteres e rejeitado com 400")
    void authorFilterPast30CharsIsRejected() throws Exception {
        get("/api/v1/courses?author=" + chars(31), Caller.ANONYMOUS).andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("termo de busca de curso alem de 200 caracteres e rejeitado com 400")
    void courseSearchTermPast200CharsIsRejected() throws Exception {
        get("/api/v1/courses?q=" + chars(201), Caller.ANONYMOUS).andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("nome no slug-check alem de 255 caracteres e rejeitado com 400")
    void slugCheckNamePast255CharsIsRejected() throws Exception {
        TestUser owner = fixtures.user("ana");

        get("/api/v1/courses/slug-check?name=" + chars(256), owner.caller())
                .andExpect(status().isBadRequest());
    }

    // ------------------------------------------------------------------- blocks

    @Test
    @DisplayName("conteudo de bloco alem de 100000 caracteres e rejeitado")
    void blockContentPast100000CharsIsRejected() throws Exception {
        TestUser owner = fixtures.user("ana");
        UUID lessonId = lessonOf(owner);

        post("/api/v1/lessons/" + lessonId + "/blocks",
                Map.of("type", "text", "content", chars(100_001)), owner.caller())
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("conteudo de bloco de exatamente 100000 caracteres e aceito")
    void blockContentAt100000CharsSucceeds() throws Exception {
        TestUser owner = fixtures.user("ana");
        UUID lessonId = lessonOf(owner);

        post("/api/v1/lessons/" + lessonId + "/blocks",
                Map.of("type", "text", "content", chars(100_000)), owner.caller())
                .andExpect(status().isCreated());
    }

    // -------------------------------------------------------------------- users

    @Test
    @DisplayName("nickname na checagem de disponibilidade alem de 30 caracteres e rejeitado")
    void nicknameAvailabilityCheckPast30CharsIsRejected() throws Exception {
        get("/api/v1/users/nickname-available?nickname=" + chars(31), Caller.ANONYMOUS)
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("stack alem de 50 caracteres e rejeitada")
    void stackPast50CharsIsRejected() throws Exception {
        TestUser user = fixtures.user("ana");

        patch("/api/v1/users/" + user.id(), Map.of("stacks", List.of(chars(51))), user.caller())
                .andExpect(status().isBadRequest());
    }

    // ---------------------------------------------------------------------- posts

    @Test
    @DisplayName("titulo no slug-check de post alem de 255 caracteres e rejeitado")
    void postSlugCheckTitlePast255CharsIsRejected() throws Exception {
        TestUser owner = fixtures.user("ana");

        get("/api/v1/posts/slug-check?title=" + chars(256), owner.caller())
                .andExpect(status().isBadRequest());
    }

    // ----------------------------------------------------------------- helpers

    private UUID lessonOf(TestUser owner) {
        UUID courseId = fixtures.draftCourse(owner, "Curso " + UUID.randomUUID());
        UUID moduleId = fixtures.module(owner, courseId, "Modulo");
        return fixtures.lesson(owner, moduleId, "Licao");
    }
}
