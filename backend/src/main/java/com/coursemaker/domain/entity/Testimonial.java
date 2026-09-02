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

import java.time.Instant;
import java.util.UUID;

/**
 * A quote shown on the landing page. Admin-curated rather than derived from comments or reviews:
 * the useful ones come from outside the product (LinkedIn, email, word of mouth), so there is
 * nothing in the database to compute them from.
 */
@Entity
@Table(name = "testimonials")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Testimonial {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "author_name", nullable = false, length = 120)
    private String authorName;

    /** Free text, e.g. "Professora na Alura" or "Aluna desde 2025". */
    @Column(name = "author_role", length = 160)
    private String authorRole;

    @Column(name = "author_image", length = 2000)
    private String authorImage;

    @Column(nullable = false, columnDefinition = "text")
    private String quote;

    @Column(name = "order_index", nullable = false)
    @Builder.Default
    private int orderIndex = 0;

    /** Lets the admin stage a quote before it goes live. */
    @Column(nullable = false)
    @Builder.Default
    private boolean published = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
