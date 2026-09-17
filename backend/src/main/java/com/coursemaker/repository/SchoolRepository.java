package com.coursemaker.repository;

import com.coursemaker.domain.entity.School;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SchoolRepository extends JpaRepository<School, UUID> {

    List<School> findAllByOrderByNameAsc();

    Optional<School> findBySlug(String slug);

    boolean existsBySlug(String slug);

    boolean existsByName(String name);

    /** Every school currently chosen for the home page, in whatever order they were saved. */
    List<School> findAllByFeaturedOnHomeTrue();

    /** The home page's curated schools section. */
    List<School> findAllByFeaturedOnHomeTrueOrderByHomeOrderAsc();
}
