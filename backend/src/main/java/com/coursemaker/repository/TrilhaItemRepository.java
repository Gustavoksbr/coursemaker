package com.coursemaker.repository;

import com.coursemaker.domain.entity.TrilhaItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TrilhaItemRepository extends JpaRepository<TrilhaItem, UUID> {

    /**
     * Every item of the trilha, ordered for display: ungrouped items first (in their own order),
     * then each step's items in step order, then item order within the step.
     */
    @Query("SELECT ti FROM TrilhaItem ti "
            + "LEFT JOIN FETCH ti.step "
            + "LEFT JOIN FETCH ti.course c LEFT JOIN FETCH c.owner "
            + "LEFT JOIN FETCH ti.post p LEFT JOIN FETCH p.owner "
            + "WHERE ti.trilha.id = :trilhaId "
            + "ORDER BY CASE WHEN ti.step IS NULL THEN 0 ELSE 1 END, ti.step.orderIndex, ti.orderIndex")
    List<TrilhaItem> findAllByTrilhaOrdered(@Param("trilhaId") UUID trilhaId);

    @Query("SELECT ti FROM TrilhaItem ti JOIN FETCH ti.trilha t JOIN FETCH t.owner WHERE ti.id = :id")
    Optional<TrilhaItem> findByIdWithTrilha(@Param("id") UUID id);

    @Query("SELECT coalesce(max(ti.orderIndex), -1) FROM TrilhaItem ti "
            + "WHERE ti.trilha.id = :trilhaId AND ti.step IS NULL")
    int findMaxOrderUngrouped(@Param("trilhaId") UUID trilhaId);

    @Query("SELECT coalesce(max(ti.orderIndex), -1) FROM TrilhaItem ti WHERE ti.step.id = :stepId")
    int findMaxOrderInStep(@Param("stepId") UUID stepId);

    @Query("SELECT count(ti) FROM TrilhaItem ti WHERE ti.trilha.id = :trilhaId")
    long countByTrilhaId(@Param("trilhaId") UUID trilhaId);

    boolean existsByTrilhaIdAndCourseId(UUID trilhaId, UUID courseId);

    boolean existsByTrilhaIdAndPostId(UUID trilhaId, UUID postId);
}
