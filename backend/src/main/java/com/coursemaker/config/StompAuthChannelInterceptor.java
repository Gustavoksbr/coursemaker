package com.coursemaker.config;

import com.coursemaker.domain.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Authenticates the STOMP CONNECT frame. A browser cannot attach a custom {@code Authorization}
 * header to the WebSocket/SockJS HTTP handshake, so {@link JwtAuthenticationFilter} (which only
 * sees that handshake request) can't do this job - the frontend instead sends the token as a native
 * STOMP header on CONNECT, which is authenticated here before the session is allowed to subscribe to
 * anything.
 */
@Component
@RequiredArgsConstructor
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String header = accessor.getFirstNativeHeader("Authorization");
            String token = header != null && header.startsWith(BEARER_PREFIX)
                    ? header.substring(BEARER_PREFIX.length()).trim()
                    : header;

            User user = Optional.ofNullable(token)
                    .flatMap(jwtService::extractPrincipal)
                    .orElseThrow(() -> new MessagingException("Token invalido ou ausente"));

            accessor.setUser(new StompPrincipal(user.getId().toString()));
        }
        return message;
    }
}
