package com.coursemaker.domain.converter;

import com.coursemaker.domain.enums.BlockType;
import com.coursemaker.domain.enums.CourseStatus;
import com.coursemaker.domain.enums.CourseVisibility;
import com.coursemaker.domain.enums.UserRole;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * The database stores the lowercase wire values (`public`, `available`, `text`, ...) that the REST
 * API also exposes, so the CHECK constraints in the migrations read the same as the JSON payloads.
 * These converters bridge that to the uppercase Java enum constants.
 */
public final class EnumConverters {

    private EnumConverters() {
    }

    @Converter(autoApply = true)
    public static class CourseVisibilityConverter implements AttributeConverter<CourseVisibility, String> {
        @Override
        public String convertToDatabaseColumn(CourseVisibility attribute) {
            return attribute == null ? null : attribute.getValue();
        }

        @Override
        public CourseVisibility convertToEntityAttribute(String dbData) {
            return CourseVisibility.from(dbData);
        }
    }

    @Converter(autoApply = true)
    public static class CourseStatusConverter implements AttributeConverter<CourseStatus, String> {
        @Override
        public String convertToDatabaseColumn(CourseStatus attribute) {
            return attribute == null ? null : attribute.getValue();
        }

        @Override
        public CourseStatus convertToEntityAttribute(String dbData) {
            return CourseStatus.from(dbData);
        }
    }

    @Converter(autoApply = true)
    public static class BlockTypeConverter implements AttributeConverter<BlockType, String> {
        @Override
        public String convertToDatabaseColumn(BlockType attribute) {
            return attribute == null ? null : attribute.getValue();
        }

        @Override
        public BlockType convertToEntityAttribute(String dbData) {
            return BlockType.from(dbData);
        }
    }

    @Converter(autoApply = true)
    public static class UserRoleConverter implements AttributeConverter<UserRole, String> {
        @Override
        public String convertToDatabaseColumn(UserRole attribute) {
            return attribute == null ? null : attribute.getValue();
        }

        @Override
        public UserRole convertToEntityAttribute(String dbData) {
            return UserRole.from(dbData);
        }
    }
}
