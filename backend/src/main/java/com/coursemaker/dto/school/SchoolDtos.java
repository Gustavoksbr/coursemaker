package com.coursemaker.dto.school;

import com.coursemaker.domain.entity.School;
import com.coursemaker.dto.user.UserSummary;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public final class SchoolDtos {

    private SchoolDtos() {
    }

    private static final int MAX_NAME_LENGTH = 80;
    private static final int MAX_DESCRIPTION_LENGTH = 2000;
    private static final int MAX_URL_LENGTH = 2000;

    /** Badge/card payload. {@code null} on content that has no school - the badge just doesn't render. */
    public record SchoolSummary(UUID id, String name, String slug, String description, String logoUrl,
                                String websiteUrl, boolean featuredOnHome, Integer homeOrder) {
        public static SchoolSummary from(School school) {
            if (school == null) {
                return null;
            }
            return new SchoolSummary(school.getId(), school.getName(), school.getSlug(),
                    school.getDescription(), school.getLogoUrl(), school.getWebsiteUrl(), school.isFeaturedOnHome(),
                    school.getHomeOrder());
        }
    }

    public record CreateSchoolRequest(
            @NotBlank @Size(max = MAX_NAME_LENGTH) String name,
            @Size(max = MAX_DESCRIPTION_LENGTH) String description,
            @Size(max = MAX_URL_LENGTH) String logoUrl,
            @Size(max = MAX_URL_LENGTH) String websiteUrl) {
    }

    /** Full update: unlike Area, every field may change - the slug alone stays fixed. */
    public record UpdateSchoolRequest(
            @NotBlank @Size(max = MAX_NAME_LENGTH) String name,
            @Size(max = MAX_DESCRIPTION_LENGTH) String description,
            @Size(max = MAX_URL_LENGTH) String logoUrl,
            @Size(max = MAX_URL_LENGTH) String websiteUrl) {
    }

    /** One school plus who is currently allowed to publish under it - the admin management screen. */
    public record SchoolWithMembers(SchoolSummary school, List<UserSummary> members) {
    }
}
