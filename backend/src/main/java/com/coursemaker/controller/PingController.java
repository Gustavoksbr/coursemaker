package com.coursemaker.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;

/**
 * Unauthenticated liveness check. Hitting this periodically (e.g. from an uptime monitor) keeps
 * the API from idling on free-tier hosting (Render) and keeps the Supabase database from being
 * paused for inactivity - the point isn't just "the process is up", so it also opens a real
 * connection to the database rather than answering from memory.
 */
@Tag(name = "Ping")
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class PingController {

    private static final int DB_CHECK_TIMEOUT_SECONDS = 3;

    private final DataSource dataSource;

    @Operation(summary = "Verifica se a API e o banco de dados estao no ar")
    @GetMapping("/ping")
    public ResponseEntity<String> ping() {
        try (Connection connection = dataSource.getConnection()) {
            if (connection.isValid(DB_CHECK_TIMEOUT_SECONDS)) {
                return ResponseEntity.ok("pong");
            }
        } catch (SQLException e) {
            // falls through to the 503 below
        }
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body("database unavailable");
    }
}
