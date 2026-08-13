package com.coursemaker.config;

import java.security.Principal;

/**
 * {@code SimpMessagingTemplate.convertAndSendToUser} routes by {@code Principal.getName()}.
 * {@link AuthenticatedUser} implements {@code UserDetails} (whose {@code getUsername()} returns the
 * user's email, for the HTTP security filter chain), not {@code Principal}, so the STOMP session gets
 * this tiny standalone adapter instead - keyed by user id, which is what {@code NotificationService}
 * sends to.
 */
public record StompPrincipal(String name) implements Principal {

    @Override
    public String getName() {
        return name;
    }
}
