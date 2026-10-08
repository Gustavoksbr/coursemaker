package com.coursemaker.config;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Works out the IP address the rate limiters should attribute a request to.
 *
 * <p>Behind a CDN (Render sits behind Cloudflare) the socket address and even the right-most
 * {@code X-Forwarded-For} entry are the CDN's edge, which changes from request to request and is
 * shared by many unrelated users - limits keyed on it are diluted for attackers and unfair to
 * everyone else. The real client address arrives in a header the CDN sets (Cloudflare:
 * {@code CF-Connecting-IP}). Only the headers listed in {@code app.client-ip.headers} are trusted,
 * and only because the CDN overwrites or rejects client-supplied copies of them; leave the list
 * empty (the default) when the app is exposed directly, and the socket address is used.
 */
@Component
public class ClientIpResolver {

    /** Hex digits, dots and colons: enough for IPv4/IPv6 and nothing that could smuggle other content. */
    private static final Pattern IP_LIKE = Pattern.compile("^[0-9a-fA-F:.]{2,45}$");

    private final List<String> headers;

    public ClientIpResolver(@Value("${app.client-ip.headers:}") String configuredHeaders) {
        this.headers = Arrays.stream(configuredHeaders.split(","))
                .map(String::trim)
                .filter(name -> !name.isEmpty())
                .toList();
    }

    public String resolve(HttpServletRequest request) {
        for (String name : headers) {
            String value = request.getHeader(name);
            if (value == null || value.isBlank()) {
                continue;
            }
            // A list ("client, proxy1, proxy2") puts the original client first.
            String first = value.split(",")[0].trim();
            if (IP_LIKE.matcher(first).matches()) {
                return first;
            }
        }
        return request.getRemoteAddr();
    }
}
