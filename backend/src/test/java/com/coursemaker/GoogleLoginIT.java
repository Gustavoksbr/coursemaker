package com.coursemaker;

import com.coursemaker.exception.ApiExceptions.UnauthorizedException;
import com.coursemaker.service.GoogleTokenVerifier;
import com.coursemaker.service.GoogleTokenVerifier.GoogleProfile;
import com.coursemaker.support.IntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Google sign-in. Only the call to Google is stubbed - everything downstream (account creation,
 * account linking, JWT issuing, the security filter) runs for real.
 */
@DisplayName("Login com Google")
class GoogleLoginIT extends IntegrationTest {

    @MockitoBean
    private GoogleTokenVerifier googleTokenVerifier;

    @Test
    void createsAnAccountOnFirstGoogleSignIn() throws Exception {
        given(googleTokenVerifier.verify(anyString())).willReturn(
                new GoogleProfile("google-sub-1", "bia@example.com", "Bia", "https://cdn/bia.png", true));

        JsonNode auth = body(post("/api/v1/auth/google", Map.of("idToken", "id-token-valido"),
                Caller.ANONYMOUS).andExpect(status().isOk()));

        assertThat(auth.get("token").asText()).isNotBlank();
        assertThat(auth.get("user").get("email").asText()).isEqualTo("bia@example.com");
        assertThat(auth.get("user").get("image").asText()).isEqualTo("https://cdn/bia.png");
        assertThat(auth.get("user").get("needsNickname").asBoolean()).isTrue();

        // The token really works against the rest of the API.
        JsonNode me = getOk("/api/v1/auth/me", new Caller(auth.get("token").asText()));
        assertThat(me.get("name").asText()).isEqualTo("Bia");

        assertThat(jdbc.queryForObject(
                "SELECT email_verified IS NOT NULL FROM users WHERE email = 'bia@example.com'", Boolean.class))
                .isTrue();
    }

    @Test
    void linksToTheExistingAccountWhenTheEmailIsAlreadyRegistered() throws Exception {
        post("/api/v1/auth/register",
                Map.of("email", "bia@example.com", "password", "senha-super-secreta", "name", "Bia"),
                Caller.ANONYMOUS).andExpect(status().isCreated());

        given(googleTokenVerifier.verify(anyString())).willReturn(
                new GoogleProfile("google-sub-1", "bia@example.com", "Bia Google", null, true));

        post("/api/v1/auth/google", Map.of("idToken", "id-token-valido"), Caller.ANONYMOUS)
                .andExpect(status().isOk());

        // Linked, not duplicated.
        assertThat(jdbc.queryForObject("SELECT count(*) FROM users", Integer.class)).isEqualTo(1);
    }

    @Test
    void refusesAnIdTokenGoogleDoesNotAccept() throws Exception {
        willThrow(new UnauthorizedException("Token do Google invalido"))
                .given(googleTokenVerifier).verify(anyString());

        post("/api/v1/auth/google", Map.of("idToken", "token-forjado"), Caller.ANONYMOUS)
                .andExpect(status().isUnauthorized());

        assertThat(jdbc.queryForObject("SELECT count(*) FROM users", Integer.class)).isZero();
    }
}
