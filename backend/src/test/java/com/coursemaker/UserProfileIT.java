package com.coursemaker;

import com.coursemaker.support.Fixtures.TestUser;
import com.coursemaker.support.IntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("Perfis: setup de nickname, edicao e perfil publico")
class UserProfileIT extends IntegrationTest {

    @Test
    void aNewUserClaimsTheirNicknameOnceAndThenItIsFrozen() throws Exception {
        TestUser user = fixtures.userWithoutNickname();

        JsonNode auth = patchOk("/api/v1/users/" + user.id(), Map.of("nickname", "gustavo"), user.caller());
        assertThat(auth.get("token").asText()).isNotBlank();
        JsonNode updated = auth.get("user");
        assertThat(updated.get("nickname").asText()).isEqualTo("gustavo");
        assertThat(updated.get("needsNickname").asBoolean()).isFalse();

        // The nickname is part of every public URL, so changing it would break links.
        patch("/api/v1/users/" + user.id(), Map.of("nickname", "outro"), user.caller())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("O nickname nao pode ser alterado depois de definido"));
    }

    @Test
    void aNicknameAlreadyTakenIsRefused() throws Exception {
        fixtures.user("gustavo");
        TestUser other = fixtures.userWithoutNickname();

        patch("/api/v1/users/" + other.id(), Map.of("nickname", "gustavo"), other.caller())
                .andExpect(status().isConflict());

        assertThat(body(get("/api/v1/users/nickname-available?nickname=gustavo", Caller.ANONYMOUS)
                .andExpect(status().isOk())).get("available").asBoolean()).isFalse();
        assertThat(body(get("/api/v1/users/nickname-available?nickname=livre", Caller.ANONYMOUS)
                .andExpect(status().isOk())).get("available").asBoolean()).isTrue();
    }

    @Test
    void invalidNicknamesAreRejectedByValidation() throws Exception {
        TestUser user = fixtures.userWithoutNickname();

        patch("/api/v1/users/" + user.id(), Map.of("nickname", "Com Espaco"), user.caller())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.nickname").exists());
    }

    @Test
    void aUserEditsTheirOwnProfileButNotSomebodyElses() throws Exception {
        TestUser gustavo = fixtures.user("gustavo");
        TestUser intruso = fixtures.user("intruso");

        JsonNode updated = patchOk("/api/v1/users/" + gustavo.id(), Map.of(
                "name", "Gustavo K",
                "bio", "Desenvolvedor backend",
                "stacks", List.of("java", "spring", "java")), gustavo.caller()).get("user");

        assertThat(updated.get("name").asText()).isEqualTo("Gustavo K");
        assertThat(updated.get("bio").asText()).isEqualTo("Desenvolvedor backend");
        // Duplicates are collapsed.
        assertThat(updated.get("stacks")).hasSize(2);

        patch("/api/v1/users/" + gustavo.id(), Map.of("name", "Invadido"), intruso.caller())
                .andExpect(status().isForbidden());
    }

    @Test
    void thePublicProfileShowsPublishedContentAndHidesDrafts() throws Exception {
        TestUser gustavo = fixtures.user("gustavo");
        fixtures.publishedCourse(gustavo, "Java do zero");
        fixtures.draftCourse(gustavo, "Rascunho secreto");
        fixtures.publishedPost(gustavo, "Meu primeiro post");

        JsonNode asStranger = getOk("/api/v1/users/gustavo", Caller.ANONYMOUS);
        assertThat(asStranger.get("nickname").asText()).isEqualTo("gustavo");
        assertThat(asStranger.get("courses")).hasSize(1);
        assertThat(asStranger.get("courses").get(0).get("name").asText()).isEqualTo("Java do zero");
        assertThat(asStranger.get("posts")).hasSize(1);
        // No email, no password hash on a public profile.
        assertThat(asStranger.has("email")).isFalse();

        JsonNode asOwner = getOk("/api/v1/users/gustavo", gustavo.caller());
        assertThat(asOwner.get("courses")).hasSize(2);
    }

    @Test
    void anUnknownNicknameIs404() throws Exception {
        get("/api/v1/users/ninguem", Caller.ANONYMOUS).andExpect(status().isNotFound());
    }
}
