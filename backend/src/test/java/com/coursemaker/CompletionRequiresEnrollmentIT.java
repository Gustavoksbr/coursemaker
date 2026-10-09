package com.coursemaker;

import com.coursemaker.support.Fixtures.Curriculum;
import com.coursemaker.support.Fixtures.TestUser;
import com.coursemaker.support.IntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Marking lessons as done needs an enrollment; the student's own work is saved either way. */
class CompletionRequiresEnrollmentIT extends IntegrationTest {

    @Test
    @DisplayName("sem matricula da para ver e responder, mas nao marcar a aula como concluida; matriculado, o trabalho ja feito conta")
    void completionNeedsEnrollmentButWorkIsKept() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser visitor = fixtures.user("bruno");
        Curriculum curriculum = fixtures.courseWithLessons(owner, "Curso", 1);
        UUID lessonId = curriculum.lessonIds().get(0);
        UUID blockId = fixtures.questionBlock(owner, lessonId, QuestionGatingIT.alternatives("Certa", "Errada"));

        // Without enrolling: reading the course and answering a question both work and are saved...
        getOk("/api/v1/courses/" + curriculum.courseId(), visitor.caller());
        assertThat(fixtures.answerBlock(visitor, blockId, "a").get("correct").asBoolean()).isTrue();
        JsonNode detail = getOk("/api/v1/courses/" + curriculum.courseId(), visitor.caller());
        List<String> answered = new ArrayList<>();
        detail.get("answeredQuestionBlockIds").forEach(node -> answered.add(node.asText()));
        assertThat(answered).containsExactly(blockId.toString());

        // ...but the lesson cannot be marked (or unmarked) as done.
        post("/api/v1/lessons/" + lessonId + "/complete", null, visitor.caller()).andExpect(status().isForbidden());
        delete("/api/v1/lessons/" + lessonId + "/complete", visitor.caller()).andExpect(status().isForbidden());
        assertThat(getOk("/api/v1/courses/" + curriculum.courseId() + "/progress", visitor.caller())
                .get("completedLessons").asLong()).isZero();

        // Enrolling is enough: the answer given earlier already counts.
        enroll(curriculum.courseId(), visitor.caller());
        JsonNode progress = postOk("/api/v1/lessons/" + lessonId + "/complete", null, visitor.caller());
        assertThat(progress.get("completedLessons").asLong()).isEqualTo(1);
        assertThat(progress.get("percentage").asInt()).isEqualTo(100);
    }

    @Test
    @DisplayName("anonimo continua sem poder concluir nada")
    void anonymousStillGetsUnauthorized() throws Exception {
        TestUser owner = fixtures.user("ana");
        Curriculum curriculum = fixtures.courseWithLessons(owner, "Curso", 1);

        post("/api/v1/lessons/" + curriculum.lessonIds().get(0) + "/complete", null, Caller.ANONYMOUS)
                .andExpect(status().isUnauthorized());
    }
}
