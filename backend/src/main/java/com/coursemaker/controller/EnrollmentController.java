package com.coursemaker.controller;

import com.coursemaker.config.AuthenticatedUser;
import com.coursemaker.dto.course.CourseDtos.CourseSummary;
import com.coursemaker.dto.course.CourseDtos.StudentResponse;
import com.coursemaker.dto.enrollment.EnrollmentDtos.EnrollRequest;
import com.coursemaker.dto.enrollment.EnrollmentDtos.EnrollmentStatusResponse;
import com.coursemaker.dto.enrollment.EnrollmentDtos.PrivateAccessResponse;
import com.coursemaker.dto.enrollment.EnrollmentDtos.ValidatePrivateAccessRequest;
import com.coursemaker.service.EnrollmentService;
import com.coursemaker.service.PrivateCourseAccessService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@Tag(name = "Matriculas e acesso privado")
@RestController
@RequiredArgsConstructor
public class EnrollmentController {

    private final EnrollmentService enrollmentService;
    private final PrivateCourseAccessService privateAccessService;

    @Operation(summary = "Matricula o usuario autenticado. Cursos privados aceitam a senha no corpo")
    @PostMapping("/api/v1/enrollments")
    public EnrollmentStatusResponse enroll(@Valid @RequestBody EnrollRequest request,
                                           @AuthenticationPrincipal AuthenticatedUser principal) {
        return enrollmentService.enroll(request.courseId(), request.password(), principal.user());
    }

    @Operation(summary = "Cancela a matricula")
    @DeleteMapping("/api/v1/enrollments/{courseId}")
    public EnrollmentStatusResponse unenroll(@PathVariable UUID courseId,
                                             @AuthenticationPrincipal AuthenticatedUser principal) {
        return enrollmentService.unenroll(courseId, principal.user());
    }

    @Operation(summary = "Cursos em que o usuario autenticado esta matriculado")
    @GetMapping("/api/v1/enrollments/me")
    public List<CourseSummary> myEnrollments(@AuthenticationPrincipal AuthenticatedUser principal) {
        return enrollmentService.myEnrollments(principal.user());
    }

    @Operation(summary = "Valida a senha de um curso privado e libera o conteudo")
    @PostMapping("/api/v1/enrollments/private-access/validate")
    public PrivateAccessResponse validatePrivateAccess(
            @Valid @RequestBody ValidatePrivateAccessRequest request,
            @AuthenticationPrincipal AuthenticatedUser principal) {
        return privateAccessService.validatePassword(request.courseId(), request.password(), principal.user());
    }

    @Operation(summary = "Lista os matriculados no curso (apenas o dono)")
    @GetMapping("/api/v1/courses/{courseId}/students")
    public List<StudentResponse> students(@PathVariable UUID courseId,
                                          @AuthenticationPrincipal AuthenticatedUser principal) {
        return enrollmentService.listStudents(courseId, principal.user());
    }

    @Operation(summary = "Revoga o acesso de um aluno ao curso privado (apenas o dono)")
    @PostMapping("/api/v1/courses/{courseId}/revoke-access/{userId}")
    public ResponseEntity<Void> revokeAccess(@PathVariable UUID courseId, @PathVariable UUID userId,
                                             @AuthenticationPrincipal AuthenticatedUser principal) {
        privateAccessService.revoke(courseId, userId, principal.user());
        return ResponseEntity.noContent().build();
    }
}
