package com.coursemaker.dto.upload;

public final class UploadDtos {

    private UploadDtos() {
    }

    /**
     * Everything the frontend needs to upload an image straight to Cloudinary without ever seeing
     * the API secret: a signature computed server-side over the exact parameters being sent.
     */
    public record CloudinarySignatureResponse(
            String cloudName, String apiKey, long timestamp, String folder, String signature) {
    }

    public record CloudinaryStatusResponse(boolean enabled) {
    }
}
