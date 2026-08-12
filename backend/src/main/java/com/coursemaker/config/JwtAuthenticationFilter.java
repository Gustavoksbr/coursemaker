package com.coursemaker.config;

import com.coursemaker.domain.entity.User;
import com.coursemaker.exception.ApiErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;

/**
 * Turns {@code Authorization: Bearer <jwt>} into an authenticated SecurityContext.
 *
 * <p>Requests with no Authorization header pass straight through as anonymous, because most read
 * endpoints are public. A header that <em>is</em> present but does not verify is rejected with 401
 * right here, so the SPA learns immediately that its stored token is stale instead of silently
 * getting anonymous responses.
 *
 * <p>The principal is rebuilt from the token's signed claims alone - no database round trip on
 * every request. That trades "role/nickname changes apply immediately" for "apply next login /
 * token refresh" ({@code JWT_EXPIRY_HOURS}), which is fine since authorization only ever checks id
 * and role. Endpoints that need fresher or fuller profile data (bio, avatar, ...) fetch the row
 * themselves instead of trusting the principal for it.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header == null || !header.startsWith(BEARER_PREFIX)) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = header.substring(BEARER_PREFIX.length()).trim();
        Optional<User> user = jwtService.extractPrincipal(token);
        if (user.isEmpty()) {
            writeUnauthorized(request, response, "Token invalido ou expirado");
            return;
        }

        AuthenticatedUser principal = new AuthenticatedUser(user.get());
        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authentication);

        filterChain.doFilter(request, response);
    }

    private void writeUnauthorized(HttpServletRequest request, HttpServletResponse response, String message)
            throws IOException {
        SecurityContextHolder.clearContext();
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getWriter(), ApiErrorResponse.of(
                HttpStatus.UNAUTHORIZED.value(),
                HttpStatus.UNAUTHORIZED.getReasonPhrase(),
                message,
                request.getRequestURI()));
    }
}
