package com.coursemaker.support;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.util.List;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Base class for every integration test: full Spring context, real HTTP layer through
 * {@link MockMvc}, real PostgreSQL, real Flyway migrations, real Spring Security filter chain.
 *
 * <p>Tests are <em>not</em> wrapped in a rolled-back transaction. Each test starts from a truly
 * empty database and every request commits, so unique constraints, cascades and
 * {@code @Transactional} boundaries are all exercised exactly as they are in production.
 */
@SpringBootTest
@AutoConfigureMockMvc
public abstract class IntegrationTest {

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected ObjectMapper json;

    @Autowired
    protected JdbcTemplate jdbc;

    /** Convenience builders for the actors and content a test needs. Rebuilt for every test. */
    protected Fixtures fixtures;

    @DynamicPropertySource
    static void embeddedPostgres(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", TestPostgres::jdbcUrl);
        registry.add("spring.datasource.username", TestPostgres::username);
        registry.add("spring.datasource.password", TestPostgres::password);
    }

    @BeforeEach
    void resetDatabaseAndFixtures() {
        truncateAllTables();
        fixtures = new Fixtures(mvc, json, jdbc);
    }

    /**
     * {@code areas} is reference data seeded once by migration V19 (every course/post/trilha
     * requires one), not per-test content - wiping it here would leave every test needing a fresh
     * one of its own instead of the one migrations already provide.
     */
    private void truncateAllTables() {
        List<String> tables = jdbc.queryForList("""
                SELECT tablename
                FROM pg_tables
                WHERE schemaname = 'public'
                  AND tablename NOT IN ('flyway_schema_history', 'areas')
                """, String.class);
        if (!tables.isEmpty()) {
            jdbc.execute("TRUNCATE TABLE " + String.join(", ", tables) + " RESTART IDENTITY CASCADE");
        }
    }

    // ------------------------------------------------------------ HTTP helpers

    /** An authenticated (or anonymous, when null) caller. */
    public record Caller(String token) {
        public static final Caller ANONYMOUS = new Caller(null);
    }

    protected ResultActions get(String path, Caller caller) throws Exception {
        return perform(MockMvcRequestBuilders.get(path), caller, null);
    }

    protected ResultActions post(String path, Object body, Caller caller) throws Exception {
        return perform(MockMvcRequestBuilders.post(path), caller, body);
    }

    protected ResultActions patch(String path, Object body, Caller caller) throws Exception {
        return perform(MockMvcRequestBuilders.patch(path), caller, body);
    }

    protected ResultActions put(String path, Object body, Caller caller) throws Exception {
        return perform(MockMvcRequestBuilders.put(path), caller, body);
    }

    protected ResultActions delete(String path, Caller caller) throws Exception {
        return perform(MockMvcRequestBuilders.delete(path), caller, null);
    }

    /** Performs the request, asserts a 2xx-ish expected status, and returns the parsed body. */
    protected JsonNode body(ResultActions actions) throws Exception {
        String content = actions.andReturn().getResponse().getContentAsString();
        return content.isEmpty() ? json.createObjectNode() : json.readTree(content);
    }

    protected JsonNode getOk(String path, Caller caller) throws Exception {
        return body(get(path, caller).andExpect(status().isOk()));
    }

    protected JsonNode postOk(String path, Object requestBody, Caller caller) throws Exception {
        return body(post(path, requestBody, caller).andExpect(status().is2xxSuccessful()));
    }

    protected JsonNode patchOk(String path, Object requestBody, Caller caller) throws Exception {
        return body(patch(path, requestBody, caller).andExpect(status().isOk()));
    }

    protected JsonNode putOk(String path, Object requestBody, Caller caller) throws Exception {
        return body(put(path, requestBody, caller).andExpect(status().isOk()));
    }

    private ResultActions perform(MockHttpServletRequestBuilder builder, Caller caller, Object requestBody)
            throws Exception {
        if (caller != null && caller.token() != null) {
            builder.header(HttpHeaders.AUTHORIZATION, "Bearer " + caller.token());
        }
        if (requestBody != null) {
            builder.contentType(MediaType.APPLICATION_JSON)
                    .content(json.writeValueAsString(requestBody));
        }
        return mvc.perform(builder);
    }
}
