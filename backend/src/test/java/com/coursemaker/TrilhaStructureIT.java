package com.coursemaker;

import com.coursemaker.support.Fixtures.TestUser;
import com.coursemaker.support.IntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.StreamSupport;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** The one bulk endpoint added for the batch-save editors: reordering a trilha's items in one call. */
@DisplayName("Trilhas: reordenacao em lote dos itens de uma etapa ou dos itens sem etapa")
class TrilhaStructureIT extends IntegrationTest {

    @Test
    @DisplayName("reordena os itens de uma etapa e persiste a nova ordem")
    void reordersItemsWithinAStep() throws Exception {
        TestUser owner = fixtures.user("ana");
        UUID trilhaId = fixtures.trilha(owner, "Trilha Java");
        UUID stepId = fixtures.trilhaStep(owner, trilhaId, "Etapa 1");
        UUID first = fixtures.trilhaItem(owner, trilhaId, fixtures.publishedCourse(owner, "Curso A"), stepId);
        UUID second = fixtures.trilhaItem(owner, trilhaId, fixtures.publishedCourse(owner, "Curso B"), stepId);
        UUID third = fixtures.trilhaItem(owner, trilhaId, fixtures.publishedCourse(owner, "Curso C"), stepId);

        put("/api/v1/trilhas/" + trilhaId + "/items/reorder",
                Map.of("stepId", stepId, "ids", List.of(third, first, second)), owner.caller())
                .andExpect(status().isNoContent());

        JsonNode detail = getOk("/api/v1/trilhas/" + trilhaId, owner.caller());
        JsonNode items = detail.get("structure").get("steps").get(0).get("items");
        assertThat(idsOf(items)).containsExactly(third, first, second);
    }

    @Test
    @DisplayName("reordena os itens sem etapa quando stepId e nulo")
    void reordersUngroupedItems() throws Exception {
        TestUser owner = fixtures.user("ana");
        UUID trilhaId = fixtures.trilha(owner, "Trilha Java");
        UUID first = fixtures.trilhaItem(owner, trilhaId, fixtures.publishedCourse(owner, "Curso A"), null);
        UUID second = fixtures.trilhaItem(owner, trilhaId, fixtures.publishedCourse(owner, "Curso B"), null);

        Map<String, Object> body = new java.util.HashMap<>();
        body.put("stepId", null);
        body.put("ids", List.of(second, first));
        put("/api/v1/trilhas/" + trilhaId + "/items/reorder", body, owner.caller())
                .andExpect(status().isNoContent());

        JsonNode detail = getOk("/api/v1/trilhas/" + trilhaId, owner.caller());
        assertThat(idsOf(detail.get("structure").get("ungroupedItems"))).containsExactly(second, first);
    }

    @Test
    @DisplayName("lista de ids que nao bate exatamente com os itens da etapa e rejeitada")
    void mismatchedIdSetIsRejected() throws Exception {
        TestUser owner = fixtures.user("ana");
        UUID trilhaId = fixtures.trilha(owner, "Trilha Java");
        UUID stepId = fixtures.trilhaStep(owner, trilhaId, "Etapa 1");
        fixtures.trilhaItem(owner, trilhaId, fixtures.publishedCourse(owner, "Curso A"), stepId);
        fixtures.trilhaItem(owner, trilhaId, fixtures.publishedCourse(owner, "Curso B"), stepId);

        // Only one of the two items in the step.
        put("/api/v1/trilhas/" + trilhaId + "/items/reorder",
                Map.of("stepId", stepId, "ids", List.of(UUID.randomUUID())), owner.caller())
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("item de outra etapa da mesma trilha e rejeitado")
    void itemFromAnotherStepIsRejected() throws Exception {
        TestUser owner = fixtures.user("ana");
        UUID trilhaId = fixtures.trilha(owner, "Trilha Java");
        UUID stepA = fixtures.trilhaStep(owner, trilhaId, "Etapa A");
        UUID stepB = fixtures.trilhaStep(owner, trilhaId, "Etapa B");
        UUID itemInA = fixtures.trilhaItem(owner, trilhaId, fixtures.publishedCourse(owner, "Curso A"), stepA);
        UUID itemInB = fixtures.trilhaItem(owner, trilhaId, fixtures.publishedCourse(owner, "Curso B"), stepB);

        // Claims stepA's group but includes an item that actually belongs to stepB.
        put("/api/v1/trilhas/" + trilhaId + "/items/reorder",
                Map.of("stepId", stepA, "ids", List.of(itemInA, itemInB)), owner.caller())
                .andExpect(status().isBadRequest());
    }

    private static List<UUID> idsOf(JsonNode items) {
        return StreamSupport.stream(items.spliterator(), false)
                .map(item -> UUID.fromString(item.get("id").asText()))
                .toList();
    }
}
