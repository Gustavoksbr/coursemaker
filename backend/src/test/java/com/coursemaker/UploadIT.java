package com.coursemaker;

import com.coursemaker.support.Fixtures.TestUser;
import com.coursemaker.support.IntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The two upload endpoints wired through the real HTTP + security stack. The signing algorithm
 * itself is covered by {@link com.coursemaker.service.CloudinarySignatureServiceTest}; pinning
 * known credentials here (rather than trusting whatever is in the local .env) keeps this test
 * deterministic either way.
 */
@DisplayName("Uploads")
class UploadIT extends IntegrationTest {

    @DynamicPropertySource
    static void cloudinary(DynamicPropertyRegistry registry) {
        registry.add("cloudinary.cloud-name", () -> "test-cloud");
        registry.add("cloudinary.api-key", () -> "test-key");
        registry.add("cloudinary.api-secret", () -> "test-secret");
        registry.add("cloudinary.upload-folder", () -> "coursemaker-test");
    }

    @Test
    @DisplayName("relata habilitado e assina o upload quando configurado")
    void reportsEnabledAndSigns() throws Exception {
        TestUser user = fixtures.user("ana");

        assertThat(getOk("/api/v1/uploads/cloudinary-status", user.caller()).get("enabled").asBoolean())
                .isTrue();

        JsonNode signature = postOk("/api/v1/uploads/cloudinary-signature", null, user.caller());
        assertThat(signature.get("cloudName").asText()).isEqualTo("test-cloud");
        assertThat(signature.get("apiKey").asText()).isEqualTo("test-key");
        assertThat(signature.get("folder").asText()).isEqualTo("coursemaker-test");
        assertThat(signature.get("signature").asText()).matches("[0-9a-f]{40}");
    }

    @Test
    @DisplayName("exige autenticacao")
    void requiresAuthentication() throws Exception {
        get("/api/v1/uploads/cloudinary-status", Caller.ANONYMOUS).andExpect(status().isUnauthorized());
        post("/api/v1/uploads/cloudinary-signature", null, Caller.ANONYMOUS)
                .andExpect(status().isUnauthorized());
    }
}
