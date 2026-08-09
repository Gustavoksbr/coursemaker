package com.coursemaker.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/** A named group of {@link TrilhaItem}s within a trilha (e.g. "1 - Explore as bases do Angular"). */
@Entity
@Table(name = "trilha_steps")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrilhaStep {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trilha_id", nullable = false)
    private Trilha trilha;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "text")
    private String description;

    @Column(name = "order_index", nullable = false)
    @Builder.Default
    private int orderIndex = 0;
}
