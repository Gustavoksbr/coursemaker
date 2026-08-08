package com.coursemaker.repository;

import com.coursemaker.domain.entity.CommentBan;
import com.coursemaker.domain.entity.CompositeIds.CourseUserId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface CommentBanRepository extends JpaRepository<CommentBan, CourseUserId> {

    @Query("SELECT b.id.userId FROM CommentBan b WHERE b.id.courseId = :courseId")
    List<UUID> findBannedUserIds(@Param("courseId") UUID courseId);
}
