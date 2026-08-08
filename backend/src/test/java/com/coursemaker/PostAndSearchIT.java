package com.coursemaker;

import com.coursemaker.support.Fixtures.TestUser;
import com.coursemaker.support.IntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Posts with their content blocks, and the unified homepage search. */
class PostAndSearchIT extends IntegrationTest {

    // ------------------------------------------------------------------ posts

    @Test
    @DisplayName("cria post como rascunho e publica")
    void createsAndPublishesPost() throws Exception {
        TestUser owner = fixtures.user("ana");

        JsonNode post = postOk("/api/v1/posts", Map.of(
                "title", "Como funciona o Garbage Collector",
                "description", "Um mergulho na JVM",
                "categories", List.of("java", "jvm")), owner.caller());

        assertThat(post.get("slug").asText()).isEqualTo("como-funciona-o-garbage-collector");
        assertThat(post.get("status").asText()).isEqualTo("unavailable");

        UUID postId = UUID.fromString(post.get("id").asText());
        assertThat(totalPosts(Caller.ANONYMOUS)).isZero();

        patchOk("/api/v1/posts/" + postId, Map.of("status", "available"), owner.caller());
        assertThat(totalPosts(Caller.ANONYMOUS)).isEqualTo(1);
    }

    @Test
    @DisplayName("busca o post pela URL publica /:nickname/:slug")
    void findsPostByPublicUrl() throws Exception {
        TestUser owner = fixtures.user("ana");
        fixtures.publishedPost(owner, "Dicas de Testes");

        JsonNode detail = getOk("/api/v1/posts/by-slug/ana/dicas-de-testes", Caller.ANONYMOUS);

        assertThat(detail.get("summary").get("title").asText()).isEqualTo("Dicas de Testes");
        assertThat(detail.get("isOwner").asBoolean()).isFalse();
        assertThat(detail.get("blocks")).isEmpty();
    }

    @Test
    @DisplayName("gerencia os blocos do post")
    void managesPostBlocks() throws Exception {
        TestUser owner = fixtures.user("ana");
        UUID postId = fixtures.publishedPost(owner, "Post com Blocos");

        JsonNode first = postOk("/api/v1/posts/" + postId + "/blocks",
                Map.of("type", "text", "content", "<p>Intro</p>"), owner.caller());
        JsonNode second = postOk("/api/v1/posts/" + postId + "/blocks",
                Map.of("type", "code", "content", "print('oi')", "language", "python"), owner.caller());

        patchOk("/api/v1/post-blocks/" + first.get("id").asText(),
                Map.of("content", "<p>Intro editada</p>"), owner.caller());

        putOk("/api/v1/posts/" + postId + "/blocks/reorder",
                Map.of("ids", List.of(second.get("id").asText(), first.get("id").asText())),
                owner.caller());

        JsonNode blocks = getOk("/api/v1/posts/" + postId + "/blocks", Caller.ANONYMOUS);
        assertThat(blocks).hasSize(2);
        assertThat(blocks.get(0).get("language").asText()).isEqualTo("python");
        assertThat(blocks.get(1).get("content").asText()).contains("Intro editada");

        delete("/api/v1/post-blocks/" + second.get("id").asText(), owner.caller())
                .andExpect(status().isNoContent());
        assertThat(getOk("/api/v1/posts/" + postId + "/blocks", Caller.ANONYMOUS)).hasSize(1);
    }

    @Test
    @DisplayName("apenas o dono edita ou exclui o post")
    void onlyOwnerCanEditPost() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser stranger = fixtures.user("bruno");
        UUID postId = fixtures.publishedPost(owner, "Post da Ana");

        patch("/api/v1/posts/" + postId, Map.of("title", "Roubado"), stranger.caller())
                .andExpect(status().isForbidden());
        delete("/api/v1/posts/" + postId, stranger.caller()).andExpect(status().isForbidden());
        post("/api/v1/posts/" + postId + "/blocks",
                Map.of("type", "text", "content", "<p>x</p>"), stranger.caller())
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("excluir o post leva os blocos junto")
    void deletingPostCascades() throws Exception {
        TestUser owner = fixtures.user("ana");
        UUID postId = fixtures.publishedPost(owner, "Post Descartavel");
        postOk("/api/v1/posts/" + postId + "/blocks",
                Map.of("type", "text", "content", "<p>Oi</p>"), owner.caller());

        delete("/api/v1/posts/" + postId, owner.caller()).andExpect(status().isNoContent());

        assertThat(count("posts")).isZero();
        assertThat(count("post_blocks")).isZero();
    }

    @Test
    @DisplayName("curte e descurte um post")
    void togglesPostLike() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser fan = fixtures.user("bruno");
        UUID postId = fixtures.publishedPost(owner, "Post Curtido");

