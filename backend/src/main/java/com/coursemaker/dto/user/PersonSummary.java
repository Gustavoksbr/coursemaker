package com.coursemaker.dto.user;

import com.coursemaker.domain.entity.User;

import java.util.UUID;

/** A user as a search result card - richer than {@link UserSummary}, which is just an embed. */
public record PersonSummary(UUID id, String nickname, String name, String image, String bio) {

    public static PersonSummary from(User user) {
        return new PersonSummary(user.getId(), user.getNickname(), user.getName(), user.getImage(), user.getBio());
    }
}
