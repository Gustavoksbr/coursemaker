package com.coursemaker.repository;

import com.coursemaker.domain.entity.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PostRepository extends JpaRepository<Post, UUID> {

    @Query("SELECT p FROM Post p JOIN FETCH p.owner WHERE p.id = :id")
    Optional<Post> findByIdWithOwner(@Param("id") UUID id);

    @Query("SELECT p FROM Post p JOIN FETCH p.owner o "
            + "WHERE lower(o.nickname) = lower(:nickname) AND p.slug = :slug")
    Optional<Post> findByOwnerNicknameAndSlug(@Param("nickname") String nickname, @Param("slug") String slug);

    boolean existsByOwnerIdAndSlug(UUID ownerId, String slug);

    @Query("SELECT p.slug FROM Post p WHERE p.owner.id = :ownerId AND p.slug LIKE concat(:base, '%')")
    List<String> findSlugsStartingWith(@Param("ownerId") UUID ownerId, @Param("base") String base);

    @Query("SELECT p FROM Post p JOIN FETCH p.owner o WHERE o.id = :ownerId ORDER BY p.createdAt DESC")
    List<Post> findAllByOwnerId(@Param("ownerId") UUID ownerId);

    /** Mirrors {@link CourseRepository#search}; see the notes there. */
    @Query(value = """
            SELECT p.* FROM posts p
            JOIN users u ON u.id = p.owner_id
            WHERE (CAST(:q AS text) IS NULL
                   OR p.title ILIKE '%' || CAST(:q AS text) || '%'
                   OR p.description ILIKE '%' || CAST(:q AS text) || '%'
                   OR u.nickname ILIKE '%' || CAST(:q AS text) || '%'
                   OR u.name ILIKE '%' || CAST(:q AS text) || '%'
                   OR EXISTS (SELECT 1 FROM unnest(p.categories) cat
                              WHERE cat ILIKE '%' || CAST(:q AS text) || '%'))
              AND (CAST(:author AS text) IS NULL OR lower(u.nickname) = lower(CAST(:author AS text)))
              AND (CAST(:visibility AS text) IS NULL OR p.visibility = CAST(:visibility AS text))
              AND (CAST(:categories AS text) IS NULL
                   OR p.categories && string_to_array(CAST(:categories AS text), chr(1)))
              AND (CAST(:featuredOnly AS boolean) IS NOT TRUE OR p.is_featured)
              AND (p.status = 'available' OR p.owner_id = CAST(:viewerId AS uuid))
            ORDER BY
              CASE WHEN CAST(:sort AS text) = 'likes'
                   THEN (SELECT count(*) FROM post_likes pl WHERE pl.post_id = p.id)
                   ELSE 0 END DESC,
              CASE WHEN CAST(:sort AS text) = 'name' THEN p.title ELSE '' END ASC,
              p.created_at DESC
            """,
            countQuery = """
            SELECT count(*) FROM posts p
            JOIN users u ON u.id = p.owner_id
            WHERE (CAST(:q AS text) IS NULL
                   OR p.title ILIKE '%' || CAST(:q AS text) || '%'
                   OR p.description ILIKE '%' || CAST(:q AS text) || '%'
                   OR u.nickname ILIKE '%' || CAST(:q AS text) || '%'
                   OR u.name ILIKE '%' || CAST(:q AS text) || '%'
                   OR EXISTS (SELECT 1 FROM unnest(p.categories) cat
                              WHERE cat ILIKE '%' || CAST(:q AS text) || '%'))
              AND (CAST(:author AS text) IS NULL OR lower(u.nickname) = lower(CAST(:author AS text)))
              AND (CAST(:visibility AS text) IS NULL OR p.visibility = CAST(:visibility AS text))
              AND (CAST(:categories AS text) IS NULL
                   OR p.categories && string_to_array(CAST(:categories AS text), chr(1)))
              AND (CAST(:featuredOnly AS boolean) IS NOT TRUE OR p.is_featured)
              AND (p.status = 'available' OR p.owner_id = CAST(:viewerId AS uuid))
            """,
            nativeQuery = true)
    Page<Post> search(@Param("q") String q,
                      @Param("author") String author,
                      @Param("visibility") String visibility,
                      @Param("categories") String categories,
                      @Param("featuredOnly") Boolean featuredOnly,
                      @Param("sort") String sort,
                      @Param("viewerId") UUID viewerId,
                      Pageable pageable);
}
