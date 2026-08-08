package com.coursemaker.controller;

import com.coursemaker.dto.upload.UploadDtos.CloudinarySignatureResponse;
import com.coursemaker.dto.upload.UploadDtos.CloudinaryStatusResponse;
import com.coursemaker.service.CloudinarySignatureService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Uploads")
@RestController
@RequestMapping("/api/v1/uploads")
@RequiredArgsConstructor
public class UploadController {

    private final CloudinarySignatureService cloudinarySignatureService;

    @Operation(summary = "Diz se o upload de imagens via Cloudinary esta disponivel neste servidor")
    @GetMapping("/cloudinary-status")
    public CloudinaryStatusResponse cloudinaryStatus() {
        return new CloudinaryStatusResponse(cloudinarySignatureService.isEnabled());
    }

    @Operation(summary = "Assina um upload de imagem direto para o Cloudinary (apenas imagens, sem video)")
    @PostMapping("/cloudinary-signature")
    public CloudinarySignatureResponse cloudinarySignature() {
        return cloudinarySignatureService.sign();
    }
}
