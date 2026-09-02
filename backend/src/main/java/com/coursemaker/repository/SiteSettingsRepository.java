package com.coursemaker.repository;

import com.coursemaker.domain.entity.SiteSettings;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SiteSettingsRepository extends JpaRepository<SiteSettings, Boolean> {
}
