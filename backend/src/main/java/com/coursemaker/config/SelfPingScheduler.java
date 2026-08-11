package com.coursemaker.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Periodically calls this API's own {@code /ping} endpoint on its public production URL, so the
 * app stays warm without depending on an external uptime monitor. Keeps the Render instance and
 * the Supabase database from going idle. Disabled unless {@code API_PRODUCTION_URL} is set (e.g.
 * in local dev), since there's nothing meaningful to ping otherwise.
 */
@Slf4j
@Component
public class SelfPingScheduler {

    private static final long TEN_MINUTES_MS = 10 * 60 * 1000;

    private final RestClient restClient;
    private final boolean enabled;

    public SelfPingScheduler(RestClient.Builder restClientBuilder,
                              @Value("${app.production-url:}") String productionUrl) {
        String url = productionUrl == null ? "" : productionUrl.trim();
        this.enabled = !url.isEmpty();
        this.restClient = this.enabled ? restClientBuilder.baseUrl(url).build() : null;
    }

    @Scheduled(fixedRate = TEN_MINUTES_MS, initialDelay = TEN_MINUTES_MS)
    public void ping() {
        if (!enabled) {
            return;
        }
        try {
            restClient.get().uri("/api/v1/ping").retrieve().toBodilessEntity();
            log.debug("Self-ping succeeded");
        } catch (RestClientException e) {
            log.warn("Self-ping failed: {}", e.getMessage());
        }
    }
}
