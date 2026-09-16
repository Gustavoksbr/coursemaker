package com.coursemaker.repository;

import com.coursemaker.domain.entity.Trilha;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TrilhaRepository extends JpaRepository<Trilha, UUID> {

    @Query("SELECT t FROM Trilha t JOIN FETCH t.owner JOIN FETCH t.area WHERE t.id = :id")
    Optional<Trilha> findByIdWithOwner(@Param("id") UUID id);

    @Query("SELECT t FROM Trilha t JOIN FETCH t.owner o JOIN FETCH t.area "
            + "WHERE lower(o.nickname) = lower(:nickname) AND t.slug = :slug")
    Optional<Trilha> findByOwnerNicknameAndSlug(@Param("nickname") String nickname, @Param("slug") String slug);

    boolean existsByOwnerIdAndSlug(UUID ownerId, String slug);

    boolean existsByAreaId(UUID areaId);

    boolean existsBySchoolId(UUID schoolId);

    @Query(value = "SELECT count(*) FROM trilhas WHERE status = 'available'", nativeQuery = true)
    long countPublished();

    @Query("SELECT t.slug FROM Trilha t WHERE t.owner.id = :ownerId AND t.slug LIKE concat(:base, '%')")
    List<String> findSlugsStartingWith(@Param("ownerId") UUID ownerId, @Param("base") String base);

    @Query("SELECT t FROM Trilha t JOIN FETCH t.owner o JOIN FETCH t.area WHERE o.id = :ownerId ORDER BY t.createdAt DESC")
    List<Trilha> findAllByOwnerId(@Param("ownerId") UUID ownerId);

    /** Admin moderation list. */
    @Query("SELECT t FROM Trilha t JOIN FETCH t.owner JOIN FETCH t.area WHERE t.blockedByAdmin = true "
            + "ORDER BY t.updatedAt DESC")
    List<Trilha> findAllBlocked();

    /** Every trilha that contains this course, most recently added first -- backs "ver mais". */
    @Query("""
            SELECT t FROM Trilha t JOIN FETCH t.owner
            WHERE t.id IN (SELECT ti.trilha.id FROM TrilhaItem ti WHERE ti.course.id = :courseId)
              AND (t.status = 'available' OR t.owner.id = :viewerId)
            ORDER BY t.createdAt DESC
            """)
    Page<Trilha> findContainingCourse(@Param("courseId") UUID courseId, @Param("viewerId") UUID viewerId,
                                      Pageable pageable);

    @Query("""
            SELECT t FROM Trilha t JOIN FETCH t.owner
            WHERE t.id IN (SELECT ti.trilha.id FROM TrilhaItem ti WHERE ti.post.id = :postId)
              AND (t.status = 'available' OR t.owner.id = :viewerId)
            ORDER BY t.createdAt DESC
            """)
    Page<Trilha> findContainingPost(@Param("postId") UUID postId, @Param("viewerId") UUID viewerId,
                                    Pageable pageable);

    /** Mirrors {@code CourseRepository#search}; see the notes there. No likes -- trilhas have none. */
    @Query(value = """
            SELECT t.* FROM trilhas t
            JOIN users u ON u.id = t.owner_id
            WHERE (CAST(:q AS text) IS NULL
                   OR t.title ILIKE '%' || CAST(:q AS text) || '%'
                   OR t.description ILIKE '%' || CAST(:q AS text) || '%'
                   OR u.nickname ILIKE '%' || CAST(:q AS text) || '%'
                   OR u.name ILIKE '%' || CAST(:q AS text) || '%'
                   OR EXISTS (SELECT 1 FROM unnest(t.categories) cat
                              WHERE cat ILIKE '%' || CAST(:q AS text) || '%'))
              AND (CAST(:author AS text) IS NULL OR lower(u.nickname) = lower(CAST(:author AS text)))
              AND (CAST(:visibility AS text) IS NULL OR t.visibility = CAST(:visibility AS text))
              AND (CAST(:categories AS text) IS NULL
                   OR t.categories && string_to_array(CAST(:categories AS text), chr(1)))
              AND (CAST(:featuredOnly AS boolean) IS NOT TRUE OR t.is_featured)
              AND (CAST(:areaIds AS text) IS NULL
                   OR t.area_id::text = ANY(string_to_array(CAST(:areaIds AS text), chr(1))))
              AND (CAST(:schoolId AS uuid) IS NULL OR t.school_id = CAST(:schoolId AS uuid))
              AND (t.status = 'available' OR t.owner_id = CAST(:viewerId AS uuid))
            ORDER BY
              CASE WHEN CAST(:sort AS text) = 'name' THEN t.title ELSE '' END ASC,
              t.created_at DESC
            """,
            countQuery = """
            SELECT count(*) FROM trilhas t
            JOIN users u ON u.id = t.owner_id
            WHERE (CAST(:q AS text) IS NULL
                   OR t.title ILIKE '%' || CAST(:q AS text) || '%'
                   OR t.description ILIKE '%' || CAST(:q AS text) || '%'
                   OR u.nickname ILIKE '%' || CAST(:q AS text) || '%'
                   OR u.name ILIKE '%' || CAST(:q AS text) || '%'
                   OR EXISTS (SELECT 1 FROM unnest(t.categories) cat
                              WHERE cat ILIKE '%' || CAST(:q AS text) || '%'))
              AND (CAST(:author AS text) IS NULL OR lower(u.nickname) = lower(CAST(:author AS text)))
              AND (CAST(:visibility AS text) IS NULL OR t.visibility = CAST(:visibility AS text))
              AND (CAST(:categories AS text) IS NULL
                   OR t.categories && string_to_array(CAST(:categories AS text), chr(1)))
              AND (CAST(:featuredOnly AS boolean) IS NOT TRUE OR t.is_featured)
              AND (CAST(:areaIds AS text) IS NULL
                   OR t.area_id::text = ANY(string_to_array(CAST(:areaIds AS text), chr(1))))
              AND (CAST(:schoolId AS uuid) IS NULL OR t.school_id = CAST(:schoolId AS uuid))
              AND (t.status = 'available' OR t.owner_id = CAST(:viewerId AS uuid))
            """,
            nativeQuery = true)
    Page<Trilha> search(@Param("q") String q,
                        @Param("author") String author,
                        @Param("visibility") String visibility,
                        @Param("categories") String categories,
                        @Param("featuredOnly") Boolean featuredOnly,
                        @Param("areaIds") String areaIds,
                        @Param("schoolId") UUID schoolId,
                        @Param("sort") String sort,
                        @Param("viewerId") UUID viewerId,
                        Pageable pageable);
}
