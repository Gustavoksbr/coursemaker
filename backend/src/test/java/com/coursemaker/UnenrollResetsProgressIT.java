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

/** Unenrolling doubles as "start this course over". */
class UnenrollResetsProgressIT extends IntegrationTest {

    @Test
    @DisplayName("desmatricular zera o progresso; matricular de novo comeca do zero")
    void unenrollingWipesProgress() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser student = fixtures.user("bruno");
        Curriculum curriculum = fixtures.courseWithLessons(owner, "Curso", 2);
        UUID courseId = curriculum.courseId();

        postOk("/api/v1/enrollments", Map.of("courseId", courseId), student.caller());
        for (UUID lessonId : curriculum.lessonIds()) {
            postOk("/api/v1/lessons/" + lessonId + "/complete", null, student.caller());
        }
        JsonNode finished = getOk("/api/v1/courses/" + courseId + "/progress", student.caller());
        assertThat(finished.get("completedLessons").asLong()).isEqualTo(2);
        assertThat(finished.get("percentage").asInt()).isEqualTo(100);

        // Someone else's progress must survive.
        TestUser other = fixtures.user("carla");
        postOk("/api/v1/enrollments", Map.of("courseId", courseId), other.caller());
        postOk("/api/v1/lessons/" + curriculum.lessonIds().get(0) + "/complete", null, other.caller());

        delete("/api/v1/enrollments/" + courseId, student.caller()).andExpect(status().isOk());
        postOk("/api/v1/enrollments", Map.of("courseId", courseId), student.caller());

        JsonNode restarted = getOk("/api/v1/courses/" + courseId + "/progress", student.caller());
        assertThat(restarted.get("completedLessons").asLong()).isZero();
        assertThat(restarted.get("percentage").asInt()).isZero();

        JsonNode untouched = getOk("/api/v1/courses/" + courseId + "/progress", other.caller());
        assertThat(untouched.get("completedLessons").asLong()).isEqualTo(1);
    }
}
