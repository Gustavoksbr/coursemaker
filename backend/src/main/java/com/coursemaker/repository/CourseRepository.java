package com.coursemaker.repository;

import com.coursemaker.domain.entity.Course;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CourseRepository extends JpaRepository<Course, UUID> {

    @Query("SELECT c FROM Course c JOIN FETCH c.owner JOIN FETCH c.area WHERE c.id = :id")
    Optional<Course> findByIdWithOwner(@Param("id") UUID id);

    @Query("SELECT c FROM Course c JOIN FETCH c.owner o JOIN FETCH c.area "
            + "WHERE lower(o.nickname) = lower(:nickname) AND c.slug = :slug")
    Optional<Course> findByOwnerNicknameAndSlug(@Param("nickname") String nickname, @Param("slug") String slug);

    boolean existsByOwnerIdAndSlug(UUID ownerId, String slug);

    boolean existsByAreaId(UUID areaId);

    @Query("SELECT c.slug FROM Course c WHERE c.owner.id = :ownerId AND c.slug LIKE concat(:base, '%')")
    List<String> findSlugsStartingWith(@Param("ownerId") UUID ownerId, @Param("base") String base);

    @Query("SELECT c FROM Course c JOIN FETCH c.owner o JOIN FETCH c.area WHERE o.id = :ownerId ORDER BY c.createdAt DESC")
    List<Course> findAllByOwnerId(@Param("ownerId") UUID ownerId);

    /**
     * Catalogue listing. Native SQL because {@code categories} is a real Postgres {@code text[]},
     * which JPQL cannot search. Every filter is optional; passing null disables it.
     *
     * <p>Drafts are only ever visible to their owner, which is what the {@code viewerId} clause
     * enforces.
     *
     * <p>{@code categories} arrives as a single {@code chr(1)}-delimited string rather than a bound
     * {@code text[]}: JDBC array binding through a native Spring Data query is fiddly, and no real
     * category contains a control character. The overlap operator ({@code &&}) makes the filter an
     * OR across the selected categories.
     */
    @Query(value = """
            SELECT c.* FROM courses c
            JOIN users u ON u.id = c.owner_id
            WHERE (CAST(:q AS text) IS NULL
                   OR c.name ILIKE '%' || CAST(:q AS text) || '%'
                   OR c.description ILIKE '%' || CAST(:q AS text) || '%'
                   OR u.nickname ILIKE '%' || CAST(:q AS text) || '%'
                   OR u.name ILIKE '%' || CAST(:q AS text) || '%'
                   OR EXISTS (SELECT 1 FROM unnest(c.categories) cat
                              WHERE cat ILIKE '%' || CAST(:q AS text) || '%'))
              AND (CAST(:author AS text) IS NULL OR lower(u.nickname) = lower(CAST(:author AS text)))
              AND (CAST(:visibility AS text) IS NULL OR c.visibility = CAST(:visibility AS text))
              AND (CAST(:categories AS text) IS NULL
                   OR c.categories && string_to_array(CAST(:categories AS text), chr(1)))
              AND (CAST(:featuredOnly AS boolean) IS NOT TRUE OR c.is_featured)
              AND (CAST(:areaId AS uuid) IS NULL OR c.area_id = CAST(:areaId AS uuid))
              AND (c.status = 'available' OR c.owner_id = CAST(:viewerId AS uuid))
            ORDER BY
              CASE WHEN CAST(:sort AS text) = 'likes'
                   THEN (SELECT count(*) FROM course_likes cl WHERE cl.course_id = c.id)
                   ELSE 0 END DESC,
              CASE WHEN CAST(:sort AS text) = 'name' THEN c.name ELSE '' END ASC,
              c.created_at DESC
            """,
            countQuery = """
            SELECT count(*) FROM courses c
            JOIN users u ON u.id = c.owner_id
            WHERE (CAST(:q AS text) IS NULL
                   OR c.name ILIKE '%' || CAST(:q AS text) || '%'
                   OR c.description ILIKE '%' || CAST(:q AS text) || '%'
                   OR u.nickname ILIKE '%' || CAST(:q AS text) || '%'
                   OR u.name ILIKE '%' || CAST(:q AS text) || '%'
                   OR EXISTS (SELECT 1 FROM unnest(c.categories) cat
                              WHERE cat ILIKE '%' || CAST(:q AS text) || '%'))
              AND (CAST(:author AS text) IS NULL OR lower(u.nickname) = lower(CAST(:author AS text)))
              AND (CAST(:visibility AS text) IS NULL OR c.visibility = CAST(:visibility AS text))
              AND (CAST(:categories AS text) IS NULL
                   OR c.categories && string_to_array(CAST(:categories AS text), chr(1)))
              AND (CAST(:featuredOnly AS boolean) IS NOT TRUE OR c.is_featured)
              AND (CAST(:areaId AS uuid) IS NULL OR c.area_id = CAST(:areaId AS uuid))
              AND (c.status = 'available' OR c.owner_id = CAST(:viewerId AS uuid))
            """,
            nativeQuery = true)
    Page<Course> search(@Param("q") String q,
                        @Param("author") String author,
                        @Param("visibility") String visibility,
                        @Param("categories") String categories,
                        @Param("featuredOnly") Boolean featuredOnly,
                        @Param("areaId") UUID areaId,
                        @Param("sort") String sort,
                        @Param("viewerId") UUID viewerId,
                        Pageable pageable);
}
