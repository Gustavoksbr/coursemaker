package com.coursemaker;

import com.coursemaker.support.Fixtures.Curriculum;
import com.coursemaker.support.Fixtures.TestUser;
import com.coursemaker.support.IntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Likes, lesson progress and comments. */
class EngagementIT extends IntegrationTest {

    // ------------------------------------------------------------------ likes

    @Test
    @DisplayName("curte e descurte um curso, com contador consistente")
    void togglesCourseLike() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser fan = fixtures.user("bruno");
        UUID courseId = fixtures.publishedCourse(owner, "Curso");

        JsonNode liked = postOk("/api/v1/courses/" + courseId + "/like", null, fan.caller());
        assertThat(liked.get("liked").asBoolean()).isTrue();
        assertThat(liked.get("likeCount").asLong()).isEqualTo(1);

        // Liking twice must not inflate the count.
        assertThat(postOk("/api/v1/courses/" + courseId + "/like", null, fan.caller())
                .get("likeCount").asLong()).isEqualTo(1);

        JsonNode unliked = body(delete("/api/v1/courses/" + courseId + "/like", fan.caller())
                .andExpect(status().isOk()));
        assertThat(unliked.get("liked").asBoolean()).isFalse();
        assertThat(unliked.get("likeCount").asLong()).isZero();
    }

    @Test
    @DisplayName("likedByMe reflete quem esta perguntando")
    void likedByMeIsPerViewer() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser fan = fixtures.user("bruno");
        UUID courseId = fixtures.publishedCourse(owner, "Curso");
        postOk("/api/v1/courses/" + courseId + "/like", null, fan.caller());

        assertThat(summaryOf(courseId, fan).get("likedByMe").asBoolean()).isTrue();
        assertThat(summaryOf(courseId, owner).get("likedByMe").asBoolean()).isFalse();
        assertThat(getOk("/api/v1/courses/" + courseId, Caller.ANONYMOUS)
                .get("summary").get("likedByMe").asBoolean()).isFalse();
    }

    @Test
    @DisplayName("curtir exige autenticacao")
    void likingRequiresAuthentication() throws Exception {
        TestUser owner = fixtures.user("ana");
        UUID courseId = fixtures.publishedCourse(owner, "Curso");

        post("/api/v1/courses/" + courseId + "/like", null, Caller.ANONYMOUS)
                .andExpect(status().isUnauthorized());
    }

    // --------------------------------------------------------------- progress

    @Test
    @DisplayName("marca e desmarca licoes, atualizando o percentual")
    void tracksLessonProgress() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser student = fixtures.user("bruno");
        Curriculum curriculum = fixtures.courseWithLessons(owner, "Curso", 4);

        JsonNode afterOne = postOk("/api/v1/lessons/" + curriculum.lessonIds().get(0) + "/complete",
                null, student.caller());
        assertThat(afterOne.get("completedLessons").asLong()).isEqualTo(1);
        assertThat(afterOne.get("totalLessons").asLong()).isEqualTo(4);
        assertThat(afterOne.get("percentage").asInt()).isEqualTo(25);

        postOk("/api/v1/lessons/" + curriculum.lessonIds().get(1) + "/complete", null, student.caller());
        assertThat(getOk("/api/v1/courses/" + curriculum.courseId() + "/progress", student.caller())
                .get("percentage").asInt()).isEqualTo(50);

        JsonNode afterUndo = body(delete("/api/v1/lessons/" + curriculum.lessonIds().get(0) + "/complete",
                student.caller()).andExpect(status().isOk()));
        assertThat(afterUndo.get("completedLessons").asLong()).isEqualTo(1);
    }

    @Test
    @DisplayName("o progresso e por usuario")
    void progressIsPerUser() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser bruno = fixtures.user("bruno");
        TestUser carla = fixtures.user("carla");
        Curriculum curriculum = fixtures.courseWithLessons(owner, "Curso", 2);

        postOk("/api/v1/lessons/" + curriculum.lessonIds().get(0) + "/complete", null, bruno.caller());

        assertThat(getOk("/api/v1/courses/" + curriculum.courseId() + "/progress", bruno.caller())
                .get("completedLessons").asLong()).isEqualTo(1);
        assertThat(getOk("/api/v1/courses/" + curriculum.courseId() + "/progress", carla.caller())
                .get("completedLessons").asLong()).isZero();
    }

    @Test
    @DisplayName("o curriculo marca as licoes ja concluidas")
    void curriculumFlagsCompletedLessons() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser student = fixtures.user("bruno");
        Curriculum curriculum = fixtures.courseWithLessons(owner, "Curso", 2);
        postOk("/api/v1/lessons/" + curriculum.lessonIds().get(0) + "/complete", null, student.caller());

        JsonNode lessons = getOk("/api/v1/courses/" + curriculum.courseId(), student.caller())
                .get("modules").get(0).get("lessons");

        assertThat(lessons.get(0).get("completed").asBoolean()).isTrue();
        assertThat(lessons.get(1).get("completed").asBoolean()).isFalse();
    }

    @Test
    @DisplayName("todo curso acompanha progresso, sem precisar habilitar nada")
    void tracksProgressByDefault() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser student = fixtures.user("bruno");
        Curriculum curriculum = fixtures.courseWithLessons(owner, "Curso", 1);

        JsonNode progress = postOk("/api/v1/lessons/" + curriculum.lessonIds().get(0) + "/complete",
                null, student.caller());
        assertThat(progress.get("completedLessons").asLong()).isEqualTo(1);
        assertThat(progress.get("percentage").asInt()).isEqualTo(100);
    }

    // --------------------------------------------------------------- comments

    @Test
    @DisplayName("publica comentario e resposta aninhada")
    void postsCommentsAndReplies() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser student = fixtures.user("bruno");
        UUID courseId = fixtures.publishedCourse(owner, "Curso");

        JsonNode root = postOk("/api/v1/courses/" + courseId + "/comments",
                Map.of("content", "Otimo curso!"), student.caller());
        postOk("/api/v1/courses/" + courseId + "/comments",
                Map.of("content", "Obrigada!", "parentId", root.get("id").asText()), owner.caller());

        JsonNode comments = getOk("/api/v1/courses/" + courseId + "/comments", Caller.ANONYMOUS);
        assertThat(comments).hasSize(1);
        assertThat(comments.get(0).get("author").get("nickname").asText()).isEqualTo("bruno");
        assertThat(comments.get(0).get("replies")).hasSize(1);
        assertThat(comments.get(0).get("replies").get(0).get("content").asText()).isEqualTo("Obrigada!");
    }

    @Test
    @DisplayName("resposta de resposta continua no mesmo nivel")
    void threadsStayOneLevelDeep() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser student = fixtures.user("bruno");
        UUID courseId = fixtures.publishedCourse(owner, "Curso");

        JsonNode root = postOk("/api/v1/courses/" + courseId + "/comments",
                Map.of("content", "Raiz"), student.caller());
        JsonNode reply = postOk("/api/v1/courses/" + courseId + "/comments",
                Map.of("content", "Resposta", "parentId", root.get("id").asText()), owner.caller());
        postOk("/api/v1/courses/" + courseId + "/comments",
                Map.of("content", "Resposta da resposta", "parentId", reply.get("id").asText()),
                student.caller());

        JsonNode comments = getOk("/api/v1/courses/" + courseId + "/comments", Caller.ANONYMOUS);
        assertThat(comments).hasSize(1);
        // The third comment attaches to the root, not to the reply.
        assertThat(comments.get(0).get("replies")).hasSize(2);
    }

    @Test
    @DisplayName("autor e dono do curso podem excluir; terceiros nao")
    void deletePermissionsOnComments() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser author = fixtures.user("bruno");
        TestUser other = fixtures.user("carla");
        UUID courseId = fixtures.publishedCourse(owner, "Curso");

        JsonNode comment = postOk("/api/v1/courses/" + courseId + "/comments",
                Map.of("content", "Comentario"), author.caller());
        String commentId = comment.get("id").asText();

        assertThat(comment.get("canDelete").asBoolean()).isTrue();
        assertThat(getOk("/api/v1/courses/" + courseId + "/comments", other.caller())
                .get(0).get("canDelete").asBoolean()).isFalse();

        delete("/api/v1/comments/" + commentId, other.caller()).andExpect(status().isForbidden());
        delete("/api/v1/comments/" + commentId, owner.caller()).andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("dono bane um usuario, que perde o direito de comentar")
    void ownerCanBanACommenter() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser troll = fixtures.user("bruno");
        UUID courseId = fixtures.publishedCourse(owner, "Curso");
        postOk("/api/v1/courses/" + courseId + "/comments", Map.of("content", "Ola"), troll.caller());

        post("/api/v1/courses/" + courseId + "/bans/" + troll.id(), null, troll.caller())
                .andExpect(status().isForbidden());
        post("/api/v1/courses/" + courseId + "/bans/" + troll.id(), null, owner.caller())
                .andExpect(status().isNoContent());

        post("/api/v1/courses/" + courseId + "/comments", Map.of("content", "De novo"), troll.caller())
                .andExpect(status().isForbidden());
        // The ban hides nothing that was already published.
        assertThat(getOk("/api/v1/courses/" + courseId + "/comments", Caller.ANONYMOUS)).hasSize(1);

        assertThat(getOk("/api/v1/courses/" + courseId + "/bans", owner.caller())).hasSize(1);

        delete("/api/v1/courses/" + courseId + "/bans/" + troll.id(), owner.caller())
                .andExpect(status().isNoContent());
        postOk("/api/v1/courses/" + courseId + "/comments", Map.of("content", "Voltei"), troll.caller());
    }

    @Test
    @DisplayName("comentario tem o HTML sanitizado")
    void sanitizesCommentContent() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser student = fixtures.user("bruno");
        UUID courseId = fixtures.publishedCourse(owner, "Curso");

        JsonNode comment = postOk("/api/v1/courses/" + courseId + "/comments",
                Map.of("content", "Legal <script>alert('xss')</script>"), student.caller());

        assertThat(comment.get("content").asText()).doesNotContain("<script>");
    }

    @Test
    @DisplayName("comentar exige autenticacao")
    void commentingRequiresAuthentication() throws Exception {
        TestUser owner = fixtures.user("ana");
        UUID courseId = fixtures.publishedCourse(owner, "Curso");

        post("/api/v1/courses/" + courseId + "/comments", Map.of("content", "Oi"), Caller.ANONYMOUS)
                .andExpect(status().isUnauthorized());
    }

    // ----------------------------------------------------------------- helpers

    private JsonNode summaryOf(UUID courseId, TestUser viewer) throws Exception {
        return getOk("/api/v1/courses/" + courseId, viewer.caller()).get("summary");
    }
}
