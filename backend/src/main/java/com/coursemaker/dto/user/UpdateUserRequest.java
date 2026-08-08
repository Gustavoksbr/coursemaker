package com.coursemaker.dto.user;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Partial profile update: every field is optional, and null means "leave unchanged".
 *
 * <p>{@code nickname} is special - it may only be set while it is still null, which is the
 * "setup nickname" step right after registering.
 */
public record UpdateUserRequest(
        @Size(min = 1, max = 255)
        String name,

        @Size(max = 5000)
        String bio,

        List<@Size(max = 50) String> stacks,

        @Size(max = 2000)
        String image,

        @Size(min = 3, max = 30)
        @Pattern(regexp = "^[a-z0-9][a-z0-9-]*$",
                message = "use apenas letras minusculas, numeros e hifens")
        String nickname) {
}
