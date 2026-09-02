package com.coursemaker.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

/**
 * The editable copy on the landing page. A singleton: the row always exists (seeded by the
 * migration) and its id is always {@code TRUE}, which the schema enforces with a CHECK - so there
 * is no "create" path, only read and update.
 */
@Entity
@Table(name = "site_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SiteSettings {

    /** Always TRUE - see the CHECK constraint in V20. */
    @Id
    private Boolean id;

    @Column(name = "hero_title", length = 200)
    private String heroTitle;

    /** Rendered in the accent colour inside the hero title. */
    @Column(name = "hero_highlight", length = 80)
    private String heroHighlight;

    @Column(name = "hero_subtitle", length = 400)
    private String heroSubtitle;

    @Column(name = "hero_cta_label", length = 60)
    private String heroCtaLabel;

    @Column(name = "hero_cta_href", length = 2000)
    private String heroCtaHref;

    /** Optional bar above the hero; blank hides it entirely. */
    @Column(length = 300)
    private String announcement;

    @Column(name = "announcement_href", length = 2000)
    private String announcementHref;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