        assertThat(postOk("/api/v1/posts/" + postId + "/like", null, fan.caller())
                .get("likeCount").asLong()).isEqualTo(1);
        assertThat(body(delete("/api/v1/posts/" + postId + "/like", fan.caller())
                .andExpect(status().isOk())).get("likeCount").asLong()).isZero();
    }

    @Test
    @DisplayName("filtra posts por varias categorias")
    void filtersPostsByMultipleCategories() throws Exception {
        TestUser owner = fixtures.user("ana");
        publishedPostWithCategories(owner, "Post Java", List.of("java"));
        publishedPostWithCategories(owner, "Post React", List.of("react"));
        publishedPostWithCategories(owner, "Post Go", List.of("go"));

        assertThat(totalFor("/api/v1/posts?category=java")).isEqualTo(1);
        assertThat(totalFor("/api/v1/posts?category=java&category=go")).isEqualTo(2);
    }

    // ----------------------------------------------------------------- search

    @Test
    @DisplayName("busca unificada filtra cursos e posts ao mesmo tempo")
    void unifiedSearchCoversCoursesAndPosts() throws Exception {
        TestUser owner = fixtures.user("ana");
        fixtures.publishedCourse(owner, "Curso de Kotlin");
        fixtures.publishedCourse(owner, "Curso de Python");
        fixtures.publishedPost(owner, "Kotlin no Android");
        fixtures.publishedPost(owner, "Dicas de SQL");

        JsonNode result = getOk("/api/v1/search?q=kotlin", Caller.ANONYMOUS);

        assertThat(result.get("query").asText()).isEqualTo("kotlin");
        assertThat(result.get("courses").get("items")).hasSize(1);
        assertThat(result.get("courses").get("total").asLong()).isEqualTo(1);
        assertThat(result.get("posts").get("items")).hasSize(1);
        assertThat(result.get("posts").get("items").get(0).get("title").asText())
                .isEqualTo("Kotlin no Android");
    }

    @Test
    @DisplayName("sem termo, a busca devolve destaques e recentes")
    void emptySearchReturnsFeaturedAndRecent() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser admin = fixtures.admin("chefe");
        fixtures.publishedCourse(owner, "Curso Comum");
        UUID starred = fixtures.publishedCourse(owner, "Curso Destaque");
        fixtures.publishedPost(owner, "Post Recente");
        postOk("/api/v1/courses/" + starred + "/featured", null, admin.caller());

        JsonNode result = getOk("/api/v1/search", Caller.ANONYMOUS);

        assertThat(result.get("query").asText()).isEmpty();
        // With a featured course around, that section is the featured one.
        assertThat(result.get("courses").get("items")).hasSize(1);
        assertThat(result.get("courses").get("items").get(0).get("name").asText())
                .isEqualTo("Curso Destaque");
        assertThat(result.get("posts").get("items")).hasSize(1);
    }

    @Test
    @DisplayName("sem destaques, a busca vazia cai para os cursos mais recentes")
    void emptySearchFallsBackToRecentCourses() throws Exception {
        TestUser owner = fixtures.user("ana");
        fixtures.publishedCourse(owner, "Curso Um");
        fixtures.publishedCourse(owner, "Curso Dois");

        JsonNode result = getOk("/api/v1/search", Caller.ANONYMOUS);
        assertThat(result.get("courses").get("items")).hasSize(2);
    }

    @Test
    @DisplayName("a busca nao vaza rascunhos de outras pessoas")
    void searchHidesOtherPeoplesDrafts() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser stranger = fixtures.user("bruno");
        fixtures.draftCourse(owner, "Curso Secreto");

        assertThat(getOk("/api/v1/search?q=secreto", stranger.caller())
                .get("courses").get("items")).isEmpty();
        assertThat(getOk("/api/v1/search?q=secreto", owner.caller())
                .get("courses").get("items")).hasSize(1);
    }

    @Test
    @DisplayName("o limite por secao e respeitado")
    void searchHonoursTheLimit() throws Exception {
        TestUser owner = fixtures.user("ana");
        for (int index = 1; index <= 8; index++) {
            fixtures.publishedCourse(owner, "Curso " + index);
        }

        JsonNode result = getOk("/api/v1/search?limit=6", Caller.ANONYMOUS);
        assertThat(result.get("courses").get("items")).hasSize(6);
        assertThat(result.get("courses").get("total").asLong()).isEqualTo(8);
    }

    // ----------------------------------------------------------------- helpers

    private void publishedPostWithCategories(TestUser owner, String title, List<String> categories)
            throws Exception {
        JsonNode post = postOk("/api/v1/posts",
                Map.of("title", title, "categories", categories), owner.caller());
        patchOk("/api/v1/posts/" + post.get("id").asText(),
                Map.of("status", "available"), owner.caller());
    }

    private int totalPosts(Caller caller) throws Exception {
        return getOk("/api/v1/posts", caller).get("totalItems").asInt();
    }

    private int totalFor(String path) throws Exception {
        return getOk(path, Caller.ANONYMOUS).get("totalItems").asInt();
    }

    private long count(String table) {
        return jdbc.queryForObject("SELECT count(*) FROM " + table, Long.class);
    }
}
