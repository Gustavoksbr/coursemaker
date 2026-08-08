package com.coursemaker.service;

import com.coursemaker.dto.upload.UploadDtos.CloudinarySignatureResponse;
import com.coursemaker.exception.ApiExceptions.BadRequestException;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Plain unit test: pure signing algorithm, no Spring context needed. */
class CloudinarySignatureServiceTest {

    @Test
    void isDisabledWithoutCredentials() {
        CloudinarySignatureService service = new CloudinarySignatureService("", "", "", "coursemaker");

        assertThat(service.isEnabled()).isFalse();
        assertThatThrownBy(service::sign).isInstanceOf(BadRequestException.class);
    }

    @Test
    void isDisabledWhenOnlyPartiallyConfigured() {
        // A cloud name with no secret is not enough to sign anything safely.
        CloudinarySignatureService service =
                new CloudinarySignatureService("demo-cloud", "123456", "", "coursemaker");

        assertThat(service.isEnabled()).isFalse();
    }

    @Test
    void signsWithTheConfiguredCloudNameApiKeyAndFolder() {
        CloudinarySignatureService service =
                new CloudinarySignatureService("demo-cloud", "123456", "s3cr3t", "coursemaker-test");

        CloudinarySignatureResponse signed = service.sign();

        assertThat(signed.cloudName()).isEqualTo("demo-cloud");
        assertThat(signed.apiKey()).isEqualTo("123456");
        assertThat(signed.folder()).isEqualTo("coursemaker-test");
        assertThat(signed.signature()).matches("[0-9a-f]{40}"); // SHA-1 hex digest
    }

    @Test
    void signatureMatchesCloudinarysOwnAlgorithm() throws Exception {
        CloudinarySignatureService service =
                new CloudinarySignatureService("demo-cloud", "123456", "s3cr3t", "coursemaker-test");

        CloudinarySignatureResponse signed = service.sign();

        // Cloudinary's rule: sort the signed params alphabetically as key=value joined by '&',
        // append the raw secret, then SHA-1. Only folder and timestamp are signed here.
        String expected = sha1Hex("folder=coursemaker-test&timestamp=" + signed.timestamp() + "s3cr3t");
        assertThat(signed.signature()).isEqualTo(expected);
    }

    private static String sha1Hex(String input) throws Exception {
        byte[] hash = MessageDigest.getInstance("SHA-1").digest(input.getBytes(StandardCharsets.UTF_8));
        StringBuilder hex = new StringBuilder(hash.length * 2);
        for (byte b : hash) {
            hex.append(String.format("%02x", b));
        }
        return hex.toString();
    }
}
