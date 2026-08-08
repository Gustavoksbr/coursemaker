package com.coursemaker;

import com.coursemaker.support.Fixtures.TestUser;
import com.coursemaker.support.IntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Enrolment, and the password gate that guards private courses. */
class EnrollmentAndPrivateAccessIT extends IntegrationTest {

    private static final String COURSE_PASSWORD = "abre-te-sesamo";

    @Test
    @DisplayName("matricula e desmatricula em curso publico")
    void enrollsAndUnenrolls() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser student = fixtures.user("bruno");
        UUID courseId = fixtures.publishedCourse(owner, "Curso Publico");

        JsonNode enrolled = postOk("/api/v1/enrollments", Map.of("courseId", courseId), student.caller());
        assertThat(enrolled.get("enrolled").asBoolean()).isTrue();
        assertThat(enrolled.get("enrollmentCount").asLong()).isEqualTo(1);

        // Enrolling twice is idempotent rather than an error.
        assertThat(postOk("/api/v1/enrollments", Map.of("courseId", courseId), student.caller())
                .get("enrollmentCount").asLong()).isEqualTo(1);

        JsonNode left = body(delete("/api/v1/enrollments/" + courseId, student.caller())
                .andExpect(status().isOk()));
        assertThat(left.get("enrolled").asBoolean()).isFalse();
        assertThat(left.get("enrollmentCount").asLong()).isZero();
    }

    @Test
    @DisplayName("nao da para se matricular em rascunho nem no proprio curso")
    void rejectsInvalidEnrollments() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser student = fixtures.user("bruno");
        UUID draft = fixtures.draftCourse(owner, "Rascunho");
        UUID published = fixtures.publishedCourse(owner, "Publicado");

        // A stranger cannot even see the draft.
        post("/api/v1/enrollments", Map.of("courseId", draft), student.caller())
                .andExpect(status().isNotFound());
        post("/api/v1/enrollments", Map.of("courseId", draft), owner.caller())
                .andExpect(status().isForbidden());
        post("/api/v1/enrollments", Map.of("courseId", published), owner.caller())
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("curso privado mostra a landing mas esconde o conteudo")
    void privateCourseHidesContentButShowsLanding() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser student = fixtures.user("bruno");
        UUID courseId = fixtures.privateCourse(owner, "Curso Fechado", COURSE_PASSWORD);
        UUID moduleId = fixtures.module(owner, courseId, "Modulo");
        fixtures.lesson(owner, moduleId, "Licao");

        JsonNode detail = getOk("/api/v1/courses/" + courseId, student.caller());

        assertThat(detail.get("summary").get("name").asText()).isEqualTo("Curso Fechado");
        assertThat(detail.get("requiresPassword").asBoolean()).isTrue();
        assertThat(detail.get("canViewContent").asBoolean()).isFalse();
        assertThat(detail.get("modules")).isEmpty();
        // The owner never has to type their own password.
        assertThat(getOk("/api/v1/courses/" + courseId, owner.caller())
                .get("canViewContent").asBoolean()).isTrue();
    }

    @Test
    @DisplayName("senha correta libera o conteudo e continua liberado nas proximas visitas")
    void validatingPasswordUnlocksContentForGood() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser student = fixtures.user("bruno");
        UUID courseId = fixtures.privateCourse(owner, "Curso Fechado", COURSE_PASSWORD);
        UUID moduleId = fixtures.module(owner, courseId, "Modulo");
        fixtures.lesson(owner, moduleId, "Licao");

        JsonNode granted = postOk("/api/v1/enrollments/private-access/validate",
                Map.of("courseId", courseId, "password", COURSE_PASSWORD), student.caller());
        assertThat(granted.get("granted").asBoolean()).isTrue();

        JsonNode detail = getOk("/api/v1/courses/" + courseId, student.caller());
        assertThat(detail.get("canViewContent").asBoolean()).isTrue();
        assertThat(detail.get("requiresPassword").asBoolean()).isFalse();
        assertThat(detail.get("modules")).hasSize(1);

        // Both rows exist: "access now" and "has proven the password before".
        assertThat(accessRows(student, courseId)).isEqualTo(1);
        assertThat(verifiedRows(student, courseId)).isEqualTo(1);
    }

    @Test
    @DisplayName("senha errada responde 401 e nao libera nada")
    void wrongPasswordIsRejected() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser student = fixtures.user("bruno");
        UUID courseId = fixtures.privateCourse(owner, "Curso Fechado", COURSE_PASSWORD);

        post("/api/v1/enrollments/private-access/validate",
                Map.of("courseId", courseId, "password", "chute"), student.caller())
                .andExpect(status().isUnauthorized());

        assertThat(accessRows(student, courseId)).isZero();
        assertThat(getOk("/api/v1/courses/" + courseId, student.caller())
                .get("canViewContent").asBoolean()).isFalse();
    }

    @Test
    @DisplayName("bloqueia por 15 minutos apos 5 senhas erradas")
    void blocksAfterFiveWrongPasswords() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser student = fixtures.user("bruno");
        UUID courseId = fixtures.privateCourse(owner, "Curso Fechado", COURSE_PASSWORD);

        for (int attempt = 1; attempt <= 5; attempt++) {
            post("/api/v1/enrollments/private-access/validate",
                    Map.of("courseId", courseId, "password", "chute"), student.caller())
                    .andExpect(status().isUnauthorized());
        }

        // The sixth attempt is refused before the password is even checked - even a correct one.
        post("/api/v1/enrollments/private-access/validate",
                Map.of("courseId", courseId, "password", COURSE_PASSWORD), student.caller())
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"));
    }

    @Test
    @DisplayName("matricula em curso privado aceita a senha no mesmo request")
    void enrollingInPrivateCourseAcceptsPasswordInline() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser student = fixtures.user("bruno");
        UUID courseId = fixtures.privateCourse(owner, "Curso Fechado", COURSE_PASSWORD);

        post("/api/v1/enrollments", Map.of("courseId", courseId), student.caller())
                .andExpect(status().isForbidden());

        JsonNode enrolled = postOk("/api/v1/enrollments",
                Map.of("courseId", courseId, "password", COURSE_PASSWORD), student.caller());
        assertThat(enrolled.get("enrolled").asBoolean()).isTrue();
        assertThat(accessRows(student, courseId)).isEqualTo(1);
    }

    @Test
    @DisplayName("dono revoga o acesso e a senha volta a ser exigida")
    void ownerCanRevokeAccess() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser student = fixtures.user("bruno");
        UUID courseId = fixtures.privateCourse(owner, "Curso Fechado", COURSE_PASSWORD);
        postOk("/api/v1/enrollments/private-access/validate",
                Map.of("courseId", courseId, "password", COURSE_PASSWORD), student.caller());

        post("/api/v1/courses/" + courseId + "/revoke-access/" + student.id(), null, student.caller())
                .andExpect(status().isForbidden());
        post("/api/v1/courses/" + courseId + "/revoke-access/" + student.id(), null, owner.caller())
                .andExpect(status().isNoContent());

        // Both rows go, otherwise the next page load would silently hand access straight back.
        assertThat(accessRows(student, courseId)).isZero();
        assertThat(verifiedRows(student, courseId)).isZero();
        assertThat(getOk("/api/v1/courses/" + courseId, student.caller())
                .get("requiresPassword").asBoolean()).isTrue();
    }

    @Test
    @DisplayName("dono lista os matriculados; estranhos nao")
    void ownerListsStudents() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser student = fixtures.user("bruno");
        UUID courseId = fixtures.publishedCourse(owner, "Curso");
        postOk("/api/v1/enrollments", Map.of("courseId", courseId), student.caller());

        JsonNode students = getOk("/api/v1/courses/" + courseId + "/students", owner.caller());
        assertThat(students).hasSize(1);
        assertThat(students.get(0).get("user").get("nickname").asText()).isEqualTo("bruno");
        assertThat(students.get(0).get("hasPrivateAccess").asBoolean()).isFalse();

        get("/api/v1/courses/" + courseId + "/students", student.caller())
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("lista os cursos em que o usuario esta matriculado")
    void listsMyEnrollments() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser student = fixtures.user("bruno");
        UUID first = fixtures.publishedCourse(owner, "Curso Um");
        fixtures.publishedCourse(owner, "Curso Dois");
        postOk("/api/v1/enrollments", Map.of("courseId", first), student.caller());

        JsonNode mine = getOk("/api/v1/enrollments/me", student.caller());
        assertThat(mine).hasSize(1);
        assertThat(mine.get(0).get("name").asText()).isEqualTo("Curso Um");
        assertThat(mine.get(0).get("enrolledByMe").asBoolean()).isTrue();
    }

    // ----------------------------------------------------------------- helpers

    private static org.springframework.test.web.servlet.result.HeaderResultMatchers header() {
        return org.springframework.test.web.servlet.result.MockMvcResultMatchers.header();
    }

    private long accessRows(TestUser user, UUID courseId) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM private_course_access WHERE user_id = ? AND course_id = ?",
                Long.class, user.id(), courseId);
    }

    private long verifiedRows(TestUser user, UUID courseId) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM private_course_verified WHERE user_id = ? AND course_id = ?",
                Long.class, user.id(), courseId);
    }
}
