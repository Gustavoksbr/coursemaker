package com.coursemaker;

import com.coursemaker.support.IntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** FRONTEND_URL=* : any website may call the API from a browser. */
@TestPropertySource(properties = "app.cors.allowed-origins=*")
class CorsWildcardIT extends IntegrationTest {

    private org.springframework.test.web.servlet.ResultActions preflight(String origin) throws Exception {
        return mvc.perform(MockMvcRequestBuilders.options("/api/v1/auth/login")
                .header("Origin", origin)
                .header("Access-Control-Request-Method", "POST")
                .header("Access-Control-Request-Headers", "content-type"));
    }

    @Test
    @DisplayName("com * qualquer origem passa; o Retry-After continua exposto para o front")
    void anyOriginIsAllowed() throws Exception {
        for (String origin : new String[] {"https://qualquer-site.com", "http://localhost:9999", "https://coursemakerbr.vercel.app"}) {
            preflight(origin).andExpect(status().isOk())
                    .andExpect(header().string("Access-Control-Allow-Origin", origin));
        }

        mvc.perform(MockMvcRequestBuilders.get("/api/v1/ping").header("Origin", "https://qualquer-site.com"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "https://qualquer-site.com"));
    }
}
