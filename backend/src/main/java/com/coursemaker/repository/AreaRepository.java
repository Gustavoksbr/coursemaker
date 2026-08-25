package com.coursemaker.repository;

import com.coursemaker.domain.entity.Area;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AreaRepository extends JpaRepository<Area, UUID> {

    List<Area> findAllByOrderByNameAsc();

    boolean existsBySlug(String slug);

    boolean existsByName(String name);
}
