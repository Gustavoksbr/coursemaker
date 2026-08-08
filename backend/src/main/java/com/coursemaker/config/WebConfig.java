package com.coursemaker.config;

import com.coursemaker.domain.enums.BlockType;
import com.coursemaker.domain.enums.CourseStatus;
import com.coursemaker.domain.enums.CourseVisibility;
import com.coursemaker.domain.enums.UserRole;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.format.FormatterRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.function.Function;

/**
 * Teaches Spring MVC to read the enums' wire values from query parameters.
 *
 * <p>The enums serialize as lowercase (`public`, `available`, `text`) through {@code @JsonValue},
 * and {@code @JsonCreator} handles the reverse for JSON bodies. Query parameters do not go through
 * Jackson, though: Spring converts them with its own {@code StringToEnum} factory, which calls
 * {@code Enum.valueOf} and therefore only accepts the constant names. Without these converters,
 * {@code GET /api/v1/courses?visibility=private} fails to bind and blows up.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addFormatters(FormatterRegistry registry) {
        registry.addConverter(String.class, CourseVisibility.class, blankAsNull(CourseVisibility::from));
        registry.addConverter(String.class, CourseStatus.class, blankAsNull(CourseStatus::from));
        registry.addConverter(String.class, BlockType.class, blankAsNull(BlockType::from));
        registry.addConverter(String.class, UserRole.class, blankAsNull(UserRole::from));
    }

    /**
     * An empty parameter ({@code ?visibility=}) means "filter not applied", so it maps to null
     * instead of failing. Genuinely unknown values still throw, which the exception handler turns
     * into a 400.
     */
    private static <E> Converter<String, E> blankAsNull(Function<String, E> parser) {
        return source -> (source == null || source.isBlank()) ? null : parser.apply(source);
    }
}
