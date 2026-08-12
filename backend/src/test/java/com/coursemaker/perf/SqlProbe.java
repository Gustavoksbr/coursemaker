package com.coursemaker.perf;

import org.hibernate.resource.jdbc.spi.StatementInspector;

import javax.sql.DataSource;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Test-only instrumentation used by {@link PerfBaselineProfiler}.
 *
 * <p>Two independent probes:
 * <ul>
 *   <li>a Hibernate {@link StatementInspector}, which sees every SQL string Hibernate is about to
 *       run (JPQL-derived, criteria and native alike) - this is the query <em>count</em> and the
 *       query <em>text</em>;</li>
 *   <li>a {@link DataSource} proxy that times every {@code execute*} call on the JDBC layer - this
 *       is the time actually spent talking to the database, as opposed to time spent in Spring,
 *       Hibernate and the mapping code.</li>
 * </ul>
 *
 * <p>Nothing here is wired into the application: it is installed only by the profiler's
 * {@code @TestConfiguration}.
 */
public final class SqlProbe {

    public static final List<String> STATEMENTS = Collections.synchronizedList(new ArrayList<>());
    private static final AtomicLong DB_NANOS = new AtomicLong();
    private static volatile boolean recording;

    private SqlProbe() {
    }

    public static void start() {
        STATEMENTS.clear();
        DB_NANOS.set(0);
        recording = true;
    }

    public static void stop() {
        recording = false;
    }

    public static List<String> statements() {
        synchronized (STATEMENTS) {
            return List.copyOf(STATEMENTS);
        }
    }

    public static long dbNanos() {
        return DB_NANOS.get();
    }

    /** Registered through {@code hibernate.session_factory.statement_inspector}. */
    public static final class Inspector implements StatementInspector {
        @Override
        public String inspect(String sql) {
            if (recording) {
                STATEMENTS.add(sql);
            }
            return sql;
        }
    }

    // ------------------------------------------------------------------ JDBC timing

    public static DataSource timing(DataSource delegate) {
        return (DataSource) Proxy.newProxyInstance(
                SqlProbe.class.getClassLoader(),
                new Class<?>[] { DataSource.class },
                new Delegating(delegate, result -> result instanceof Connection connection
                        ? proxyConnection(connection)
                        : result));
    }

    private static Connection proxyConnection(Connection connection) {
        return (Connection) Proxy.newProxyInstance(
                SqlProbe.class.getClassLoader(),
                new Class<?>[] { Connection.class },
                new Delegating(connection, result -> result instanceof Statement statement
                        ? proxyStatement(statement)
                        : result));
    }

    private static Statement proxyStatement(Statement statement) {
        Class<?>[] interfaces = statement instanceof PreparedStatement
                ? new Class<?>[] { PreparedStatement.class }
                : new Class<?>[] { Statement.class };
        return (Statement) Proxy.newProxyInstance(
                SqlProbe.class.getClassLoader(), interfaces, (proxy, method, args) -> {
                    boolean timed = recording && method.getName().startsWith("execute");
                    long startedAt = timed ? System.nanoTime() : 0L;
                    try {
                        return method.invoke(statement, args);
                    } catch (InvocationTargetException e) {
                        throw e.getCause();
                    } finally {
                        if (timed) {
                            DB_NANOS.addAndGet(System.nanoTime() - startedAt);
                        }
                    }
                });
    }

    /** Delegates every call, handing the return value to {@code mapper} so it can be proxied too. */
    private record Delegating(Object delegate, java.util.function.UnaryOperator<Object> mapper)
            implements InvocationHandler {
        @Override
        public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
            try {
                return mapper.apply(method.invoke(delegate, args));
            } catch (InvocationTargetException e) {
                throw e.getCause();
            }
        }
    }
}
