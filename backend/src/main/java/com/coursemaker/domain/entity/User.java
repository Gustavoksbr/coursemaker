package com.coursemaker.domain.entity;

import com.coursemaker.domain.enums.UserRole;
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
import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "users")
// Course/Post lists hold a lazy proxy per owner; batching turns N selects into one.
@BatchSize(size = 50)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String email;

    /**
     * Unique public handle used in URLs. Null until the user completes the "setup nickname" step
     * right after registering; it can only be set once.
     */
    @Column
    private String nickname;

    @Column(nullable = false)
    private String name;

    /** BCrypt hash. Null for accounts created through Google sign-in. */
    @Column(name = "password_hash")
    private String passwordHash;

    @Column
    private String image;

    @Column(columnDefinition = "text")
    private String bio;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "stacks", columnDefinition = "text[]", nullable = false)
    @Builder.Default
    private List<String> stacks = new ArrayList<>();

    @Column(nullable = false)
    @Builder.Default
    private UserRole role = UserRole.USER;

    @Column(name = "email_verified")
    private Instant emailVerified;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /**
     * Set once, on account deletion, alongside scrubbing email/bio/image/stacks/password (see
     * {@code UserService.deleteAccount}). The nickname is deliberately left alone - it is the one
     * field content URLs depend on, and freeing it for reuse would let a stranger's new account
     * take over old links to this person's published courses/posts/trilhas.
     */
    @Column(name = "deleted_at")
    private Instant deletedAt;

    public boolean isAdmin() {
        return role == UserRole.ADMIN;
    }

    public boolean isDeleted() {
        return deletedAt != null;
    }
}
