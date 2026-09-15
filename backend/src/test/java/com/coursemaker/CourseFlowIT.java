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

/** Creating, publishing, listing, editing and deleting a course. */
class CourseFlowIT extends IntegrationTest {

    @Test
    @DisplayName("cria um curso como rascunho, com slug derivado do nome")
    void createsDraftCourseWithGeneratedSlug() throws Exception {
        TestUser owner = fixtures.user("ana");

        JsonNode course = postOk("/api/v1/courses", Map.of(
                "name", "Introdução à Programação",
                "description", "Do zero ao primeiro programa",
                "categories", List.of("java", "iniciante"),
                "areaId", fixtures.defaultAreaId()), owner.caller());

        // pt-BR aware slugify: accents are stripped rather than percent-encoded.
        assertThat(course.get("slug").asText()).isEqualTo("introducao-a-programacao");
        assertThat(course.get("status").asText()).isEqualTo("unavailable");
        assertThat(course.get("visibility").asText()).isEqualTo("public");
        assertThat(course.get("owner").get("nickname").asText()).isEqualTo("ana");
        assertThat(course.get("categories")).hasSize(2);
    }

    @Test
    @DisplayName("resolve colisao de slug com sufixo numerico, por dono")
    void resolvesSlugCollisionsPerOwner() throws Exception {
        TestUser ana = fixtures.user("ana");
        TestUser bruno = fixtures.user("bruno");

        JsonNode first = postOk("/api/v1/courses",
                Map.of("name", "Curso de Java", "areaId", fixtures.defaultAreaId()), ana.caller());
        JsonNode second = postOk("/api/v1/courses",
                Map.of("name", "Curso de Java", "areaId", fixtures.defaultAreaId()), ana.caller());
        JsonNode other = postOk("/api/v1/courses",
                Map.of("name", "Curso de Java", "areaId", fixtures.defaultAreaId()), bruno.caller());

        assertThat(first.get("slug").asText()).isEqualTo("curso-de-java");
        assertThat(second.get("slug").asText()).isEqualTo("curso-de-java-2");
        // Slugs are unique per owner, so Bruno keeps the clean one.
        assertThat(other.get("slug").asText()).isEqualTo("curso-de-java");
    }

    @Test
    @DisplayName("slug-check informa disponibilidade e sugere alternativa")
    void slugCheckSuggestsAlternative() throws Exception {
        TestUser owner = fixtures.user("ana");
        postOk("/api/v1/courses", Map.of("name", "Curso de Java", "areaId", fixtures.defaultAreaId()), owner.caller());

        JsonNode free = getOk("/api/v1/courses/slug-check?name=Outro Curso", owner.caller());
        assertThat(free.get("available").asBoolean()).isTrue();

        JsonNode taken = getOk("/api/v1/courses/slug-check?name=Curso de Java", owner.caller());
        assertThat(taken.get("available").asBoolean()).isFalse();
        assertThat(taken.get("suggestion").asText()).isEqualTo("curso-de-java-2");
    }

    @Test
    @DisplayName("rascunho so aparece para o dono")
    void draftsAreVisibleOnlyToTheirOwner() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser stranger = fixtures.user("bruno");
        UUID courseId = fixtures.draftCourse(owner, "Rascunho");

        assertThat(getOk("/api/v1/courses", owner.caller()).get("totalItems").asInt()).isEqualTo(1);
        assertThat(getOk("/api/v1/courses", stranger.caller()).get("totalItems").asInt()).isZero();
        assertThat(getOk("/api/v1/courses", Caller.ANONYMOUS).get("totalItems").asInt()).isZero();

