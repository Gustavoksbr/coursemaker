package com.coursemaker.config;

import com.coursemaker.domain.entity.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

/**
 * The principal placed in the SecurityContext by {@link JwtAuthenticationFilter}. It wraps the live
 * {@link User} row (not just the token claims) so authorization checks always see the current role
 * and nickname, even if they changed after the token was issued.
 */
public record AuthenticatedUser(User user) implements UserDetails {

    public UUID id() {
        return user.getId();
    }

    /**
     * Unwraps an {@code @AuthenticationPrincipal} that may be absent. Public endpoints receive null
     * for anonymous callers, and the service layer treats a null viewer as "not logged in".
     */
    public static User userOrNull(AuthenticatedUser principal) {
        return principal == null ? null : principal.user();
    }

    public boolean isAdmin() {
        return user.isAdmin();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority(user.getRole().authority()));
    }

    @Override
    public String getPassword() {
        return user.getPasswordHash();
    }

    @Override
    public String getUsername() {
        return user.getEmail();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
