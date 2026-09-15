package com.coursemaker.perf;

import com.coursemaker.support.Fixtures;
import com.coursemaker.support.IntegrationTest;
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
import java.lang.reflect.Proxy;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Second half of the diagnosis, on a dataset roughly 10x the first one:
 *
 * <ol>
 *   <li>replays the endpoints that looked worst so the query counts can be compared against the
 *       small-dataset run - a count that grows with the row count is an N+1, one that stays flat
 *       is not;</li>
 *   <li>runs {@code EXPLAIN (ANALYZE, BUFFERS)} on the queries those endpoints actually issue;</li>
 *   <li>dumps index usage and sequential-scan counters from {@code pg_stat_*}.</li>
 * </ol>
 *
 * <p>Does not match the surefire includes, so it never runs in {@code mvn test}. Run with:
 * <pre>mvn test -Dtest=PerfScalingProfiler -DfailIfNoTests=false</pre>
 */
class PerfScalingProfiler extends IntegrationTest {

    private static final int COURSES = 300;
    private static final int ENROLLMENTS = 120;
    private static final int LIBRARY_ITEMS = 50;
    private static final int TRILHA_ITEMS = 40;
    private static final int FOLLOWED_TRILHAS = 30;

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
    }

    private final StringBuilder out = new StringBuilder();

    @Test
    void profileAtScale() throws Exception {
        Fixtures.TestUser owner = fixtures.user("scaleowner");
        Fixtures.TestUser viewer = fixtures.user("scaleviewer");

        List<UUID> courses = bulkCourses(owner.id());
        List<UUID> trilhas = bulkTrilhas(owner.id());
        UUID bigCourse = courses.get(0);
        UUID bigTrilha = trilhas.get(0);
        curriculum(bigCourse, 10, 12, 3);
        bulkTrilhaItems(bigTrilha, courses);
        bulkEngagement(viewer.id(), owner.id(), courses, trilhas);
        UUID folder = bulkLibrary(viewer.id(), courses, trilhas);

        jdbc.execute("ANALYZE");

        out.append("# Escalabilidade e analise de banco\n\n");
        out.append("Dataset ~10x maior que o baseline. Volumes:\n\n| Tabela | Linhas |\n| --- | ---: |\n");
        for (String table : List.of("users", "courses", "modules", "lessons", "lesson_blocks",
                "trilhas", "trilha_items", "enrollments", "course_likes", "lesson_completions",
                "library_items", "trilha_enrollments")) {
            out.append("| ").append(table).append(" | ")
                    .append(jdbc.queryForObject("SELECT count(*) FROM " + table, Long.class)).append(" |\n");
        }

        out.append("\n## Contagem de queries no dataset grande\n\n");
        out.append("| Endpoint | Tempo (ms) | Banco (ms) | Queries | Bytes |\n| --- | ---: | ---: | ---: | ---: |\n");
        measure("GET /courses?size=12", "/api/v1/courses?page=0&size=12", viewer.token());
        measure("GET /courses?size=50", "/api/v1/courses?page=0&size=50", viewer.token());
        measure("GET /enrollments/me", "/api/v1/enrollments/me", viewer.token());
        measure("GET /enrollments/me/in-progress", "/api/v1/enrollments/me/in-progress", viewer.token());
        measure("GET /enrollments/me/completed", "/api/v1/enrollments/me/completed", viewer.token());
        measure("GET /trilhas?size=12", "/api/v1/trilhas?page=0&size=12", viewer.token());
        measure("GET /trilhas/me/following", "/api/v1/trilhas/me/following", viewer.token());
        measure("GET /trilhas/{id}", "/api/v1/trilhas/" + bigTrilha, viewer.token());
        measure("GET /courses/{id}", "/api/v1/courses/" + bigCourse, viewer.token());
        measure("GET /users/{nickname}", "/api/v1/users/" + owner.nickname(), viewer.token());
        measure("GET /library/folders/{id}/items", "/api/v1/library/folders/" + folder + "/items?size=50",
                viewer.token());
        measure("GET /search", "/api/v1/search?limit=12", viewer.token());
        measure("GET /courses?q=java", "/api/v1/courses?q=java&page=0&size=12", viewer.token());
        measure("GET /courses?sort=likes", "/api/v1/courses?sort=likes&page=0&size=12", viewer.token());

        explainSection(bigCourse, bigTrilha, viewer.id(), owner.id());
        statsSection();

        Path report = Path.of("target", "perf-scaling.md");
        Files.writeString(report, out.toString());
        System.out.println("\n=== SCALING REPORT: " + report.toAbsolutePath() + " ===\n");
        System.out.println(out);
    }

    // ------------------------------------------------------------------ measurement

    private void measure(String label, String path, String token) {
        for (int i = 0; i < 3; i++) {
            call("GET", path, null, token);
        }
        List<Double> wall = new ArrayList<>();
        List<Double> db = new ArrayList<>();
        MvcResult last = null;
        int queries = 0;
        for (int i = 0; i < 5; i++) {
            SqlProbe.start();
            long startedAt = System.nanoTime();
            last = call("GET", path, null, token);
            wall.add((System.nanoTime() - startedAt) / 1_000_000.0);
            SqlProbe.stop();
            db.add(SqlProbe.dbNanos() / 1_000_000.0);
            queries = SqlProbe.statements().size();
        }
        int bytes;
        try {
            bytes = last.getResponse().getContentAsByteArray().length;
        } catch (Exception e) {
            bytes = -1;
        }
        out.append(String.format("| `%s` | %.1f | %.1f | %d | %d |%n",
                label, median(wall), median(db), queries, bytes));
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
                case "PUT" -> MockMvcRequestBuilders.put(path);
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
            throw new IllegalStateException(method + " " + path, e);
        }
    }

    // ------------------------------------------------------------------ EXPLAIN

    private void explainSection(UUID courseId, UUID trilhaId, UUID viewerId, UUID ownerId) {
        out.append("\n## Planos de execucao (EXPLAIN ANALYZE, BUFFERS)\n");

        explain("countByCourseId - a query repetida N vezes em CourseMapper",
                "SELECT count(l.id) FROM lessons l JOIN modules m ON m.id = l.module_id "
                        + "WHERE m.course_id = '" + courseId + "'");

        explain("countByCourseId reescrita em lote (uma query para 12 cursos)",
                "SELECT m.course_id, count(l.id) FROM lessons l JOIN modules m ON m.id = l.module_id "
                        + "WHERE m.course_id IN (SELECT id FROM courses LIMIT 12) GROUP BY m.course_id");

        explain("findCompletedLessonIds",
                "SELECT lc.lesson_id FROM lesson_completions lc WHERE lc.user_id = '" + viewerId + "' "
                        + "AND lc.lesson_id IN (SELECT l.id FROM lessons l "
                        + "JOIN modules m ON m.id = l.module_id WHERE m.course_id = '" + courseId + "')");

        explain("countByTrilhaId (repetida por trilha em TrilhaMapper)",
                "SELECT count(*) FROM trilha_items WHERE trilha_id = '" + trilhaId + "'");

        explain("catalogo /courses sem filtro (ORDER BY created_at DESC LIMIT 12)",
                courseSearch(null, "recent", ownerId) + " LIMIT 12 OFFSET 0");

        explain("catalogo /courses com busca textual q=java (ILIKE %...%)",
                courseSearch("java", "recent", ownerId) + " LIMIT 12 OFFSET 0");

        explain("catalogo /courses ordenado por likes (subquery correlacionada no ORDER BY)",
                courseSearch(null, "likes", ownerId) + " LIMIT 12 OFFSET 0");

        explain("count query do catalogo (executada em toda pagina)",
                "SELECT count(*) FROM courses c JOIN users u ON u.id = c.owner_id "
                        + "WHERE (c.status = 'available' OR c.owner_id = '" + ownerId + "')");

        explain("blocos de todas as aulas de um curso (findAllByLessonIdIn)",
                "SELECT b.* FROM lesson_blocks b WHERE b.lesson_id IN "
                        + "(SELECT l.id FROM lessons l JOIN modules m ON m.id = l.module_id "
                        + "WHERE m.course_id = '" + courseId + "') ORDER BY b.lesson_id, b.order_index");

        explain("itens da trilha com join fetch de course+owner e post+owner",
                "SELECT ti.*, c.id, u.id, p.id, pu.id FROM trilha_items ti "
                        + "LEFT JOIN trilha_steps s ON s.id = ti.step_id "
                        + "LEFT JOIN courses c ON c.id = ti.course_id "
                        + "LEFT JOIN users u ON u.id = c.owner_id "
                        + "LEFT JOIN posts p ON p.id = ti.post_id "
                        + "LEFT JOIN users pu ON pu.id = p.owner_id "
                        + "WHERE ti.trilha_id = '" + trilhaId + "' "
                        + "ORDER BY CASE WHEN ti.step_id IS NULL THEN 0 ELSE 1 END, s.order_index, ti.order_index");
    }

    private String courseSearch(String term, String sort, UUID viewerId) {
        String where = term == null ? "" :
                " AND (c.name ILIKE '%" + term + "%' OR c.description ILIKE '%" + term + "%' "
                        + "OR u.nickname ILIKE '%" + term + "%' OR u.name ILIKE '%" + term + "%' "
                        + "OR EXISTS (SELECT 1 FROM unnest(c.categories) cat WHERE cat ILIKE '%" + term + "%'))";
        return "SELECT c.* FROM courses c JOIN users u ON u.id = c.owner_id "
                + "WHERE (c.status = 'available' OR c.owner_id = '" + viewerId + "')" + where
                + " ORDER BY CASE WHEN '" + sort + "' = 'likes' "
                + "THEN (SELECT count(*) FROM course_likes cl WHERE cl.course_id = c.id) ELSE 0 END DESC, "
                + "CASE WHEN '" + sort + "' = 'name' THEN c.name ELSE '' END ASC, c.created_at DESC";
    }

    private void explain(String title, String sql) {
        out.append("\n### ").append(title).append("\n\n```sql\n").append(sql).append("\n```\n\n```\n");
        try {
            jdbc.queryForList("EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) " + sql).forEach(row ->
                    out.append(row.values().iterator().next()).append("\n"));
        } catch (Exception e) {
            out.append("EXPLAIN falhou: ").append(e.getMessage()).append("\n");
        }
        out.append("```\n");
    }

    // ------------------------------------------------------------------ pg_stat

    private void statsSection() {
        out.append("\n## Uso de indices (pg_stat_user_indexes)\n\n");
        out.append("| Tabela | Indice | Scans | Tuplas lidas |\n| --- | --- | ---: | ---: |\n");
        jdbc.queryForList("""
                SELECT relname, indexrelname, idx_scan, idx_tup_read
                FROM pg_stat_user_indexes
                WHERE schemaname = 'public'
                ORDER BY idx_scan DESC, relname
                """).forEach(row -> out.append(String.format("| %s | %s | %s | %s |%n",
                row.get("relname"), row.get("indexrelname"), row.get("idx_scan"), row.get("idx_tup_read"))));

        out.append("\n## Sequential scans (pg_stat_user_tables)\n\n");
        out.append("| Tabela | Seq scans | Linhas lidas em seq scan | Index scans | Linhas vivas |\n");
        out.append("| --- | ---: | ---: | ---: | ---: |\n");
        jdbc.queryForList("""
                SELECT relname, seq_scan, seq_tup_read, coalesce(idx_scan, 0) AS idx_scan, n_live_tup
                FROM pg_stat_user_tables
                WHERE schemaname = 'public'
                ORDER BY seq_tup_read DESC
                """).forEach(row -> out.append(String.format("| %s | %s | %s | %s | %s |%n",
                row.get("relname"), row.get("seq_scan"), row.get("seq_tup_read"),
                row.get("idx_scan"), row.get("n_live_tup"))));

        out.append("\n## Indices existentes\n\n");
        jdbc.queryForList("SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename")
                .forEach(row -> out.append("- `").append(row.get("indexdef")).append("`\n"));
    }

    // ------------------------------------------------------------------ bulk seeding

    private List<UUID> bulkCourses(UUID ownerId) {
        UUID areaId = defaultAreaId();
        List<UUID> ids = new ArrayList<>();
        List<Object[]> batch = new ArrayList<>();
        for (int i = 0; i < COURSES; i++) {
            UUID id = UUID.randomUUID();
            ids.add(id);
            batch.add(new Object[] { id, ownerId, "Curso java " + i, "curso-" + i,
                    "Descricao do curso " + i, areaId });
        }
        jdbc.batchUpdate("INSERT INTO courses (id, owner_id, name, slug, description, area_id, "
                + "status, visibility, categories) VALUES (?, ?, ?, ?, ?, ?, 'available', 'public', "
                + "'{java,backend}'::text[])", batch);
        // Every course gets one module + two lessons, so lesson counts are never trivially zero.
        for (UUID id : ids) {
            curriculum(id, 1, 2, 1);
        }
        return ids;
    }

    private List<UUID> bulkTrilhas(UUID ownerId) {
        UUID areaId = defaultAreaId();
        List<UUID> ids = new ArrayList<>();
        List<Object[]> batch = new ArrayList<>();
        for (int i = 0; i < 60; i++) {
            UUID id = UUID.randomUUID();
            ids.add(id);
            batch.add(new Object[] { id, ownerId, "Trilha java " + i, "trilha-" + i, "Descricao " + i, areaId });
        }
        jdbc.batchUpdate("INSERT INTO trilhas (id, owner_id, title, slug, description, area_id, status, "
                + "visibility, categories) VALUES (?, ?, ?, ?, ?, ?, 'available', 'public', '{java}'::text[])",
                batch);
        return ids;
    }

    /** The "Programação" area seeded once by migration V19 - every course/trilha needs one. */
    private UUID defaultAreaId() {
        return jdbc.queryForObject("SELECT id FROM areas WHERE slug = 'programacao'", UUID.class);
    }

    private void curriculum(UUID courseId, int modules, int lessonsPerModule, int blocksPerLesson) {
        for (int m = 0; m < modules; m++) {
            UUID moduleId = UUID.randomUUID();
            jdbc.update("INSERT INTO modules (id, course_id, title, order_index) VALUES (?, ?, ?, ?)",
                    moduleId, courseId, "Modulo " + m, m);
            List<Object[]> lessons = new ArrayList<>();
            List<Object[]> blocks = new ArrayList<>();
            for (int l = 0; l < lessonsPerModule; l++) {
                UUID lessonId = UUID.randomUUID();
                lessons.add(new Object[] { lessonId, moduleId, "Aula " + m + "." + l, l });
                for (int b = 0; b < blocksPerLesson; b++) {
                    blocks.add(new Object[] { UUID.randomUUID(), lessonId,
                            "<p>Conteudo " + m + "." + l + "." + b + "</p>", b });
                }
            }
            jdbc.batchUpdate("INSERT INTO lessons (id, module_id, title, order_index) VALUES (?, ?, ?, ?)",
                    lessons);
            jdbc.batchUpdate("INSERT INTO lesson_blocks (id, lesson_id, type, content, order_index) "
                    + "VALUES (?, ?, 'text', ?, ?)", blocks);
        }
    }

    private void bulkTrilhaItems(UUID trilhaId, List<UUID> courses) {
        List<Object[]> batch = new ArrayList<>();
        for (int i = 0; i < TRILHA_ITEMS; i++) {
            batch.add(new Object[] { UUID.randomUUID(), trilhaId, courses.get(i), i });
        }
        jdbc.batchUpdate("INSERT INTO trilha_items (id, trilha_id, course_id, order_index) "
                + "VALUES (?, ?, ?, ?)", batch);
    }

    private void bulkEngagement(UUID viewerId, UUID ownerId, List<UUID> courses, List<UUID> trilhas) {
        List<Object[]> enrollments = new ArrayList<>();
        List<Object[]> likes = new ArrayList<>();
        for (int i = 0; i < ENROLLMENTS; i++) {
            enrollments.add(new Object[] { viewerId, courses.get(i) });
            likes.add(new Object[] { viewerId, courses.get(i) });
        }
        jdbc.batchUpdate("INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)", enrollments);
        jdbc.batchUpdate("INSERT INTO course_likes (user_id, course_id) VALUES (?, ?)", likes);

        List<Object[]> follows = new ArrayList<>();
        for (int i = 0; i < FOLLOWED_TRILHAS; i++) {
            follows.add(new Object[] { viewerId, trilhas.get(i) });
        }
        jdbc.batchUpdate("INSERT INTO trilha_enrollments (user_id, trilha_id) VALUES (?, ?)", follows);

        // Half of the lessons of the first 40 enrolled courses completed.
        List<UUID> lessons = jdbc.queryForList("""
                SELECT l.id FROM lessons l
                JOIN modules m ON m.id = l.module_id
                WHERE m.course_id = ANY (?::uuid[])
                """, UUID.class, "{" + String.join(",",
                courses.subList(0, 40).stream().map(UUID::toString).toList()) + "}");
        List<Object[]> completions = new ArrayList<>();
        for (int i = 0; i < lessons.size() / 2; i++) {
            completions.add(new Object[] { viewerId, lessons.get(i) });
        }
        jdbc.batchUpdate("INSERT INTO lesson_completions (user_id, lesson_id) VALUES (?, ?)", completions);
    }

    private UUID bulkLibrary(UUID viewerId, List<UUID> courses, List<UUID> trilhas) {
        UUID defaultFolder = UUID.randomUUID();
        jdbc.update("INSERT INTO library_folders (id, user_id, name, is_default) VALUES (?, ?, ?, true)",
                defaultFolder, viewerId, "Favoritos");
        UUID folder = UUID.randomUUID();
        jdbc.update("INSERT INTO library_folders (id, user_id, name, is_default) VALUES (?, ?, ?, false)",
                folder, viewerId, "Estudar depois");

        List<Object[]> items = new ArrayList<>();
        for (int i = 0; i < LIBRARY_ITEMS - 10; i++) {
            items.add(new Object[] { UUID.randomUUID(), viewerId, folder, courses.get(i), null });
        }
        for (int i = 0; i < 10; i++) {
            items.add(new Object[] { UUID.randomUUID(), viewerId, folder, null, trilhas.get(i) });
        }
        jdbc.batchUpdate("INSERT INTO library_items (id, user_id, folder_id, course_id, trilha_id) "
                + "VALUES (?, ?, ?, ?, ?)", items);
        return folder;
    }

    @SuppressWarnings("unused")
    private Map<String, Long> unusedHelper() {
        return new LinkedHashMap<>();
    }
}
