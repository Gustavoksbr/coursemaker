package com.coursemaker.service;

import com.coursemaker.exception.ApiExceptions.BadRequestException;
import com.coursemaker.exception.ApiExceptions.UnauthorizedException;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Verifies a Google ID token by asking Google's tokeninfo endpoint about it.
 *
 * <p>This trades one network round-trip per sign-in for not having to pull in the Google API client
 * and manage JWKS caching - a fair deal at MVP scale. Google sign-in is optional: with no
 * {@code GOOGLE_CLIENT_ID} configured the endpoint reports that it is disabled.
 */
@Slf4j
@Service
public class GoogleTokenVerifier {

    private final RestClient restClient;
    private final String clientId;

    public GoogleTokenVerifier(RestClient.Builder restClientBuilder,
                               @Value("${google.client-id:}") String clientId,
                               @Value("${google.tokeninfo-url}") String tokenInfoUrl) {
        this.restClient = restClientBuilder.baseUrl(tokenInfoUrl).build();
        this.clientId = clientId == null ? "" : clientId.trim();
    }

    public boolean isEnabled() {
        return !clientId.isEmpty();
    }

    public GoogleProfile verify(String idToken) {
        if (!isEnabled()) {
            throw new BadRequestException("Login com Google não está configurado neste servidor");
        }

        JsonNode payload;
        try {
            payload = restClient.get()
                    .uri(uriBuilder -> uriBuilder.queryParam("id_token", idToken).build())
                    .retrieve()
                    .body(JsonNode.class);
        } catch (RestClientException e) {
            log.warn("Google tokeninfo rejected the id_token: {}", e.getMessage());
            throw new UnauthorizedException("Token do Google invalido");
        }

        if (payload == null || payload.path("sub").asText("").isEmpty()) {
            throw new UnauthorizedException("Token do Google invalido");
        }
        if (!clientId.equals(payload.path("aud").asText())) {
            // The token is genuine but was minted for a different application.
            throw new UnauthorizedException("Token do Google emitido para outro aplicativo");
        }

        String email = payload.path("email").asText("");
        if (email.isEmpty()) {
            throw new UnauthorizedException("Token do Google nao contem email");
        }

        return new GoogleProfile(
                payload.path("sub").asText(),
                email,
                payload.path("name").asText(email),
                payload.path("picture").asText(null),
                "true".equalsIgnoreCase(payload.path("email_verified").asText()));
    }

    public record GoogleProfile(String subject, String email, String name, String picture, boolean emailVerified) {
    }
}
