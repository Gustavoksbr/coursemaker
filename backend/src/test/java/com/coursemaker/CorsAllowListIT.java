package com.coursemaker;

import com.coursemaker.support.IntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** CORS with an explicit list: exact origins and wildcard patterns, nothing else. */
@TestPropertySource(properties = "app.cors.allowed-origins=http://localhost:5173,https://coursemakerbr.vercel.app,https://coursemakerbr-*.vercel.app,http://localhost:*")
class CorsAllowListIT extends IntegrationTest {

    private org.springframework.test.web.servlet.ResultActions preflight(String origin) throws Exception {
        return mvc.perform(MockMvcRequestBuilders.options("/api/v1/auth/login")
                .header("Origin", origin)
                .header("Access-Control-Request-Method", "POST")
                .header("Access-Control-Request-Headers", "content-type"));
    }

    @Test
    @DisplayName("aceita as origens da lista e os curingas, e recusa o resto")
    void onlyListedOriginsAreAllowed() throws Exception {
        for (String allowed : new String[] {
                "http://localhost:5173", "http://localhost:5180", "https://coursemakerbr.vercel.app",
                "https://coursemakerbr-git-main-gusta.vercel.app"}) {
            preflight(allowed).andExpect(status().isOk())
                    .andExpect(header().string("Access-Control-Allow-Origin", allowed));
        }

        for (String blocked : new String[] {
                "https://evil.example.com", "https://outroapp.vercel.app", "http://coursemakerbr.vercel.app"}) {
            preflight(blocked).andExpect(status().isForbidden());
        }
    }
}
