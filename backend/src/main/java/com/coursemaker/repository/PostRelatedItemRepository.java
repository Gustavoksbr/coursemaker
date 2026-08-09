package com.coursemaker.repository;

import com.coursemaker.domain.entity.PostRelatedItem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface PostRelatedItemRepository extends JpaRepository<PostRelatedItem, UUID> {

    @Query("SELECT r FROM PostRelatedItem r "
            + "LEFT JOIN FETCH r.relatedCourse rc LEFT JOIN FETCH rc.owner "
            + "LEFT JOIN FETCH r.relatedPost rp LEFT JOIN FETCH rp.owner "
            + "WHERE r.post.id = :postId ORDER BY r.orderIndex ASC")
    Page<PostRelatedItem> findByPostOrdered(@Param("postId") UUID postId, Pageable pageable);

    @Query("SELECT coalesce(max(r.orderIndex), -1) FROM PostRelatedItem r WHERE r.post.id = :postId")
    int findMaxOrder(@Param("postId") UUID postId);

    boolean existsByPostIdAndRelatedCourseId(UUID postId, UUID relatedCourseId);

    boolean existsByPostIdAndRelatedPostId(UUID postId, UUID relatedPostId);
}
