package com.coursemaker.repository;

import com.coursemaker.domain.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmailIgnoreCase(String email);

    Optional<User> findByNicknameIgnoreCase(String nickname);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByNicknameIgnoreCase(String nickname);

    /**
     * People search, for the "Pessoas" tab and the unified preview. Only users who have set a
     * nickname are findable - without one there is no public profile URL to link to. A deleted
     * account is excluded too: its public profile still resolves directly by nickname (see
     * {@link com.coursemaker.service.UserService}), but it has no business surfacing in a search
     * result someone else is browsing.
     *
     * <p>Native SQL, like {@link CourseRepository#search}: a bare JPQL {@code :q IS NULL} with no
     * other type context makes the PostgreSQL JDBC driver infer the parameter as {@code bytea},
     * which then fails the later {@code ILIKE} comparisons against a {@code varchar} column
     * ({@code operador não existe: character varying ~~* bytea}) - the explicit {@code CAST}s here
     * pin every occurrence of the parameter to {@code text} so Postgres never has to guess.
     */
    @Query(value = """
            SELECT * FROM users
            WHERE nickname IS NOT NULL
              AND deleted_at IS NULL
              AND (CAST(:q AS text) IS NULL
                   OR name ILIKE '%' || CAST(:q AS text) || '%'
                   OR nickname ILIKE '%' || CAST(:q AS text) || '%')
            ORDER BY
              CASE WHEN CAST(:sort AS text) = 'name' THEN name ELSE '' END ASC,
              created_at DESC
            """,
            countQuery = """
            SELECT count(*) FROM users
            WHERE nickname IS NOT NULL
              AND deleted_at IS NULL
              AND (CAST(:q AS text) IS NULL
                   OR name ILIKE '%' || CAST(:q AS text) || '%'
                   OR nickname ILIKE '%' || CAST(:q AS text) || '%')
            """,
            nativeQuery = true)
    Page<User> search(@Param("q") String q, @Param("sort") String sort, Pageable pageable);
}
