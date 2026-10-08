package com.coursemaker.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

class ClientIpResolverTest {

    private MockHttpServletRequest request(String header, String value) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("172.70.1.1");
        if (header != null) {
            request.addHeader(header, value);
        }
        return request;
    }

    @Test
    void usesTheSocketAddressWhenNoHeaderIsConfigured() {
        // Default: a client-supplied header must never be believed.
        assertThat(new ClientIpResolver("").resolve(request("CF-Connecting-IP", "9.9.9.9")))
                .isEqualTo("172.70.1.1");
    }

    @Test
    void usesTheConfiguredHeader() {
        assertThat(new ClientIpResolver("CF-Connecting-IP").resolve(request("CF-Connecting-IP", "179.113.196.153")))
                .isEqualTo("179.113.196.153");
    }

    @Test
    void takesTheFirstEntryOfAList() {
        assertThat(new ClientIpResolver("X-Forwarded-For").resolve(request("X-Forwarded-For", "1.2.3.4, 172.70.1.1")))
                .isEqualTo("1.2.3.4");
    }

    @Test
    void fallsBackWhenTheHeaderIsMissingOrGarbage() {
        ClientIpResolver resolver = new ClientIpResolver("CF-Connecting-IP");
        assertThat(resolver.resolve(request(null, null))).isEqualTo("172.70.1.1");
        assertThat(resolver.resolve(request("CF-Connecting-IP", "<script>"))).isEqualTo("172.70.1.1");
    }

    @Test
    void supportsIpv6() {
        assertThat(new ClientIpResolver("CF-Connecting-IP").resolve(request("CF-Connecting-IP", "2804:14d:5c8:1::1")))
                .isEqualTo("2804:14d:5c8:1::1");
    }
}
