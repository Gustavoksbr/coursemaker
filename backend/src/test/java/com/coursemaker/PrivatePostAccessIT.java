package com.coursemaker;

import com.coursemaker.support.Fixtures.TestUser;
import com.coursemaker.support.IntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** The password gate that guards private posts, mirroring EnrollmentAndPrivateAccessIT for courses. */
class PrivatePostAccessIT extends IntegrationTest {

    private static final String POST_PASSWORD = "abre-te-sesamo";

    @Test
    @DisplayName("post privado exige senha na criacao")
    void creatingPrivatePostRequiresPassword() throws Exception {
        TestUser owner = fixtures.user("ana");
        post("/api/v1/posts", Map.of("title", "Post Fechado", "visibility", "private"), owner.caller())
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("post privado mostra o resumo mas esconde os blocos")
    void privatePostHidesContentButShowsSummary() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser reader = fixtures.user("bruno");
        UUID postId = fixtures.privatePost(owner, "Post Fechado", POST_PASSWORD);
        fixtures.postTextBlock(owner, postId, "<p>Segredo</p>");

        JsonNode detail = getOk("/api/v1/posts/" + postId, reader.caller());

        assertThat(detail.get("summary").get("title").asText()).isEqualTo("Post Fechado");
        assertThat(detail.get("requiresPassword").asBoolean()).isTrue();
        assertThat(detail.get("hasPassword").asBoolean()).isTrue();
        assertThat(detail.get("blocks")).isEmpty();
        // The owner never has to type their own password.
        JsonNode ownerView = getOk("/api/v1/posts/" + postId, owner.caller());
        assertThat(ownerView.get("requiresPassword").asBoolean()).isFalse();
        assertThat(ownerView.get("blocks")).hasSize(1);
    }

    @Test
    @DisplayName("senha correta libera o conteudo e continua liberado nas proximas visitas")
    void validatingPasswordUnlocksContentForGood() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser reader = fixtures.user("bruno");
        UUID postId = fixtures.privatePost(owner, "Post Fechado", POST_PASSWORD);
        fixtures.postTextBlock(owner, postId, "<p>Segredo</p>");

        JsonNode granted = postOk("/api/v1/posts/private-access/validate",
                Map.of("postId", postId, "password", POST_PASSWORD), reader.caller());
        assertThat(granted.get("granted").asBoolean()).isTrue();

        JsonNode detail = getOk("/api/v1/posts/" + postId, reader.caller());
        assertThat(detail.get("requiresPassword").asBoolean()).isFalse();
        assertThat(detail.get("blocks")).hasSize(1);

        // Both rows exist: "access now" and "has proven the password before".
        assertThat(accessRows(reader, postId)).isEqualTo(1);
        assertThat(verifiedRows(reader, postId)).isEqualTo(1);

        // A brand new request (no cookie/session state beyond the JWT) still stays unlocked.
        JsonNode again = getOk("/api/v1/posts/" + postId, reader.caller());
        assertThat(again.get("requiresPassword").asBoolean()).isFalse();
    }

    @Test
    @DisplayName("senha errada responde 401 e nao libera nada")
    void wrongPasswordIsRejected() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser reader = fixtures.user("bruno");
        UUID postId = fixtures.privatePost(owner, "Post Fechado", POST_PASSWORD);

        post("/api/v1/posts/private-access/validate",
                Map.of("postId", postId, "password", "chute"), reader.caller())
                .andExpect(status().isUnauthorized());

        assertThat(accessRows(reader, postId)).isZero();
        assertThat(getOk("/api/v1/posts/" + postId, reader.caller())
                .get("requiresPassword").asBoolean()).isTrue();
    }

    @Test
    @DisplayName("bloqueia por 15 minutos apos 5 senhas erradas")
    void blocksAfterFiveWrongPasswords() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser reader = fixtures.user("bruno");
        UUID postId = fixtures.privatePost(owner, "Post Fechado", POST_PASSWORD);

        for (int attempt = 1; attempt <= 5; attempt++) {
            post("/api/v1/posts/private-access/validate",
                    Map.of("postId", postId, "password", "chute"), reader.caller())
                    .andExpect(status().isUnauthorized());
        }

        // The sixth attempt is refused before the password is even checked - even a correct one.
        post("/api/v1/posts/private-access/validate",
                Map.of("postId", postId, "password", POST_PASSWORD), reader.caller())
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"));
    }

    @Test
    @DisplayName("tornar publico limpa a senha; tornar privado de novo volta a exigir uma")
    void togglingVisibilityClearsAndRequiresPassword() throws Exception {
        TestUser owner = fixtures.user("ana");
        UUID postId = fixtures.privatePost(owner, "Post Fechado", POST_PASSWORD);

        patchOk("/api/v1/posts/" + postId, Map.of("visibility", "public"), owner.caller());
        assertThat(getOk("/api/v1/posts/" + postId, owner.caller()).get("hasPassword").asBoolean()).isFalse();

        // Private again with no password in the same request: rejected, the old hash is gone.
        patch("/api/v1/posts/" + postId, Map.of("visibility", "private"), owner.caller())
                .andExpect(status().isBadRequest());

        patchOk("/api/v1/posts/" + postId, Map.of("visibility", "private", "password", "nova-senha"), owner.caller());
        assertThat(getOk("/api/v1/posts/" + postId, owner.caller()).get("hasPassword").asBoolean()).isTrue();
    }

    // ----------------------------------------------------------------- helpers

    private long accessRows(TestUser user, UUID postId) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM private_post_access WHERE user_id = ? AND post_id = ?",
                Long.class, user.id(), postId);
    }

    private long verifiedRows(TestUser user, UUID postId) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM private_post_verified WHERE user_id = ? AND post_id = ?",
                Long.class, user.id(), postId);
    }
}
