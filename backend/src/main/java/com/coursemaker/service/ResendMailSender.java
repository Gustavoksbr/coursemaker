package com.coursemaker.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Map;

/**
 * Sends transactional email through the Resend API. Optional: with no {@code RESEND_API_KEY}
 * configured, {@link #send} logs instead of calling out - mirrors how {@link GoogleTokenVerifier}
 * and Cloudinary treat their own optional credentials.
 */
@Slf4j
@Service
public class ResendMailSender {

    private final RestClient restClient;
    private final String apiKey;
    private final String fromEmail;

    public ResendMailSender(RestClient.Builder restClientBuilder,
                            @Value("${resend.api-key:}") String apiKey,
                            @Value("${resend.from-email:}") String fromEmail,
                            @Value("${resend.api-url}") String apiUrl) {
        this.restClient = restClientBuilder.baseUrl(apiUrl).build();
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.fromEmail = fromEmail == null ? "" : fromEmail.trim();
    }

    public boolean isEnabled() {
        return !apiKey.isEmpty() && !fromEmail.isEmpty();
    }

    public void send(String to, String subject, String html) {
        if (!isEnabled()) {
            log.warn("Resend nao configurado - email para {} com assunto '{}' nao foi enviado", to, subject);
            return;
        }

        try {
            restClient.post()
                    .header("Authorization", "Bearer " + apiKey)
                    .body(Map.of("from", fromEmail, "to", to, "subject", subject, "html", html))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException e) {
            log.error("Falha ao enviar email via Resend para {}: {}", to, e.getMessage());
        }
    }
}
