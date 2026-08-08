package com.coursemaker.dto.user;

import com.coursemaker.domain.entity.User;
import com.coursemaker.domain.enums.UserRole;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** The authenticated user's own record. Never carries {@code passwordHash}. */
public record UserResponse(
        UUID id,
        String email,
        String nickname,
        String name,
        String image,
        String bio,
        List<String> stacks,
        UserRole role,
        boolean needsNickname,
        Instant createdAt) {

    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getNickname(),
                user.getName(),
                user.getImage(),
                user.getBio(),
                user.getStacks(),
                user.getRole(),
                user.getNickname() == null,
                user.getCreatedAt());
    }
}
