package com.coursemaker.repository;

import com.coursemaker.domain.entity.CompositeIds.UserTrilhaId;
import com.coursemaker.domain.entity.TrilhaEnrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface TrilhaEnrollmentRepository extends JpaRepository<TrilhaEnrollment, UserTrilhaId> {

    @Query("SELECT count(e) FROM TrilhaEnrollment e WHERE e.id.trilhaId = :trilhaId")
    long countByTrilhaId(@Param("trilhaId") UUID trilhaId);

    @Query("SELECT e.id.trilhaId FROM TrilhaEnrollment e WHERE e.id.userId = :userId AND e.id.trilhaId IN :trilhaIds")
    List<UUID> findEnrolledTrilhaIds(@Param("userId") UUID userId, @Param("trilhaIds") Collection<UUID> trilhaIds);

    @Query("SELECT e.id.trilhaId FROM TrilhaEnrollment e WHERE e.id.userId = :userId")
    List<UUID> findAllTrilhaIdsByUser(@Param("userId") UUID userId);

    /** Full rows (not just ids), for when the follow date itself is needed - see LibraryService. */
    @Query("SELECT e FROM TrilhaEnrollment e WHERE e.id.userId = :userId ORDER BY e.createdAt DESC")
    List<TrilhaEnrollment> findAllByUser(@Param("userId") UUID userId);
}
