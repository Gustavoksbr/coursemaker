package com.coursemaker.repository;

import com.coursemaker.domain.entity.CompositeIds.UserTrilhaItemId;
import com.coursemaker.domain.entity.TrilhaItemCompletion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface TrilhaItemCompletionRepository extends JpaRepository<TrilhaItemCompletion, UserTrilhaItemId> {

    @Query("""
            SELECT tc.id.trilhaItemId FROM TrilhaItemCompletion tc
            WHERE tc.id.userId = :userId
              AND tc.id.trilhaItemId IN (SELECT ti.id FROM TrilhaItem ti WHERE ti.trilha.id = :trilhaId)
            """)
    List<UUID> findCompletedItemIds(@Param("userId") UUID userId, @Param("trilhaId") UUID trilhaId);
}
