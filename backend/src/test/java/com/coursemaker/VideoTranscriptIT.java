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

/** A video's transcript belongs to the author and the AI assistant: students never get it back. */
class VideoTranscriptIT extends IntegrationTest {

    private static final String VIDEO = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

    @Test
    @DisplayName("o autor guarda a transcricao e recebe de volta; aluno, visitante e a pagina do curso nao")
    void onlyTheOwnerGetsTheTranscriptBack() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser student = fixtures.user("bruno");
        Curriculum curriculum = fixtures.courseWithLessons(owner, "Curso", 1);
        UUID lessonId = curriculum.lessonIds().get(0);

        JsonNode created = postOk("/api/v1/lessons/" + lessonId + "/blocks",
                Map.of("type", "video", "content", VIDEO, "transcript", "0:00\nBem-vindos ao curso"), owner.caller());
        assertThat(created.get("transcript").asText()).isEqualTo("0:00\nBem-vindos ao curso");

        assertThat(blockWithTranscript(getOk("/api/v1/lessons/" + lessonId + "/blocks", owner.caller()))).isTrue();
        assertThat(blockWithTranscript(getOk("/api/v1/lessons/" + lessonId + "/blocks", student.caller()))).isFalse();
        assertThat(blockWithTranscript(getOk("/api/v1/lessons/" + lessonId + "/blocks", Caller.ANONYMOUS))).isFalse();

        String publicPage = getOk("/api/v1/courses/" + curriculum.courseId(), student.caller()).toString();
        assertThat(publicPage).contains(VIDEO).doesNotContain("transcript", "Bem-vindos ao curso");
    }

    @Test
    @DisplayName("editar a transcricao troca o texto; mandar vazio remove; sem o campo, nada muda")
    void updateReplacesClearsOrLeavesTheTranscript() throws Exception {
        TestUser owner = fixtures.user("ana");
        Curriculum curriculum = fixtures.courseWithLessons(owner, "Curso", 1);
        UUID lessonId = curriculum.lessonIds().get(0);
        UUID blockId = UUID.fromString(postOk("/api/v1/lessons/" + lessonId + "/blocks",
                Map.of("type", "video", "content", VIDEO), owner.caller()).get("id").asText());

        JsonNode saved = patchOk("/api/v1/blocks/" + blockId, Map.of("transcript", "primeira versao"), owner.caller());
        assertThat(saved.get("transcript").asText()).isEqualTo("primeira versao");

        // editing something else keeps it
        patchOk("/api/v1/blocks/" + blockId, Map.of("content", VIDEO + "&t=10"), owner.caller());
        assertThat(getOk("/api/v1/lessons/" + lessonId + "/blocks", owner.caller()).get(0).get("transcript").asText())
                .isEqualTo("primeira versao");

        patchOk("/api/v1/blocks/" + blockId, Map.of("transcript", "segunda versao"), owner.caller());
        assertThat(getOk("/api/v1/lessons/" + lessonId + "/blocks", owner.caller()).get(0).get("transcript").asText())
                .isEqualTo("segunda versao");

        patchOk("/api/v1/blocks/" + blockId, Map.of("transcript", "   "), owner.caller());
        assertThat(getOk("/api/v1/lessons/" + lessonId + "/blocks", owner.caller()).get(0).has("transcript")).isFalse();
    }

    @Test
    @DisplayName("so blocos de video aceitam transcricao, e ela tem tamanho maximo")
    void rejectsTranscriptsOnOtherBlocksAndOversizedOnes() throws Exception {
        TestUser owner = fixtures.user("ana");
        Curriculum curriculum = fixtures.courseWithLessons(owner, "Curso", 1);
        UUID lessonId = curriculum.lessonIds().get(0);

        post("/api/v1/lessons/" + lessonId + "/blocks",
                Map.of("type", "text", "content", "<p>oi</p>", "transcript", "nao cabe aqui"), owner.caller())
                .andExpect(status().isBadRequest());

        post("/api/v1/lessons/" + lessonId + "/blocks",
                Map.of("type", "video", "content", VIDEO, "transcript", "x".repeat(100_001)), owner.caller())
                .andExpect(status().isBadRequest());

        UUID textBlock = fixtures.textBlock(owner, lessonId, "<p>texto</p>");
        patch("/api/v1/blocks/" + textBlock, Map.of("transcript", "nao cabe aqui"), owner.caller())
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("quem nao e dono nao consegue gravar transcricao")
    void aStrangerCannotWriteATranscript() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser stranger = fixtures.user("carla");
        Curriculum curriculum = fixtures.courseWithLessons(owner, "Curso", 1);
        UUID lessonId = curriculum.lessonIds().get(0);
        UUID blockId = UUID.fromString(postOk("/api/v1/lessons/" + lessonId + "/blocks",
                Map.of("type", "video", "content", VIDEO), owner.caller()).get("id").asText());

        patch("/api/v1/blocks/" + blockId, Map.of("transcript", "invasao"), stranger.caller())
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("posts tambem guardam a transcricao so para o autor")
    void postsKeepTheTranscriptForTheAuthorOnly() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser reader = fixtures.user("bruno");
        UUID postId = fixtures.publishedPost(owner, "Post com video");

        JsonNode created = postOk("/api/v1/posts/" + postId + "/blocks",
                Map.of("type", "video", "content", VIDEO, "transcript", "0:00\nOla"), owner.caller());
        assertThat(created.get("transcript").asText()).isEqualTo("0:00\nOla");

        assertThat(blockWithTranscript(getOk("/api/v1/posts/" + postId + "/blocks", owner.caller()))).isTrue();
        assertThat(blockWithTranscript(getOk("/api/v1/posts/" + postId + "/blocks", reader.caller()))).isFalse();
        assertThat(getOk("/api/v1/posts/" + postId, reader.caller()).toString()).doesNotContain("transcript");
    }

    private static boolean blockWithTranscript(JsonNode blocks) {
        for (JsonNode block : blocks) {
            if (block.has("transcript")) {
                return true;
            }
        }
        return false;
    }
}
