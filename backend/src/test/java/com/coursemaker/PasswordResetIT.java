package com.coursemaker;

import com.coursemaker.service.ResendMailSender;
import com.coursemaker.support.Fixtures;
import com.coursemaker.support.Fixtures.TestUser;
import com.coursemaker.support.IntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * "Forgot password" flow. Only the outbound email is stubbed (a real call to Resend would need
 * network and a live key) - token generation, hashing, expiry and the actual password change all
 * run for real, same spirit as GoogleLoginIT stubbing only the call to Google.
 */
@DisplayName("Redefinicao de senha por email")
class PasswordResetIT extends IntegrationTest {

    private static final Pattern TOKEN_PATTERN = Pattern.compile("token=([\\w-]+)");

    @MockitoBean
    private ResendMailSender mailSender;

    private String captureLinkToken(String email) {
        ArgumentCaptor<String> html = ArgumentCaptor.forClass(String.class);
        then(mailSender).should().send(eq(email), anyString(), html.capture());
        Matcher matcher = TOKEN_PATTERN.matcher(html.getValue());
        assertThat(matcher.find()).as("email body should contain a reset link with a token").isTrue();
        return matcher.group(1);
    }

    @Test
    @DisplayName("envia o email e o link redefine a senha")
    void fullRoundTrip() throws Exception {
        TestUser user = fixtures.user("ana");

        post("/api/v1/auth/password-reset/request", Map.of("email", user.email()), Caller.ANONYMOUS)
                .andExpect(status().isNoContent());
        String token = captureLinkToken(user.email());

        JsonNode auth = postOk("/api/v1/auth/password-reset/confirm",
                Map.of("token", token, "newPassword", "nova-senha-123"), Caller.ANONYMOUS);
        assertThat(auth.get("token").asText()).isNotBlank();

        // The old password no longer works; the new one does.
        post("/api/v1/auth/login", Map.of("identifier", user.email(), "password", Fixtures.DEFAULT_PASSWORD),
                Caller.ANONYMOUS).andExpect(status().isUnauthorized());
        postOk("/api/v1/auth/login", Map.of("identifier", user.email(), "password", "nova-senha-123"),
                Caller.ANONYMOUS);
    }

    @Test
    @DisplayName("nao revela se o email existe")
    void neverLeaksWhetherTheEmailExists() throws Exception {
        post("/api/v1/auth/password-reset/request", Map.of("email", "ninguem@example.com"), Caller.ANONYMOUS)
                .andExpect(status().isNoContent());
        then(mailSender).should(never()).send(anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("um token ja usado nao pode ser reaproveitado")
    void aUsedTokenCannotBeReplayed() throws Exception {
        TestUser user = fixtures.user("ana");
        post("/api/v1/auth/password-reset/request", Map.of("email", user.email()), Caller.ANONYMOUS);
        String token = captureLinkToken(user.email());

        postOk("/api/v1/auth/password-reset/confirm",
                Map.of("token", token, "newPassword", "primeira-nova-senha"), Caller.ANONYMOUS);

        post("/api/v1/auth/password-reset/confirm",
                Map.of("token", token, "newPassword", "segunda-nova-senha"), Caller.ANONYMOUS)
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("um token invalido e rejeitado")
    void anUnknownTokenIsRejected() throws Exception {
        post("/api/v1/auth/password-reset/confirm",
                Map.of("token", "token-que-nunca-existiu", "newPassword", "qualquer-senha-123"), Caller.ANONYMOUS)
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("pedir de novo rapido demais e bloqueado")
    void resendIsRateLimited() throws Exception {
        TestUser user = fixtures.user("ana");

        post("/api/v1/auth/password-reset/request", Map.of("email", user.email()), Caller.ANONYMOUS)
                .andExpect(status().isNoContent());
        post("/api/v1/auth/password-reset/request", Map.of("email", user.email()), Caller.ANONYMOUS)
                .andExpect(status().isTooManyRequests());

        then(mailSender).should(times(1)).send(eq(user.email()), contains("Redefinir"), anyString());
    }
}
