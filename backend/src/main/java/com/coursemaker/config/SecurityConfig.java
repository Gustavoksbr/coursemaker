package com.coursemaker.config;

import com.coursemaker.exception.ApiErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    /** Work factor 12, as required by the spec. */
    private static final int BCRYPT_STRENGTH = 12;

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final ObjectMapper objectMapper;

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(BCRYPT_STRENGTH);
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // Stateless REST API authenticated by a bearer token: there is no session cookie
                // for an attacker to ride, so CSRF protection buys nothing here.
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // --- Authentication ---
                        .requestMatchers("/api/v1/auth/register", "/api/v1/auth/login", "/api/v1/auth/google")
                        .permitAll()

                        // --- Docs ---
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()

                        // --- Reads that still need to know who is asking ---
                        .requestMatchers(HttpMethod.GET, "/api/v1/courses/slug-check").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/v1/posts/slug-check").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/v1/trilhas/slug-check").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/v1/courses/*/progress").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/v1/courses/*/students").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/v1/trilhas/*/progress").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/v1/enrollments/me").authenticated()

                        // --- Public reads (the service layer still hides drafts and private content) ---
                        .requestMatchers(HttpMethod.GET,
                                "/api/v1/courses/**",
                                "/api/v1/posts/**",
                                "/api/v1/post-blocks/**",
                                "/api/v1/modules/**",
                                "/api/v1/lessons/**",
                                "/api/v1/trilhas/**",
                                "/api/v1/users/**",
                                "/api/v1/search").permitAll()

                        .anyRequest().authenticated())
                .exceptionHandling(handling -> handling
                        .authenticationEntryPoint((request, response, ex) -> writeError(
                                response, request.getRequestURI(), HttpStatus.UNAUTHORIZED,
                                "Autenticacao necessaria"))
                        .accessDeniedHandler((request, response, ex) -> writeError(
                                response, request.getRequestURI(), HttpStatus.FORBIDDEN,
                                "Acesso negado")))
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .toList());
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(List.of("Retry-After"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    private void writeError(jakarta.servlet.http.HttpServletResponse response, String path,
                            HttpStatus status, String message) throws java.io.IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getWriter(),
                ApiErrorResponse.of(status.value(), status.getReasonPhrase(), message, path));
    }
}
