package com.coursemaker.dto.library;

import com.coursemaker.dto.course.CourseDtos.CourseSummary;
import com.coursemaker.dto.post.PostDtos.PostSummary;
import com.coursemaker.dto.trilha.TrilhaDtos.TrilhaSummary;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public final class LibraryDtos {

    private LibraryDtos() {
    }

    /** Exactly one of {@code course}/{@code post}/{@code trilha} is set. */
    public record LibraryItemResponse(
            UUID id,
            CourseSummary course,
            PostSummary post,
            TrilhaSummary trilha,
            UUID folderId,
            Instant createdAt) {
    }

    /** {@code folderId} is non-null whenever {@code saved} is true: every save lives in a folder. */
    public record LibraryStatusResponse(boolean saved, UUID folderId) {
    }

    /** {@code isDefault} marks "Favoritos", which cannot be renamed or deleted. */
    public record LibraryFolderResponse(UUID id, String name, long itemCount, boolean isDefault, Instant createdAt) {
    }

    public record CreateLibraryFolderRequest(@NotBlank @Size(max = 100) String name) {
    }

    public record UpdateLibraryFolderRequest(@NotBlank @Size(max = 100) String name) {
    }

    /** A null {@code folderId} means "wherever the default goes", i.e. the Favoritos folder. */
    public record MoveLibraryItemRequest(UUID folderId) {
    }
}
