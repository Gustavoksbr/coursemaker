package com.coursemaker.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * The origin a piece of content was published under (e.g. "Alura") - pure provenance, never a
 * claim of official partnership. Admin-curated, like {@link Area}, but unlike area it is optional
 * on content and an owner may only pick a school they were granted membership of (see
 * {@code SchoolMember}).
 */
@Entity
@Table(name = "schools")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class School {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 80)
    private String name;

    /** Immutable once created: it drives the school's own public page ({@code /escolas/:slug}). */
    @Column(nullable = false, unique = true, length = 100)
    private String slug;

    @Column(columnDefinition = "text")
    private String description;

    @Column(name = "logo_url", length = 2000)
    private String logoUrl;

    @Column(name = "website_url", length = 2000)
    private String websiteUrl;

    /**
     * Admin-curated "show this on the landing page" flag, mirroring {@code Course/Post/Trilha
     * .featured}. If no school has it set, the home page falls back to showing every school
     * instead of an empty section - see {@code HomePage.jsx}.
     */
    @Column(name = "featured_on_home", nullable = false)
    private boolean featuredOnHome;

    /** Position among featured schools on the home page; null when not currently chosen. */
    @Column(name = "home_order")
    private Integer homeOrder;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
