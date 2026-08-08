package com.coursemaker.support;

import com.coursemaker.support.IntegrationTest.Caller;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Builds test actors and content through the real API, so fixtures exercise the same code paths as
 * production instead of quietly inserting rows the endpoints would have rejected.
 */
public class Fixtures {

    public static final String DEFAULT_PASSWORD = "senha-super-secreta";

    private static final AtomicInteger SEQUENCE = new AtomicInteger();

    private final MockMvc mvc;
    private final ObjectMapper json;
    private final JdbcTemplate jdbc;

    public Fixtures(MockMvc mvc, ObjectMapper json, JdbcTemplate jdbc) {
        this.mvc = mvc;
        this.json = json;
        this.jdbc = jdbc;
    }

    /** A registered user, already carrying a usable bearer token. */
    public record TestUser(UUID id, String email, String nickname, String token) {
        public Caller caller() {
            return new Caller(token);
        }
    }

    // ------------------------------------------------------------------ users

    /** Registers a user and claims a nickname, which is required to author content. */
    public TestUser user(String nickname) {
        String email = nickname + "-" + SEQUENCE.incrementAndGet() + "@example.com";
        JsonNode auth = request("POST", "/api/v1/auth/register", null,
                Map.of("email", email, "password", DEFAULT_PASSWORD, "name", "Usuario " + nickname));

        String token = auth.get("token").asText();
        UUID id = UUID.fromString(auth.get("user").get("id").asText());

        request("PATCH", "/api/v1/users/" + id, token, Map.of("nickname", nickname));
        return new TestUser(id, email, nickname, token);
    }

    /** Registers a user without a nickname, for the "setup nickname" flow. */
    public TestUser userWithoutNickname() {
        String email = "novato-" + SEQUENCE.incrementAndGet() + "@example.com";
        JsonNode auth = request("POST", "/api/v1/auth/register", null,
                Map.of("email", email, "password", DEFAULT_PASSWORD, "name", "Novato"));
        return new TestUser(
                UUID.fromString(auth.get("user").get("id").asText()),
                email,
                null,
                auth.get("token").asText());
    }

    public TestUser admin(String nickname) {
        TestUser user = user(nickname);
        jdbc.update("UPDATE users SET role = 'admin' WHERE id = ?", user.id());
        return user;
    }

    // ---------------------------------------------------------------- courses

    /** Creates a course and publishes it. */
    public UUID publishedCourse(TestUser owner, String name) {
        UUID courseId = draftCourse(owner, name);
        publish(owner, courseId);
        return courseId;
    }

    public UUID draftCourse(TestUser owner, String name) {
        JsonNode course = request("POST", "/api/v1/courses", owner.token(),
                Map.of("name", name, "description", "Descricao de " + name));
        return UUID.fromString(course.get("id").asText());
    }

    /** Creates a published, password-protected course. */
    public UUID privateCourse(TestUser owner, String name, String password) {
        JsonNode course = request("POST", "/api/v1/courses", owner.token(), Map.of(
                "name", name,
                "description", "Curso privado",
                "visibility", "private",
                "password", password));
        UUID courseId = UUID.fromString(course.get("id").asText());
        publish(owner, courseId);
        return courseId;
    }

    public void publish(TestUser owner, UUID courseId) {
        request("PATCH", "/api/v1/courses/" + courseId, owner.token(), Map.of("status", "available"));
    }

    public void enableProgress(TestUser owner, UUID courseId) {
        request("PATCH", "/api/v1/courses/" + courseId, owner.token(), Map.of("progressEnabled", true));
    }

    // ------------------------------------------------------------- curriculum

    public UUID module(TestUser owner, UUID courseId, String title) {
        JsonNode module = request("POST", "/api/v1/courses/" + courseId + "/modules", owner.token(),
                Map.of("title", title));
        return UUID.fromString(module.get("id").asText());
    }

    public UUID lesson(TestUser owner, UUID moduleId, String title) {
        JsonNode lesson = request("POST", "/api/v1/modules/" + moduleId + "/lessons", owner.token(),
                Map.of("title", title));
        return UUID.fromString(lesson.get("id").asText());
    }

    public UUID textBlock(TestUser owner, UUID lessonId, String html) {
        JsonNode block = request("POST", "/api/v1/lessons/" + lessonId + "/blocks", owner.token(),
                Map.of("type", "text", "content", html));
        return UUID.fromString(block.get("id").asText());
    }

    /** A course with one module and {@code lessonCount} lessons, published and ready to browse. */
    public Curriculum courseWithLessons(TestUser owner, String name, int lessonCount) {
        UUID courseId = draftCourse(owner, name);
        UUID moduleId = module(owner, courseId, "Modulo 1");
        List<UUID> lessons = java.util.stream.IntStream.rangeClosed(1, lessonCount)
                .mapToObj(index -> lesson(owner, moduleId, "Licao " + index))
                .toList();
        publish(owner, courseId);
        return new Curriculum(courseId, moduleId, lessons);
    }

    public record Curriculum(UUID courseId, UUID moduleId, List<UUID> lessonIds) {
    }

    // ------------------------------------------------------------------ posts

    public UUID publishedPost(TestUser owner, String title) {
        JsonNode post = request("POST", "/api/v1/posts", owner.token(),
                Map.of("title", title, "description", "Sobre " + title));
        UUID postId = UUID.fromString(post.get("id").asText());
        request("PATCH", "/api/v1/posts/" + postId, owner.token(), Map.of("status", "available"));
        return postId;
    }

    // ---------------------------------------------------------------- plumbing

    private JsonNode request(String method, String path, String token, Object body) {
        try {
            var builder = switch (method) {
                case "POST" -> MockMvcRequestBuilders.post(path);
                case "PATCH" -> MockMvcRequestBuilders.patch(path);
                case "PUT" -> MockMvcRequestBuilders.put(path);
                default -> throw new IllegalArgumentException("Unsupported method " + method);
            };
            if (token != null) {
                builder.header(HttpHeaders.AUTHORIZATION, "Bearer " + token);
            }
            builder.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));

            var response = mvc.perform(builder).andReturn().getResponse();
            if (response.getStatus() >= 300) {
                throw new IllegalStateException("Fixture setup failed: " + method + " " + path
                        + " -> " + response.getStatus() + " " + response.getContentAsString());
            }
            String content = response.getContentAsString();
            return content.isEmpty() ? json.createObjectNode() : json.readTree(content);
        } catch (Exception e) {
            throw new IllegalStateException("Fixture setup failed for " + method + " " + path, e);
        }
    }
}
