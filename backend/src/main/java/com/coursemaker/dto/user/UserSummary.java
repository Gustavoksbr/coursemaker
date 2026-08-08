package com.coursemaker.dto.user;

import com.coursemaker.domain.entity.User;

import java.util.UUID;

/** The slice of a user that gets embedded in course, post and comment payloads. */
public record UserSummary(UUID id, String nickname, String name, String image) {

    public static UserSummary from(User user) {
        return new UserSummary(user.getId(), user.getNickname(), user.getName(), user.getImage());
    }
}
