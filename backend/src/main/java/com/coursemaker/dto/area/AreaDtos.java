package com.coursemaker.dto.area;

import com.coursemaker.domain.entity.Area;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public final class AreaDtos {

    private AreaDtos() {
    }

    private static final int MAX_NAME_LENGTH = 50;

    public record AreaSummary(UUID id, String name, String slug) {
        public static AreaSummary from(Area area) {
            return new AreaSummary(area.getId(), area.getName(), area.getSlug());
        }
    }

    public record CreateAreaRequest(@NotBlank @Size(max = MAX_NAME_LENGTH) String name) {
    }

    public record UpdateAreaRequest(@NotBlank @Size(max = MAX_NAME_LENGTH) String name) {
    }
}
