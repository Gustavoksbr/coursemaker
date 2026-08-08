package com.coursemaker.repository;

import com.coursemaker.domain.entity.CompositeIds.UserPostId;
import com.coursemaker.domain.entity.PostLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface PostLikeRepository extends JpaRepository<PostLike, UserPostId> {

    @Query("SELECT count(l) FROM PostLike l WHERE l.id.postId = :postId")
    long countByPostId(@Param("postId") UUID postId);

    @Query("SELECT l.id.postId, count(l) FROM PostLike l WHERE l.id.postId IN :postIds GROUP BY l.id.postId")
    List<Object[]> countByPostIds(@Param("postIds") Collection<UUID> postIds);

    @Query("SELECT l.id.postId FROM PostLike l WHERE l.id.userId = :userId AND l.id.postId IN :postIds")
    List<UUID> findLikedPostIds(@Param("userId") UUID userId, @Param("postIds") Collection<UUID> postIds);
}
