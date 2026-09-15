package com.coursemaker.perf;

import com.coursemaker.support.Fixtures;
import com.coursemaker.support.IntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import javax.sql.DataSource;
import java.io.IOException;
import java.lang.reflect.Proxy;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Read-only performance baseline for the REST API.
 *
 * <p>Deliberately named so it does <em>not</em> match the surefire includes
 * ({@code *Test}, {@code *Tests}, {@code *IT}); it never runs as part of {@code mvn test}. Run it
 * explicitly:
 *
 * <pre>mvn test -Dtest=PerfBaselineProfiler -DfailIfNoTests=false</pre>
 *
 * <p>It seeds a realistic dataset, then replays every significant read endpoint while counting the
 * SQL Hibernate issues and timing the JDBC layer, and writes a markdown report to
 * {@code target/perf-baseline.md}.
 */
class PerfBaselineProfiler extends IntegrationTest {

    private static final int WARMUP_RUNS = 3;
    private static final int TIMED_RUNS = 7;

    /** Installs the JDBC timing proxy. The statement inspector is wired through properties. */
    @TestConfiguration
    static class ProbeConfig {
        @Bean
        static BeanPostProcessor jdbcTimingProbe() {
            return new BeanPostProcessor() {
                @Override
                public Object postProcessAfterInitialization(Object bean, String beanName) {
                    return bean instanceof DataSource ds && !Proxy.isProxyClass(ds.getClass())
                            ? SqlProbe.timing(ds)
                            : bean;
                }
            };
        }
    }

