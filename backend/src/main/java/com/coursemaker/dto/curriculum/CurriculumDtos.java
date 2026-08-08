package com.coursemaker.dto.curriculum;

import com.coursemaker.domain.entity.Lesson;
import com.coursemaker.domain.entity.LessonBlock;
import com.coursemaker.domain.entity.Module;
import com.coursemaker.domain.entity.PostBlock;
import com.coursemaker.domain.enums.BlockType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

/** Requests and responses for modules, lessons and content blocks (both lesson and post). */
public final class CurriculumDtos {

    private CurriculumDtos() {
    }

    // ----------------------------------------------------------------- modules

    public record ModuleResponse(
            UUID id,
            UUID courseId,
            String title,
            String description,
            int order,
            List<LessonResponse> lessons) {

        public static ModuleResponse of(Module module, List<LessonResponse> lessons) {
            return new ModuleResponse(
                    module.getId(),
                    module.getCourse().getId(),
                    module.getTitle(),
                    module.getDescription(),
                    module.getOrderIndex(),
                    lessons);
        }
    }

    public record CreateModuleRequest(
            @NotBlank @Size(max = 255) String title,
            @Size(max = 5000) String description) {
    }

    public record UpdateModuleRequest(
            @Size(min = 1, max = 255) String title,
            @Size(max = 5000) String description) {
    }

    // ----------------------------------------------------------------- lessons

    public record LessonResponse(
            UUID id,
            UUID moduleId,
            String title,
            int order,
            boolean completed) {

        public static LessonResponse of(Lesson lesson, boolean completed) {
            return new LessonResponse(
                    lesson.getId(),
                    lesson.getModule().getId(),
                    lesson.getTitle(),
                    lesson.getOrderIndex(),
                    completed);
        }
    }

    public record CreateLessonRequest(@NotBlank @Size(max = 255) String title) {
    }

    public record UpdateLessonRequest(@Size(min = 1, max = 255) String title) {
    }

    // ------------------------------------------------------------------ blocks

    public record BlockResponse(
            UUID id,
            UUID parentId,
            BlockType type,
            String content,
            String language,
            int order) {

        public static BlockResponse of(LessonBlock block) {
            return new BlockResponse(
                    block.getId(),
                    block.getLesson().getId(),
                    block.getType(),
                    block.getContent(),
                    block.getLanguage(),
                    block.getOrderIndex());
        }

        public static BlockResponse of(PostBlock block) {
            return new BlockResponse(
                    block.getId(),
                    block.getPost().getId(),
                    block.getType(),
                    block.getContent(),
                    block.getLanguage(),
                    block.getOrderIndex());
        }
    }

    // Content columns are unbounded TEXT in the database; this is a policy cap against abuse, not
    // a storage constraint. Generous enough for a long article or a sizeable source file.
    private static final int MAX_BLOCK_CONTENT_LENGTH = 100_000;

    public record CreateBlockRequest(
            @NotNull BlockType type,
            @Size(max = MAX_BLOCK_CONTENT_LENGTH) String content,
            @Size(max = 50) String language) {
    }

    public record UpdateBlockRequest(
            BlockType type,
            @Size(max = MAX_BLOCK_CONTENT_LENGTH) String content,
            @Size(max = 50) String language) {
    }

    /** Body of every {@code PUT .../reorder} endpoint: the ids in their new order. */
    public record ReorderRequest(@NotEmpty List<UUID> ids) {
    }
}
