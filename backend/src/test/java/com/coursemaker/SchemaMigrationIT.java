package com.coursemaker;

import com.coursemaker.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Guards the contract between the Flyway migrations and the JPA entities: if these two ever drift,
 * the Spring context fails to start (hibernate ddl-auto=validate) and this test goes red first.
 */
class SchemaMigrationIT extends IntegrationTest {

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void createsEverySpecifiedTable() {
        List<String> tables = jdbc.queryForList(
                "SELECT tablename FROM pg_tables WHERE schemaname = 'public'", String.class);

        assertThat(tables).contains(
                "users", "courses", "modules", "lessons", "lesson_blocks",
                "posts", "post_blocks", "enrollments", "course_likes", "post_likes",
                "lesson_completions", "comments", "comment_bans",
                "private_course_access", "private_course_verified", "login_attempts");
    }

    @Test
    void enforcesSlugUniquenessPerOwnerAndNotGlobally() {
        String ownerA = insertUser("a@example.com", "alice");
        String ownerB = insertUser("b@example.com", "bob");

        insertCourse(ownerA, "curso-java");
        // Same slug under a different owner is allowed.
        insertCourse(ownerB, "curso-java");

        assertThat(jdbc.queryForObject("SELECT count(*) FROM courses WHERE slug = 'curso-java'", Long.class))
                .isEqualTo(2L);
    }

    @Test
    void deletingACourseCascadesToItsWholeCurriculum() {
        String owner = insertUser("owner@example.com", "owner");
        String courseId = insertCourse(owner, "curso-java");
        String moduleId = insertModule(courseId);
        String lessonId = insertLesson(moduleId);
        jdbc.update("INSERT INTO lesson_blocks (id, lesson_id, type, content, order_index) "
                + "VALUES (gen_random_uuid(), ?::uuid, 'text', '<p>hi</p>', 0)", lessonId);

        jdbc.update("DELETE FROM courses WHERE id = ?::uuid", courseId);

        assertThat(jdbc.queryForObject("SELECT count(*) FROM modules", Long.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM lessons", Long.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM lesson_blocks", Long.class)).isZero();
    }

    private String insertUser(String email, String nickname) {
        return jdbc.queryForObject(
                "INSERT INTO users (id, email, nickname, name) "
                        + "VALUES (gen_random_uuid(), ?, ?, ?) RETURNING id::text",
                String.class, email, nickname, nickname);
    }

    private String insertCourse(String ownerId, String slug) {
        return jdbc.queryForObject(
                "INSERT INTO courses (id, owner_id, name, slug, area_id) "
                        + "VALUES (gen_random_uuid(), ?::uuid, ?, ?, ?::uuid) RETURNING id::text",
                String.class, ownerId, slug, slug, defaultAreaId());
    }

    /** The "Programação" area seeded once by migration V19 - every course needs one. */
    private String defaultAreaId() {
        return jdbc.queryForObject("SELECT id::text FROM areas WHERE slug = 'programacao'", String.class);
    }

    private String insertModule(String courseId) {
        return jdbc.queryForObject(
                "INSERT INTO modules (id, course_id, title, order_index) "
                        + "VALUES (gen_random_uuid(), ?::uuid, 'Modulo 1', 0) RETURNING id::text",
                String.class, courseId);
    }

    private String insertLesson(String moduleId) {
        return jdbc.queryForObject(
                "INSERT INTO lessons (id, module_id, title, order_index) "
                        + "VALUES (gen_random_uuid(), ?::uuid, 'Licao 1', 0) RETURNING id::text",
                String.class, moduleId);
    }
}
