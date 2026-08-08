package com.coursemaker.support;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;

import java.io.IOException;
import java.io.UncheckedIOException;

/**
 * Boots a single real PostgreSQL 16 server for the whole test JVM.
 *
 * <p>We deliberately use a real Postgres rather than an in-memory database: the schema relies on
 * {@code text[]} columns, GIN indexes, partial indexes and {@code ON DELETE CASCADE}, none of which
 * behave the same way under H2. Zonky ships the actual Postgres binaries, so this needs no Docker
 * daemon and no locally installed server.
 */
public final class TestPostgres {

    private static final int PG_VERSION_TIMEOUT_SECONDS = 120;

    private static volatile EmbeddedPostgres instance;

    private TestPostgres() {
    }

    public static EmbeddedPostgres get() {
        EmbeddedPostgres local = instance;
        if (local == null) {
            synchronized (TestPostgres.class) {
                local = instance;
                if (local == null) {
                    local = start();
                    instance = local;
                }
            }
        }
        return local;
    }

    public static String jdbcUrl() {
        return "jdbc:postgresql://localhost:" + get().getPort() + "/postgres";
    }

    public static String username() {
        return "postgres";
    }

    public static String password() {
        return "postgres";
    }

    private static EmbeddedPostgres start() {
        try {
            EmbeddedPostgres postgres = EmbeddedPostgres.builder()
                    .setPGStartupWait(java.time.Duration.ofSeconds(PG_VERSION_TIMEOUT_SECONDS))
                    .start();
            Runtime.getRuntime().addShutdownHook(new Thread(() -> close(postgres)));
            return postgres;
        } catch (IOException e) {
            throw new UncheckedIOException("Could not start the embedded PostgreSQL instance", e);
        }
    }

    private static void close(EmbeddedPostgres postgres) {
        try {
            postgres.close();
        } catch (IOException ignored) {
            // Nothing useful to do while the JVM is shutting down.
        }
    }
}
