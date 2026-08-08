package com.coursemaker.repository;

import com.coursemaker.domain.entity.PostBlock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PostBlockRepository extends JpaRepository<PostBlock, UUID> {

    @Query("SELECT b FROM PostBlock b WHERE b.post.id = :postId ORDER BY b.orderIndex ASC")
    List<PostBlock> findByPostOrdered(@Param("postId") UUID postId);

    @Query("SELECT b FROM PostBlock b JOIN FETCH b.post p JOIN FETCH p.owner WHERE b.id = :id")
    Optional<PostBlock> findByIdWithPost(@Param("id") UUID id);

    @Query("SELECT coalesce(max(b.orderIndex), -1) FROM PostBlock b WHERE b.post.id = :postId")
    int findMaxOrder(@Param("postId") UUID postId);
}
