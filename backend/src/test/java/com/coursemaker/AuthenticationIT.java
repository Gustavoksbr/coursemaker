package com.coursemaker;

import com.coursemaker.support.Fixtures;
import com.coursemaker.support.IntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("Autenticacao: registro, login, JWT e protecao contra forca bruta")
class AuthenticationIT extends IntegrationTest {

    private static final String EMAIL = "ana@example.com";
    private static final String PASSWORD = "senha-super-secreta";

    @Test
    void registerCreatesAnAccountAndReturnsAUsableToken() throws Exception {
        JsonNode auth = body(post("/api/v1/auth/register",
                Map.of("email", EMAIL, "password", PASSWORD, "name", "Ana"), Caller.ANONYMOUS)
                .andExpect(status().isCreated()));

        assertThat(auth.get("token").asText()).isNotBlank();
        assertThat(auth.get("user").get("email").asText()).isEqualTo(EMAIL);
        // Registration deliberately leaves the nickname unset: the SPA routes to /setup-nickname.
        assertThat(auth.get("user").get("needsNickname").asBoolean()).isTrue();
        assertThat(auth.get("user").has("passwordHash")).isFalse();

        JsonNode me = getOk("/api/v1/auth/me", new Caller(auth.get("token").asText()));
        assertThat(me.get("email").asText()).isEqualTo(EMAIL);
    }

    @Test
    void registerNormalisesTheEmailAndRejectsDuplicates() throws Exception {
        post("/api/v1/auth/register", Map.of("email", EMAIL, "password", PASSWORD, "name", "Ana"),
                Caller.ANONYMOUS).andExpect(status().isCreated());

        post("/api/v1/auth/register", Map.of("email", "ANA@example.com", "password", PASSWORD, "name", "Outra"),
                Caller.ANONYMOUS)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Ja existe uma conta com este email"));
    }

    @Test
    void registerRejectsAWeakPasswordWithFieldLevelDetail() throws Exception {
        post("/api/v1/auth/register", Map.of("email", EMAIL, "password", "123", "name", "Ana"),
                Caller.ANONYMOUS)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.password").exists());
    }

    @Test
    void loginReturnsATokenForValidCredentials() throws Exception {
        register();

        JsonNode auth = body(post("/api/v1/auth/login", Map.of("email", EMAIL, "password", PASSWORD),
                Caller.ANONYMOUS).andExpect(status().isOk()));

        assertThat(auth.get("token").asText()).isNotBlank();
        assertThat(auth.get("expiresIn").asLong()).isPositive();
    }

    @Test
    void loginRejectsAWrongPasswordAndAnUnknownEmailIdentically() throws Exception {
        register();

        String wrongPassword = body(post("/api/v1/auth/login",
                Map.of("email", EMAIL, "password", "senha-errada-mesmo"), Caller.ANONYMOUS)
                .andExpect(status().isUnauthorized())).get("message").asText();

        String unknownEmail = body(post("/api/v1/auth/login",
                Map.of("email", "ninguem@example.com", "password", PASSWORD), Caller.ANONYMOUS)
                .andExpect(status().isUnauthorized())).get("message").asText();

        // Identical wording, so the endpoint cannot be used to enumerate registered emails.
        assertThat(wrongPassword).isEqualTo(unknownEmail);
    }

    @Test
    @DisplayName("5 falhas consecutivas bloqueiam o login por 15 minutos")
    void bruteForceProtectionBlocksAfterFiveFailures() throws Exception {
        register();

        for (int attempt = 1; attempt <= 5; attempt++) {
            post("/api/v1/auth/login", Map.of("email", EMAIL, "password", "errada"), Caller.ANONYMOUS)
                    .andExpect(status().isUnauthorized());
        }

        // The sixth attempt is refused before the password is even checked...
        post("/api/v1/auth/login", Map.of("email", EMAIL, "password", "errada"), Caller.ANONYMOUS)
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"));

        // ...and the block holds even for the correct password.
        post("/api/v1/auth/login", Map.of("email", EMAIL, "password", PASSWORD), Caller.ANONYMOUS)
                .andExpect(status().isTooManyRequests());

        Integer blocked = jdbc.queryForObject(
                "SELECT count(*) FROM login_attempts WHERE blocked_until > now()", Integer.class);
        assertThat(blocked).isEqualTo(1);
    }

    @Test
    void aSuccessfulLoginClearsThePreviousFailures() throws Exception {
        register();

        for (int attempt = 1; attempt <= 4; attempt++) {
            post("/api/v1/auth/login", Map.of("email", EMAIL, "password", "errada"), Caller.ANONYMOUS)
                    .andExpect(status().isUnauthorized());
        }
        post("/api/v1/auth/login", Map.of("email", EMAIL, "password", PASSWORD), Caller.ANONYMOUS)
                .andExpect(status().isOk());

        Integer remaining = jdbc.queryForObject("SELECT count(*) FROM login_attempts", Integer.class);
        assertThat(remaining).isZero();

        // The counter really is back to zero: four more failures still do not block.
        for (int attempt = 1; attempt <= 4; attempt++) {
            post("/api/v1/auth/login", Map.of("email", EMAIL, "password", "errada"), Caller.ANONYMOUS)
                    .andExpect(status().isUnauthorized());
        }
    }

    @Test
    void protectedEndpointsRejectMissingMalformedAndForgedTokens() throws Exception {
        get("/api/v1/auth/me", Caller.ANONYMOUS).andExpect(status().isUnauthorized());

        get("/api/v1/auth/me", new Caller("nao-e-um-jwt")).andExpect(status().isUnauthorized());

        // Correct shape, wrong signature.
        String forged = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAifQ"
                + ".YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYQ";
        get("/api/v1/auth/me", new Caller(forged)).andExpect(status().isUnauthorized());
    }

    @Test
    void aTokenStopsWorkingOnceTheAccountIsGone() throws Exception {
        Fixtures.TestUser user = fixtures.user("ana");
        getOk("/api/v1/auth/me", user.caller());

        jdbc.update("DELETE FROM users WHERE id = ?", user.id());

        get("/api/v1/auth/me", user.caller()).andExpect(status().isUnauthorized());
    }

    private void register() throws Exception {
        post("/api/v1/auth/register", Map.of("email", EMAIL, "password", PASSWORD, "name", "Ana"),
                Caller.ANONYMOUS).andExpect(status().isCreated());
    }
}
