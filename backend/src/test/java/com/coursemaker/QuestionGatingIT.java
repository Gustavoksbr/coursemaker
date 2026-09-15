package com.coursemaker;

import com.coursemaker.support.Fixtures.Curriculum;
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

/**
 * A lesson with QUESTION blocks cannot be marked complete until every one of them has a correct
 * answer on record - see ProgressService#requireQuestionsAnswered. Progress tracking itself is no
 * longer opt-in (see CourseFlowIT for that), so every course exercised here is a plain default one.
 */
@DisplayName("Conclusao de licao com questoes obrigatorias")
class QuestionGatingIT extends IntegrationTest {

    private static List<Map<String, Object>> alternatives(String correctText, String wrongText) {
        return List.of(
                Map.of("id", "a", "text", correctText, "correct", true, "explanation", ""),
                Map.of("id", "b", "text", wrongText, "correct", false, "explanation", ""));
    }

    @Test
    @DisplayName("nao deixa concluir a licao com a questao pendente")
    void blocksCompletionUntilAnswered() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser student = fixtures.user("bruno");
        Curriculum curriculum = fixtures.courseWithLessons(owner, "Curso", 1);
        fixtures.questionBlock(owner, curriculum.lessonIds().get(0), alternatives("Certa", "Errada"));

        post("/api/v1/lessons/" + curriculum.lessonIds().get(0) + "/complete", null, student.caller())
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("libera a conclusao assim que a alternativa correta e enviada")
    void unlocksAfterCorrectAnswer() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser student = fixtures.user("bruno");
        Curriculum curriculum = fixtures.courseWithLessons(owner, "Curso", 1);
        UUID lessonId = curriculum.lessonIds().get(0);
        UUID blockId = fixtures.questionBlock(owner, lessonId, alternatives("Certa", "Errada"));

        JsonNode wrongAnswer = fixtures.answerBlock(student, blockId, "b");
        assertThat(wrongAnswer.get("correct").asBoolean()).isFalse();
        post("/api/v1/lessons/" + lessonId + "/complete", null, student.caller())
                .andExpect(status().isBadRequest());

        JsonNode rightAnswer = fixtures.answerBlock(student, blockId, "a");
        assertThat(rightAnswer.get("correct").asBoolean()).isTrue();
        JsonNode progress = postOk("/api/v1/lessons/" + lessonId + "/complete", null, student.caller());
        assertThat(progress.get("completedLessons").asLong()).isEqualTo(1);
    }

    @Test
    @DisplayName("aula com duas questoes exige as duas corretas")
    void requiresEveryQuestionBlockInTheLesson() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser student = fixtures.user("bruno");
        Curriculum curriculum = fixtures.courseWithLessons(owner, "Curso", 1);
        UUID lessonId = curriculum.lessonIds().get(0);
        UUID first = fixtures.questionBlock(owner, lessonId, alternatives("Certa 1", "Errada 1"));
        UUID second = fixtures.questionBlock(owner, lessonId, alternatives("Certa 2", "Errada 2"));

        fixtures.answerBlock(student, first, "a");
        post("/api/v1/lessons/" + lessonId + "/complete", null, student.caller())
                .andExpect(status().isBadRequest());

        fixtures.answerBlock(student, second, "a");
        postOk("/api/v1/lessons/" + lessonId + "/complete", null, student.caller());
    }

    @Test
    @DisplayName("a resposta correta persiste e aparece no detalhe do curso")
    void answeredBlockIdsSurviveAReload() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser student = fixtures.user("bruno");
        Curriculum curriculum = fixtures.courseWithLessons(owner, "Curso", 1);
        UUID blockId = fixtures.questionBlock(owner, curriculum.lessonIds().get(0), alternatives("Certa", "Errada"));

        fixtures.answerBlock(student, blockId, "a");

        JsonNode detail = getOk("/api/v1/courses/" + curriculum.courseId(), student.caller());
        List<String> answeredIds = new java.util.ArrayList<>();
        detail.get("answeredQuestionBlockIds").forEach(node -> answeredIds.add(node.asText()));
        assertThat(answeredIds).containsExactly(blockId.toString());
    }

    @Test
    @DisplayName("lessons sem bloco de questao continuam concluindo normalmente")
    void lessonsWithoutQuestionsStillCompleteNormally() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser student = fixtures.user("bruno");
        Curriculum curriculum = fixtures.courseWithLessons(owner, "Curso", 1);

        postOk("/api/v1/lessons/" + curriculum.lessonIds().get(0) + "/complete", null, student.caller());
    }
}
