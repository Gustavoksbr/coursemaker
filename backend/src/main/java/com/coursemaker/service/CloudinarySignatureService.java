package com.coursemaker.service;

import com.coursemaker.dto.upload.UploadDtos.CloudinarySignatureResponse;
import com.coursemaker.exception.ApiExceptions.BadRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;

/**
 * Signs direct-to-Cloudinary uploads so the frontend never sees the API secret.
 *
 * <p>The frontend asks this service for a signature, then uploads the file straight to Cloudinary
 * with that signature attached - the file itself never touches our backend. Cloudinary's signing
 * rule: take every parameter that will be sent besides {@code file}, {@code cloud_name},
 * {@code resource_type} and {@code api_key}, sort them alphabetically as {@code key=value} pairs
 * joined by {@code &}, append the api secret with no separator, then SHA-1 the result.
 *
 * <p>Uploads are always image uploads ({@code /image/upload}) - video blocks stay YouTube links,
 * both because they are heavy and because this service never signs a {@code resource_type}
 * override that would allow one.
 */
@Service
public class CloudinarySignatureService {

    private final String cloudName;
    private final String apiKey;
    private final String apiSecret;
    private final String uploadFolder;

    public CloudinarySignatureService(
            @Value("${cloudinary.cloud-name:}") String cloudName,
            @Value("${cloudinary.api-key:}") String apiKey,
            @Value("${cloudinary.api-secret:}") String apiSecret,
            @Value("${cloudinary.upload-folder:coursemaker}") String uploadFolder) {
        this.cloudName = cloudName.trim();
        this.apiKey = apiKey.trim();
        this.apiSecret = apiSecret.trim();
        this.uploadFolder = uploadFolder.trim();
    }

    public boolean isEnabled() {
        return !cloudName.isEmpty() && !apiKey.isEmpty() && !apiSecret.isEmpty();
    }

    public CloudinarySignatureResponse sign() {
        if (!isEnabled()) {
            throw new BadRequestException("Upload de imagens nao esta configurado neste servidor");
        }

        long timestamp = Instant.now().getEpochSecond();
        String paramsToSign = "folder=" + uploadFolder + "&timestamp=" + timestamp;
        String signature = sha1Hex(paramsToSign + apiSecret);

        return new CloudinarySignatureResponse(cloudName, apiKey, timestamp, uploadFolder, signature);
    }

    private static String sha1Hex(String input) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-1").digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            // SHA-1 is a JDK-mandated algorithm (JCA standard names); this cannot happen.
            throw new IllegalStateException(e);
        }
    }
}
