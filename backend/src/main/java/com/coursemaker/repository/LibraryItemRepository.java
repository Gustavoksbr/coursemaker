package com.coursemaker.repository;

import com.coursemaker.domain.entity.LibraryFolder;
import com.coursemaker.domain.entity.LibraryItem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LibraryItemRepository extends JpaRepository<LibraryItem, UUID> {

        @Query("SELECT li FROM LibraryItem li WHERE li.user.id = :userId AND li.course.id = :courseId")
        Optional<LibraryItem> findByUserAndCourse(@Param("userId") UUID userId, @Param("courseId") UUID courseId);

        @Query("SELECT li FROM LibraryItem li WHERE li.user.id = :userId AND li.post.id = :postId")
        Optional<LibraryItem> findByUserAndPost(@Param("userId") UUID userId, @Param("postId") UUID postId);

        @Query("SELECT li FROM LibraryItem li WHERE li.user.id = :userId AND li.trilha.id = :trilhaId")
        Optional<LibraryItem> findByUserAndTrilha(@Param("userId") UUID userId, @Param("trilhaId") UUID trilhaId);

        @Query("SELECT li.course.id FROM LibraryItem li WHERE li.user.id = :userId AND li.course.id IN :ids")
        List<UUID> findSavedCourseIds(@Param("userId") UUID userId, @Param("ids") Collection<UUID> ids);

        @Query("SELECT li.post.id FROM LibraryItem li WHERE li.user.id = :userId AND li.post.id IN :ids")
        List<UUID> findSavedPostIds(@Param("userId") UUID userId, @Param("ids") Collection<UUID> ids);

        @Query("SELECT li.trilha.id FROM LibraryItem li WHERE li.user.id = :userId AND li.trilha.id IN :ids")
        List<UUID> findSavedTrilhaIds(@Param("userId") UUID userId, @Param("ids") Collection<UUID> ids);

        /** {@code :areaId} optional - null matches every area, so callers can share this query as-is. */
        @Query("SELECT li FROM LibraryItem li "
                        + "LEFT JOIN FETCH li.course c LEFT JOIN FETCH c.owner "
                        + "LEFT JOIN FETCH li.post p LEFT JOIN FETCH p.owner "
                        + "LEFT JOIN FETCH li.trilha t LEFT JOIN FETCH t.owner "
                        + "WHERE li.user.id = :userId AND li.folder.id = :folderId "
                        + "AND (:areaId IS NULL "
                        + "     OR (c IS NOT NULL AND c.area.id = :areaId) "
                        + "     OR (p IS NOT NULL AND p.area.id = :areaId) "
                        + "     OR (t IS NOT NULL AND t.area.id = :areaId)) "
                        + "ORDER BY li.createdAt DESC")
        Page<LibraryItem> findByUserAndFolderOrdered(@Param("userId") UUID userId, @Param("folderId") UUID folderId,
                        @Param("areaId") UUID areaId, Pageable pageable);

        @Query("SELECT li.folder.id, count(li) FROM LibraryItem li "
                        + "LEFT JOIN li.course c LEFT JOIN li.post p LEFT JOIN li.trilha t "
                        + "WHERE li.user.id = :userId "
                        + "AND (:areaId IS NULL "
                        + "     OR (c IS NOT NULL AND c.area.id = :areaId) "
                        + "     OR (p IS NOT NULL AND p.area.id = :areaId) "
                        + "     OR (t IS NOT NULL AND t.area.id = :areaId)) "
                        + "GROUP BY li.folder.id")
        List<Object[]> countByFolderForUser(@Param("userId") UUID userId, @Param("areaId") UUID areaId);

        @Query("SELECT count(li) FROM LibraryItem li "
                        + "LEFT JOIN li.course c LEFT JOIN li.post p LEFT JOIN li.trilha t "
                        + "WHERE li.folder.id = :folderId "
                        + "AND (:areaId IS NULL "
                        + "     OR (c IS NOT NULL AND c.area.id = :areaId) "
                        + "     OR (p IS NOT NULL AND p.area.id = :areaId) "
                        + "     OR (t IS NOT NULL AND t.area.id = :areaId))")
        long countByFolderId(@Param("folderId") UUID folderId, @Param("areaId") UUID areaId);

        /** Used when a folder is deleted: its saves survive, re-filed into Favoritos. */
        @Modifying(clearAutomatically = true, flushAutomatically = true)
        @Query("UPDATE LibraryItem li SET li.folder = :target WHERE li.folder.id = :folderId")
        void refileAll(@Param("folderId") UUID folderId, @Param("target") LibraryFolder target);
}