        get("/api/v1/courses/" + courseId, stranger.caller()).andExpect(status().isNotFound());
        get("/api/v1/courses/" + courseId, owner.caller()).andExpect(status().isOk());
    }

    @Test
    @DisplayName("publicar torna o curso visivel para todos")
    void publishingMakesCourseVisible() throws Exception {
        TestUser owner = fixtures.user("ana");
        UUID courseId = fixtures.draftCourse(owner, "Curso Publico");

        fixtures.publish(owner, courseId);

        JsonNode listing = getOk("/api/v1/courses", Caller.ANONYMOUS);
        assertThat(listing.get("totalItems").asInt()).isEqualTo(1);
        assertThat(listing.get("items").get(0).get("status").asText()).isEqualTo("available");
    }

    @Test
    @DisplayName("busca o curso pela URL publica /:nickname/:slug")
    void findsCourseByPublicUrl() throws Exception {
        TestUser owner = fixtures.user("ana");
        fixtures.publishedCourse(owner, "Spring Boot na Pratica");

        JsonNode detail = getOk("/api/v1/courses/by-slug/ana/spring-boot-na-pratica", Caller.ANONYMOUS);

        assertThat(detail.get("summary").get("name").asText()).isEqualTo("Spring Boot na Pratica");
        assertThat(detail.get("canViewContent").asBoolean()).isTrue();
        assertThat(detail.get("isOwner").asBoolean()).isFalse();
        assertThat(detail.get("requiresPassword").asBoolean()).isFalse();
    }

    @Test
    @DisplayName("apenas o dono edita ou exclui o curso")
    void onlyOwnerCanEditOrDelete() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser stranger = fixtures.user("bruno");
        UUID courseId = fixtures.publishedCourse(owner, "Curso da Ana");

        patch("/api/v1/courses/" + courseId, Map.of("name", "Sequestrado"), stranger.caller())
                .andExpect(status().isForbidden());
        delete("/api/v1/courses/" + courseId, stranger.caller()).andExpect(status().isForbidden());

        JsonNode updated = patchOk("/api/v1/courses/" + courseId,
                Map.of("name", "Curso da Ana v2"), owner.caller());
        assertThat(updated.get("name").asText()).isEqualTo("Curso da Ana v2");
    }

    @Test
    @DisplayName("excluir o curso leva junto modulos, licoes e blocos")
    void deletingCourseCascades() throws Exception {
        TestUser owner = fixtures.user("ana");
        UUID courseId = fixtures.draftCourse(owner, "Curso Descartavel");
        UUID moduleId = fixtures.module(owner, courseId, "Modulo 1");
        UUID lessonId = fixtures.lesson(owner, moduleId, "Licao 1");
        fixtures.textBlock(owner, lessonId, "<p>Conteudo</p>");

        delete("/api/v1/courses/" + courseId, owner.caller()).andExpect(status().isNoContent());

        assertThat(count("courses")).isZero();
        assertThat(count("modules")).isZero();
        assertThat(count("lessons")).isZero();
        assertThat(count("lesson_blocks")).isZero();
    }

    @Test
    @DisplayName("tornar privado exige senha; voltar a publico limpa o hash")
    void privateCoursesRequireAPassword() throws Exception {
        TestUser owner = fixtures.user("ana");
        UUID courseId = fixtures.draftCourse(owner, "Curso Fechado");

        patch("/api/v1/courses/" + courseId, Map.of("visibility", "private"), owner.caller())
                .andExpect(status().isBadRequest());

        patchOk("/api/v1/courses/" + courseId,
                Map.of("visibility", "private", "password", "abre-te-sesamo"), owner.caller());
        assertThat(passwordHashOf(courseId)).isNotNull();

        patchOk("/api/v1/courses/" + courseId, Map.of("visibility", "public"), owner.caller());
        assertThat(passwordHashOf(courseId)).isNull();
    }

    @Test
    @DisplayName("criar curso exige nickname definido")
    void creatingRequiresANickname() throws Exception {
        TestUser novato = fixtures.userWithoutNickname();

        post("/api/v1/courses", Map.of("name", "Curso sem dono"), novato.caller())
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("apenas admin alterna o destaque")
    void onlyAdminCanToggleFeatured() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser admin = fixtures.admin("chefe");
        UUID courseId = fixtures.publishedCourse(owner, "Curso Destaque");

        post("/api/v1/courses/" + courseId + "/featured", null, owner.caller())
                .andExpect(status().isForbidden());

        JsonNode featured = postOk("/api/v1/courses/" + courseId + "/featured", null, admin.caller());
        assertThat(featured.get("featured").asBoolean()).isTrue();
    }

    // --------------------------------------------------------------- filtering

    @Test
    @DisplayName("filtra por termo, autor e visibilidade")
    void filtersByTermAuthorAndVisibility() throws Exception {
        TestUser ana = fixtures.user("ana");
        TestUser bruno = fixtures.user("bruno");
        fixtures.publishedCourse(ana, "Java Avancado");
        fixtures.publishedCourse(bruno, "Python para Dados");
        fixtures.privateCourse(bruno, "Curso Interno", "segredo123");

        assertThat(totalFor("/api/v1/courses?q=java")).isEqualTo(1);
        assertThat(totalFor("/api/v1/courses?author=bruno")).isEqualTo(2);
        assertThat(totalFor("/api/v1/courses?visibility=private")).isEqualTo(1);
        // The term also matches the author's nickname and name.
        assertThat(totalFor("/api/v1/courses?q=bruno")).isEqualTo(2);
    }

    @Test
    @DisplayName("filtra por varias categorias, combinando com OR")
    void filtersByMultipleCategories() throws Exception {
        TestUser owner = fixtures.user("ana");
        createPublished(owner, "Curso Java", List.of("java", "backend"));
        createPublished(owner, "Curso React", List.of("react", "frontend"));
        createPublished(owner, "Curso Go", List.of("go", "backend"));

        assertThat(totalFor("/api/v1/courses?category=java")).isEqualTo(1);
        assertThat(totalFor("/api/v1/courses?category=backend")).isEqualTo(2);
        assertThat(totalFor("/api/v1/courses?category=java&category=react")).isEqualTo(2);
        assertThat(totalFor("/api/v1/courses?category=java&category=go&category=react")).isEqualTo(3);
        assertThat(totalFor("/api/v1/courses?category=inexistente")).isZero();
    }

    @Test
    @DisplayName("aceita os valores de enum da API nos query params, e recusa os invalidos com 400")
    void bindsEnumWireValuesInQueryParams() throws Exception {
        TestUser owner = fixtures.user("ana");
        fixtures.publishedCourse(owner, "Curso Publico");
        fixtures.privateCourse(owner, "Curso Privado", "segredo123");

        // Query params bypass Jackson, so the lowercase wire values only bind thanks to WebConfig.
        assertThat(totalFor("/api/v1/courses?visibility=private")).isEqualTo(1);
        assertThat(totalFor("/api/v1/courses?visibility=public")).isEqualTo(1);
        // An empty filter means "not applied", not "invalid".
        assertThat(totalFor("/api/v1/courses?visibility=")).isEqualTo(2);

        get("/api/v1/courses?visibility=roxo", Caller.ANONYMOUS).andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("id malformado na URL responde 400, nao 500")
    void malformedIdIsABadRequest() throws Exception {
        get("/api/v1/courses/nao-e-um-uuid", Caller.ANONYMOUS).andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("ordena por curtidas e por nome")
    void sortsByLikesAndName() throws Exception {
        TestUser owner = fixtures.user("ana");
        TestUser fan = fixtures.user("bruno");
        UUID zebra = fixtures.publishedCourse(owner, "Zebra");
        fixtures.publishedCourse(owner, "Alfa");
        postOk("/api/v1/courses/" + zebra + "/like", null, fan.caller());

        JsonNode byLikes = getOk("/api/v1/courses?sort=likes", Caller.ANONYMOUS);
        assertThat(byLikes.get("items").get(0).get("name").asText()).isEqualTo("Zebra");

        JsonNode byName = getOk("/api/v1/courses?sort=name", Caller.ANONYMOUS);
        assertThat(byName.get("items").get(0).get("name").asText()).isEqualTo("Alfa");
    }

    @Test
    @DisplayName("pagina os resultados")
    void paginatesResults() throws Exception {
        TestUser owner = fixtures.user("ana");
        for (int index = 1; index <= 5; index++) {
            fixtures.publishedCourse(owner, "Curso " + index);
        }

        JsonNode firstPage = getOk("/api/v1/courses?size=2&page=0", Caller.ANONYMOUS);
        assertThat(firstPage.get("items")).hasSize(2);
        assertThat(firstPage.get("totalItems").asInt()).isEqualTo(5);
        assertThat(firstPage.get("totalPages").asInt()).isEqualTo(3);
        assertThat(firstPage.get("hasNext").asBoolean()).isTrue();

        JsonNode lastPage = getOk("/api/v1/courses?size=2&page=2", Caller.ANONYMOUS);
        assertThat(lastPage.get("items")).hasSize(1);
        assertThat(lastPage.get("hasNext").asBoolean()).isFalse();
    }

    // ----------------------------------------------------------------- helpers

    private void createPublished(TestUser owner, String name, List<String> categories) throws Exception {
        JsonNode course = postOk("/api/v1/courses",
                Map.of("name", name, "categories", categories, "areaId", fixtures.defaultAreaId()), owner.caller());
        fixtures.publish(owner, UUID.fromString(course.get("id").asText()));
    }

    private int totalFor(String path) throws Exception {
        return getOk(path, Caller.ANONYMOUS).get("totalItems").asInt();
    }

    private long count(String table) {
        return jdbc.queryForObject("SELECT count(*) FROM " + table, Long.class);
    }

    private String passwordHashOf(UUID courseId) {
        return jdbc.queryForObject("SELECT password_hash FROM courses WHERE id = ?", String.class, courseId);
    }
}
