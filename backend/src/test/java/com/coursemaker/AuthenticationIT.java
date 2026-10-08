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

        JsonNode auth = body(post("/api/v1/auth/login", Map.of("identifier", EMAIL, "password", PASSWORD),
                Caller.ANONYMOUS).andExpect(status().isOk()));

        assertThat(auth.get("token").asText()).isNotBlank();
        assertThat(auth.get("expiresIn").asLong()).isPositive();
    }

    @Test
    void loginRejectsAWrongPasswordAndAnUnknownEmailIdentically() throws Exception {
        register();

        String wrongPassword = body(post("/api/v1/auth/login",
                Map.of("identifier", EMAIL, "password", "senha-errada-mesmo"), Caller.ANONYMOUS)
                .andExpect(status().isUnauthorized())).get("message").asText();

        String unknownEmail = body(post("/api/v1/auth/login",
                Map.of("identifier", "ninguem@example.com", "password", PASSWORD), Caller.ANONYMOUS)
                .andExpect(status().isUnauthorized())).get("message").asText();

        // Identical wording, so the endpoint cannot be used to enumerate registered emails.
        assertThat(wrongPassword).isEqualTo(unknownEmail);
    }

    @Test
    @DisplayName("5 falhas consecutivas bloqueiam o login por 15 minutos")
    void bruteForceProtectionBlocksAfterFiveFailures() throws Exception {
        register();

        for (int attempt = 1; attempt <= 5; attempt++) {
            // Every failure tells the UI how many tries are left; the 5th one reports the block.
            post("/api/v1/auth/login", Map.of("identifier", EMAIL, "password", "errada"), Caller.ANONYMOUS)
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.rateLimit.remainingAttempts").value(5 - attempt))
                    .andExpect(jsonPath("$.rateLimit.blockSeconds").value(900));
        }

        // The sixth attempt is refused before the password is even checked...
        post("/api/v1/auth/login", Map.of("identifier", EMAIL, "password", "errada"), Caller.ANONYMOUS)
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.rateLimit.retryAfterSeconds").isNumber());

        // ...and the block holds even for the correct password.
        post("/api/v1/auth/login", Map.of("identifier", EMAIL, "password", PASSWORD), Caller.ANONYMOUS)
                .andExpect(status().isTooManyRequests());

        Integer blocked = jdbc.queryForObject(
                "SELECT count(*) FROM login_attempts WHERE blocked_until > now()", Integer.class);
        assertThat(blocked).isEqualTo(1);
    }

    @Test
    @DisplayName("um atacante em outro IP nao consegue bloquear o login do dono da conta")
    void attackerCannotLockTheOwnerOut() throws Exception {
        register();

        for (int attempt = 1; attempt <= 6; attempt++) {
            loginFrom("203.0.113.9", EMAIL, "errada");
        }
        // The attacker is throttled...
        loginFrom("203.0.113.9", EMAIL, "errada").andExpect(status().isTooManyRequests());

        // ...but the real owner, from another address, still gets in.
        loginFrom("198.51.100.7", EMAIL, PASSWORD).andExpect(status().isOk());
    }

    private org.springframework.test.web.servlet.ResultActions loginFrom(String ip, String identifier,
                                                                         String password) throws Exception {
        return mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .post("/api/v1/auth/login")
                .with(request -> {
                    request.setRemoteAddr(ip);
                    return request;
                })
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("identifier", identifier, "password", password))));
    }

    @Test
    void aSuccessfulLoginClearsThePreviousFailures() throws Exception {
        register();

        for (int attempt = 1; attempt <= 4; attempt++) {
            post("/api/v1/auth/login", Map.of("identifier", EMAIL, "password", "errada"), Caller.ANONYMOUS)
                    .andExpect(status().isUnauthorized());
        }
        post("/api/v1/auth/login", Map.of("identifier", EMAIL, "password", PASSWORD), Caller.ANONYMOUS)
                .andExpect(status().isOk());

        Integer remaining = jdbc.queryForObject(
                "SELECT count(*) FROM login_attempts WHERE identifier LIKE 'login:%'", Integer.class);
        assertThat(remaining).isZero();

        // The counter really is back to zero: four more failures still do not block.
        for (int attempt = 1; attempt <= 4; attempt++) {
            post("/api/v1/auth/login", Map.of("identifier", EMAIL, "password", "errada"), Caller.ANONYMOUS)
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
    void aTokenIsRebuiltFromItsOwnClaimsWithoutADatabaseLookup() throws Exception {
        // The JWT signature alone authenticates the request now (see JwtService#extractPrincipal),
        // so a token survives its account being deleted until the token itself expires. /auth/me is
        // the exception: it always re-fetches the row for a fresh profile, so it's the one place
        // that still notices deletion - just as 404 (account gone), not 401 (token invalid).
        Fixtures.TestUser user = fixtures.user("ana");
        getOk("/api/v1/auth/me", user.caller());

        jdbc.update("DELETE FROM users WHERE id = ?", user.id());

        get("/api/v1/auth/me", user.caller()).andExpect(status().isNotFound());
    }

    private void register() throws Exception {
        post("/api/v1/auth/register", Map.of("email", EMAIL, "password", PASSWORD, "name", "Ana"),
                Caller.ANONYMOUS).andExpect(status().isCreated());
    }
}
