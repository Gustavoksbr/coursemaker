package com.coursemaker.service;

import com.coursemaker.exception.ApiExceptions.RateLimitExceededException;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory sliding-window limit per user: at most {@code max} calls in any {@code window}. Same
 * idea AiChatService uses for the assistant; kept per instance (not shared across servers), which
 * is enough to stop one account from hammering the code runner.
 */
public class SlidingWindowLimiter {

    private final int max;
    private final Duration window;
    private final String message;
    private final Map<UUID, Deque<Instant>> log = new ConcurrentHashMap<>();

    public SlidingWindowLimiter(int max, Duration window, String message) {
        this.max = max;
        this.window = window;
        this.message = message;
    }

    /** Records a call, or throws 429 when the user already used up the window. */
    public void check(UUID userId) {
        Instant now = Instant.now();
        Deque<Instant> timestamps = log.computeIfAbsent(userId, id -> new ArrayDeque<>());
        synchronized (timestamps) {
            while (!timestamps.isEmpty() && Duration.between(timestamps.peekFirst(), now).compareTo(window) > 0) {
                timestamps.pollFirst();
            }
            if (timestamps.size() >= max) {
                long retryAfter = window.minus(Duration.between(timestamps.peekFirst(), now)).toSeconds();
                throw new RateLimitExceededException(message, Math.max(1, retryAfter));
            }
            timestamps.addLast(now);
        }
    }
}
