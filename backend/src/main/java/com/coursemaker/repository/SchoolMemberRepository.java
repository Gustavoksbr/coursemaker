package com.coursemaker.repository;

import com.coursemaker.domain.entity.CompositeIds.SchoolUserId;
import com.coursemaker.domain.entity.SchoolMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface SchoolMemberRepository extends JpaRepository<SchoolMember, SchoolUserId> {

    /** Schools this user is allowed to publish under - backs {@code GET /users/me/schools}. */
    @Query("SELECT sm.id.schoolId FROM SchoolMember sm WHERE sm.id.userId = :userId")
    List<UUID> findSchoolIdsByUserId(@Param("userId") UUID userId);

    /** Members of one school, for the admin management screen. */
    @Query("SELECT sm.id.userId FROM SchoolMember sm WHERE sm.id.schoolId = :schoolId ORDER BY sm.createdAt")
    List<UUID> findUserIdsBySchoolId(@Param("schoolId") UUID schoolId);
}