    @DynamicPropertySource
    static void probeProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.jpa.properties.hibernate.session_factory.statement_inspector",
                () -> SqlProbe.Inspector.class.getName());
        registry.add("spring.jpa.properties.hibernate.generate_statistics", () -> "true");
    }

    // ------------------------------------------------------------------ measurement

    record Measurement(String label, String method, String path, boolean authenticated,
                       int status, double wallMs, double dbMs, int queries, int bytes,
                       List<String> statements) {

        /** Queries whose text repeats within the same request, worst offender first. */
        List<Map.Entry<String, Integer>> repeats() {
            Map<String, Integer> byText = new LinkedHashMap<>();
            statements.forEach(sql -> byText.merge(sql, 1, Integer::sum));
            return byText.entrySet().stream()
                    .filter(e -> e.getValue() > 1)
                    .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                    .toList();
        }

        int distinct() {
            return (int) statements.stream().distinct().count();
        }
    }

    private final List<Measurement> results = new ArrayList<>();

    private Measurement measure(String label, String path, String token) {
        return measure(label, "GET", path, null, token);
    }

    private Measurement measure(String label, String method, String path, Object body, String token) {
        for (int i = 0; i < WARMUP_RUNS; i++) {
            call(method, path, body, token);
        }

        List<Double> wall = new ArrayList<>();
        List<Double> db = new ArrayList<>();
        MvcResult last = null;
        List<String> statements = List.of();

        for (int i = 0; i < TIMED_RUNS; i++) {
            SqlProbe.start();
            long startedAt = System.nanoTime();
            last = call(method, path, body, token);
            double elapsed = (System.nanoTime() - startedAt) / 1_000_000.0;
            SqlProbe.stop();
            wall.add(elapsed);
            db.add(SqlProbe.dbNanos() / 1_000_000.0);
            statements = SqlProbe.statements();
        }

        int bytes;
        try {
            bytes = last.getResponse().getContentAsByteArray().length;
        } catch (Exception e) {
            bytes = -1;
        }

        Measurement measurement = new Measurement(label, method, path, token != null,
                last.getResponse().getStatus(), median(wall), median(db),
                statements.size(), bytes, statements);
        results.add(measurement);
        return measurement;
    }

    private static double median(List<Double> values) {
        List<Double> sorted = values.stream().sorted().toList();
        return sorted.get(sorted.size() / 2);
    }

    private MvcResult call(String method, String path, Object body, String token) {
        try {
            MockHttpServletRequestBuilder builder = switch (method) {
                case "GET" -> MockMvcRequestBuilders.get(path);
                case "POST" -> MockMvcRequestBuilders.post(path);
                case "PATCH" -> MockMvcRequestBuilders.patch(path);
                case "PUT" -> MockMvcRequestBuilders.put(path);
                case "DELETE" -> MockMvcRequestBuilders.delete(path);
                default -> throw new IllegalArgumentException(method);
            };
            if (token != null) {
                builder.header(HttpHeaders.AUTHORIZATION, "Bearer " + token);
            }
            if (body != null) {
                builder.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));
            }
            return mvc.perform(builder).andReturn();
        } catch (Exception e) {
            throw new IllegalStateException(method + " " + path + " failed", e);
        }
    }

    // ------------------------------------------------------------------ the run

    @Test
    void profile() throws Exception {
        Seed seed = seed();

        String viewer = seed.viewer.token();
        String owner = seed.owner.token();

        // ---- catalogue listings (the homepage) ----
        measure("GET /courses (anon, size=12)", "/api/v1/courses?page=0&size=12", null);
        measure("GET /courses (auth, size=12)", "/api/v1/courses?page=0&size=12", viewer);
        measure("GET /courses (auth, size=50)", "/api/v1/courses?page=0&size=50", viewer);
        measure("GET /courses?q=java (auth)", "/api/v1/courses?q=java&page=0&size=12", viewer);
        measure("GET /courses?sort=likes (auth)", "/api/v1/courses?sort=likes&page=0&size=12", viewer);
        measure("GET /posts (auth, size=12)", "/api/v1/posts?page=0&size=12", viewer);
        measure("GET /trilhas (auth, size=12)", "/api/v1/trilhas?page=0&size=12", viewer);
        measure("GET /search (empty term, auth)", "/api/v1/search?limit=12", viewer);
        measure("GET /search?q=java (auth)", "/api/v1/search?q=java&limit=12", viewer);

        // ---- detail pages ----
        measure("GET /courses/{id} big (auth)", "/api/v1/courses/" + seed.bigCourse, viewer);
        measure("GET /courses/{id} big (anon)", "/api/v1/courses/" + seed.bigCourse, null);
        measure("GET /courses/{id} small (auth)", "/api/v1/courses/" + seed.courses.get(1), viewer);
        measure("GET /courses/by-slug (auth)",
                "/api/v1/courses/by-slug/" + seed.owner.nickname() + "/" + seed.bigCourseSlug, viewer);
        measure("GET /posts/{id} (auth)", "/api/v1/posts/" + seed.posts.get(0), viewer);
        measure("GET /trilhas/{id} big (auth)", "/api/v1/trilhas/" + seed.bigTrilha, viewer);
        measure("GET /trilhas/{id} big (anon)", "/api/v1/trilhas/" + seed.bigTrilha, null);

        // ---- profile ----
        measure("GET /users/{nickname}", "/api/v1/users/" + seed.owner.nickname(), viewer);
        measure("GET /auth/me", "/api/v1/auth/me", viewer);

        // ---- library / "my stuff" ----
        measure("GET /enrollments/me", "/api/v1/enrollments/me", viewer);
        measure("GET /enrollments/me/in-progress", "/api/v1/enrollments/me/in-progress", viewer);
        measure("GET /enrollments/me/completed", "/api/v1/enrollments/me/completed", viewer);
        measure("GET /enrollments/me/last-accessed", "/api/v1/enrollments/me/last-accessed", viewer);
        measure("GET /trilhas/me/following", "/api/v1/trilhas/me/following", viewer);
        measure("GET /trilhas/me/completed", "/api/v1/trilhas/me/completed", viewer);
        measure("GET /library/folders", "/api/v1/library/folders", viewer);
        measure("GET /library/folders/{id}/items", "/api/v1/library/folders/" + seed.folder + "/items?size=20", viewer);

        // ---- course sub-resources ----
        measure("GET /courses/{id}/comments", "/api/v1/courses/" + seed.bigCourse + "/comments", viewer);
        measure("GET /courses/{id}/students (owner)", "/api/v1/courses/" + seed.bigCourse + "/students", owner);
        measure("GET /courses/{id}/progress", "/api/v1/courses/" + seed.bigCourse + "/progress", viewer);
        measure("GET /courses/{id}/modules", "/api/v1/courses/" + seed.bigCourse + "/modules", viewer);
        measure("GET /courses/{id}/related", "/api/v1/courses/" + seed.bigCourse + "/related", viewer);
        measure("GET /courses/{id}/trilhas", "/api/v1/courses/" + seed.bigCourse + "/trilhas", viewer);
        measure("GET /courses/{id}/trilhas/highlighted",
                "/api/v1/courses/" + seed.bigCourse + "/trilhas/highlighted", viewer);
        measure("GET /trilhas/{id}/progress", "/api/v1/trilhas/" + seed.bigTrilha + "/progress", viewer);
        measure("GET /lessons/{id}/blocks", "/api/v1/lessons/" + seed.firstLesson + "/blocks", viewer);

        // ---- a couple of writes, for contrast ----
        measure("POST /courses/{id}/like", "POST", "/api/v1/courses/" + seed.courses.get(2) + "/like", null, viewer);
        measure("PATCH /courses/{id}", "PATCH", "/api/v1/courses/" + seed.bigCourse,
                Map.of("description", "descricao atualizada"), owner);

        writeReport(seed);
    }

    // ------------------------------------------------------------------ seeding

    record Seed(Fixtures.TestUser owner, Fixtures.TestUser viewer, List<UUID> courses, List<UUID> posts,
                List<UUID> trilhas, UUID bigCourse, String bigCourseSlug, UUID bigTrilha, UUID folder,
                UUID firstLesson, Map<String, Long> counts) {
    }

    private Seed seed() throws Exception {
        Fixtures.TestUser owner = fixtures.user("perfowner");
        Fixtures.TestUser viewer = fixtures.user("perfviewer");
        List<Fixtures.TestUser> others = List.of(
                fixtures.user("autora"), fixtures.user("autorb"), fixtures.user("autorc"));

        // 30 published courses, round-robin across four authors.
        List<UUID> courses = new ArrayList<>();
        for (int i = 0; i < 30; i++) {
            Fixtures.TestUser author = i % 4 == 0 ? owner : others.get(i % 3);
            UUID id = fixtures.draftCourse(author, courseName(i));
            call("PATCH", "/api/v1/courses/" + id, Map.of(
                    "status", "available",
                    "categories", List.of(i % 3 == 0 ? "java" : "web", "backend")), author.token());
            courses.add(id);
        }

        // One "big" course with a real curriculum: 6 modules x 8 lessons x 3 blocks.
        UUID bigCourse = courses.get(0);
        UUID firstLesson = buildCurriculum(bigCourse, 6, 8, 3);
        String bigCourseSlug = jdbc.queryForObject(
                "SELECT slug FROM courses WHERE id = ?", String.class, bigCourse);

        // 20 posts.
        List<UUID> posts = new ArrayList<>();
        for (int i = 0; i < 20; i++) {
            posts.add(fixtures.publishedPost(i % 2 == 0 ? owner : others.get(i % 3), "Post java " + i));
        }

        // 10 trilhas; the first one carries 4 steps and 16 items.
        List<UUID> trilhas = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            UUID id = fixtures.trilha(i % 2 == 0 ? owner : others.get(i % 3), "Trilha java " + i);
            call("PATCH", "/api/v1/trilhas/" + id, Map.of("status", "available"),
                    (i % 2 == 0 ? owner : others.get(i % 3)).token());
            trilhas.add(id);
        }
        UUID bigTrilha = trilhas.get(0);
        for (int s = 0; s < 4; s++) {
            UUID step = fixtures.trilhaStep(owner, bigTrilha, "Etapa " + s);
            for (int c = 0; c < 3; c++) {
                fixtures.trilhaItem(owner, bigTrilha, courses.get(s * 3 + c), step);
            }
        }
        for (int c = 12; c < 16; c++) {
            fixtures.trilhaItem(owner, bigTrilha, courses.get(c), null);
        }

        // Engagement: viewer enrolled in 20 courses, likes 15, follows 8 trilhas, saves 20 items.
        for (int i = 0; i < 20; i++) {
            call("POST", "/api/v1/enrollments", Map.of("courseId", courses.get(i)), viewer.token());
        }
        for (int i = 0; i < 15; i++) {
            call("POST", "/api/v1/courses/" + courses.get(i) + "/like", null, viewer.token());
        }
        for (int i = 0; i < 8; i++) {
            call("POST", "/api/v1/trilhas/" + trilhas.get(i) + "/enroll", null, viewer.token());
        }

        // Other students, so /students and the enrollment counts are not degenerate.
        for (Fixtures.TestUser student : others) {
            for (int i = 0; i < 12; i++) {
                call("POST", "/api/v1/enrollments", Map.of("courseId", courses.get(i)), student.token());
            }
        }

        // Library: a custom folder holding 20 saves (courses, posts and trilhas mixed).
        JsonNode folderNode = json.readTree(call("POST", "/api/v1/library/folders",
                Map.of("name", "Estudar depois"), viewer.token()).getResponse().getContentAsString());
        UUID folder = UUID.fromString(folderNode.get("id").asText());
        for (int i = 0; i < 10; i++) {
            call("PUT", "/api/v1/library/courses/" + courses.get(i) + "/folder",
                    Map.of("folderId", folder), viewer.token());
        }
        for (int i = 0; i < 6; i++) {
            call("PUT", "/api/v1/library/posts/" + posts.get(i) + "/folder",
                    Map.of("folderId", folder), viewer.token());
        }
        for (int i = 0; i < 4; i++) {
            call("PUT", "/api/v1/library/trilhas/" + trilhas.get(i) + "/folder",
                    Map.of("folderId", folder), viewer.token());
        }

        // Comments on the big course: 20 roots, each with 1 reply.
        for (int i = 0; i < 20; i++) {
            JsonNode root = json.readTree(call("POST", "/api/v1/courses/" + bigCourse + "/comments",
                    Map.of("content", "Comentario " + i), viewer.token())
                    .getResponse().getContentAsString());
            call("POST", "/api/v1/courses/" + bigCourse + "/comments",
                    Map.of("content", "Resposta " + i, "parentId", root.get("id").asText()), owner.token());
        }

        // Related items and trilha highlights on the big course.
        for (int i = 1; i <= 4; i++) {
            call("POST", "/api/v1/courses/" + bigCourse + "/related",
                    Map.of("relatedCourseId", courses.get(i)), owner.token());
        }
        for (int i = 0; i < 2; i++) {
            call("PUT", "/api/v1/courses/" + bigCourse + "/trilhas/" + trilhas.get(i) + "/highlight",
                    null, owner.token());
        }

        // Lesson completions, so progress is non-trivial and "completed" lists are non-empty.
        List<UUID> lessons = jdbc.queryForList(
                "SELECT l.id FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.course_id = ?",
                UUID.class, bigCourse);
        for (int i = 0; i < lessons.size() / 2; i++) {
            call("POST", "/api/v1/lessons/" + lessons.get(i) + "/complete", null, viewer.token());
        }

        Map<String, Long> counts = new LinkedHashMap<>();
        for (String table : List.of("users", "courses", "modules", "lessons", "lesson_blocks", "posts",
                "trilhas", "trilha_items", "trilha_steps", "enrollments", "course_likes",
                "lesson_completions", "comments", "library_items")) {
            counts.put(table, jdbc.queryForObject("SELECT count(*) FROM " + table, Long.class));
        }

        return new Seed(owner, viewer, courses, posts, trilhas, bigCourse, bigCourseSlug, bigTrilha,
                folder, firstLesson, counts);
    }

    private static String courseName(int index) {
        String[] topics = { "Java", "Spring", "React", "SQL", "Docker" };
        return topics[index % topics.length] + " avancado " + index;
    }

    /** Adds modules/lessons/blocks straight through JDBC; returns the first lesson id. */
    private UUID buildCurriculum(UUID courseId, int modules, int lessonsPerModule, int blocksPerLesson) {
        UUID firstLesson = null;
        for (int m = 0; m < modules; m++) {
            UUID moduleId = UUID.randomUUID();
            jdbc.update("INSERT INTO modules (id, course_id, title, order_index) VALUES (?, ?, ?, ?)",
                    moduleId, courseId, "Modulo " + m, m + 1);
            for (int l = 0; l < lessonsPerModule; l++) {
                UUID lessonId = UUID.randomUUID();
                jdbc.update("INSERT INTO lessons (id, module_id, title, order_index) VALUES (?, ?, ?, ?)",
                        lessonId, moduleId, "Aula " + m + "." + l, l);
                if (firstLesson == null) {
                    firstLesson = lessonId;
                }
                for (int b = 0; b < blocksPerLesson; b++) {
                    jdbc.update("INSERT INTO lesson_blocks (id, lesson_id, type, content, order_index) "
                                    + "VALUES (?, ?, 'text', ?, ?)",
                            UUID.randomUUID(), lessonId,
                            "<p>Conteudo da aula " + m + "." + l + " bloco " + b + ".</p>", b);
                }
            }
        }
        return firstLesson;
    }

    // ------------------------------------------------------------------ reporting

    private void writeReport(Seed seed) throws IOException {
        StringBuilder out = new StringBuilder();
        out.append("# Baseline de performance - CourseMaker API\n\n");
        out.append("Banco: PostgreSQL 16 embarcado (localhost, latencia de rede ~0).\n")
                .append("Cada endpoint: ").append(WARMUP_RUNS).append(" execucoes de aquecimento + ")
                .append(TIMED_RUNS).append(" medidas; os valores sao a mediana.\n\n");

        out.append("## Volume de dados\n\n| Tabela | Linhas |\n| --- | ---: |\n");
        seed.counts.forEach((table, count) -> out.append("| ").append(table).append(" | ")
                .append(count).append(" |\n"));

        out.append("\n## Baseline por endpoint\n\n");
        out.append("| Endpoint | Auth | Status | Tempo (ms) | Banco (ms) | Queries | Distintas | Repetidas | Bytes |\n");
        out.append("| --- | :-: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |\n");
        results.stream()
                .sorted(Comparator.comparingInt(Measurement::queries).reversed())
                .forEach(m -> out.append(String.format(
                        "| `%s %s` | %s | %d | %.1f | %.1f | %d | %d | %d | %d |%n",
                        m.method(), m.label().replaceFirst("^\\w+ ", ""), m.authenticated() ? "sim" : "nao",
                        m.status(), m.wallMs(), m.dbMs(), m.queries(), m.distinct(),
                        m.queries() - m.distinct(), m.bytes())));

        out.append("\n## Queries repetidas por requisicao (candidatos a N+1)\n\n");
        results.stream()
                .filter(m -> !m.repeats().isEmpty())
                .sorted(Comparator.comparingInt((Measurement m) ->
                        m.repeats().stream().mapToInt(Map.Entry::getValue).max().orElse(0)).reversed())
                .forEach(m -> {
                    out.append("\n### ").append(m.label())
                            .append(" - ").append(m.queries()).append(" queries no total\n\n");
                    m.repeats().forEach(entry -> out.append("- **").append(entry.getValue())
                            .append("x**: `").append(compact(entry.getKey())).append("`\n"));
                });

        out.append("\n## SQL completo por endpoint\n");
        results.forEach(m -> {
            out.append("\n### ").append(m.label()).append(" (").append(m.queries()).append(" queries)\n\n");
            Map<String, Integer> byText = new LinkedHashMap<>();
            m.statements().forEach(sql -> byText.merge(sql, 1, Integer::sum));
            byText.forEach((sql, count) -> out.append("- ")
                    .append(count > 1 ? "**" + count + "x** " : "1x ")
                    .append("`").append(compact(sql)).append("`\n"));
        });

        Path report = Path.of("target", "perf-baseline.md");
        Files.createDirectories(report.getParent());
        Files.writeString(report, out.toString());
        System.out.println("\n=== PERF REPORT WRITTEN TO " + report.toAbsolutePath() + " ===\n");

        // Compact console summary, ordered by query count.
        System.out.printf("%-42s %7s %8s %8s %6s%n", "ENDPOINT", "STATUS", "MS", "DB_MS", "QUERIES");
        results.stream()
                .sorted(Comparator.comparingInt(Measurement::queries).reversed())
                .forEach(m -> System.out.printf("%-42s %7d %8.1f %8.1f %6d%n",
                        truncate(m.label(), 42), m.status(), m.wallMs(), m.dbMs(), m.queries()));
    }

    private static String compact(String sql) {
        String flat = sql.replaceAll("\\s+", " ").trim();
        return flat.length() > 300 ? flat.substring(0, 300) + " ..." : flat;
    }

    private static String truncate(String value, int max) {
        return value.length() <= max ? value : value.substring(0, max - 1) + "~";
    }

    @SuppressWarnings("unused")
    private String describe(List<Measurement> measurements) {
        return measurements.stream().map(Measurement::label).collect(Collectors.joining(", "));
    }
}
