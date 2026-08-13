package com.coursemaker.service;

import com.coursemaker.config.JwtService;
import com.coursemaker.domain.entity.User;
import com.coursemaker.dto.PageResponse;
import com.coursemaker.dto.auth.AuthDtos.AuthResponse;
import com.coursemaker.dto.user.PersonSummary;
import com.coursemaker.dto.user.PublicProfileResponse;
import com.coursemaker.dto.user.UpdateUserRequest;
import com.coursemaker.dto.user.UserResponse;
import com.coursemaker.exception.ApiExceptions.ConflictException;
import com.coursemaker.exception.ApiExceptions.ForbiddenException;
import com.coursemaker.exception.ApiExceptions.ResourceNotFoundException;
import com.coursemaker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final int MAX_STACKS = 20;
    private static final int MAX_PAGE_SIZE = 50;

    private final UserRepository userRepository;
    private final CourseService courseService;
    private final PostService postService;
    private final TrilhaService trilhaService;
    private final JwtService jwtService;

    @Transactional(readOnly = true)
    public PublicProfileResponse getPublicProfile(String nickname, User viewer) {
        User user = userRepository.findByNicknameIgnoreCase(nickname)
                .orElseThrow(() -> ResourceNotFoundException.of("Usuario"));

        return new PublicProfileResponse(
                user.getId(),
                user.getNickname(),
                user.getName(),
                user.getImage(),
                user.getBio(),
                user.getStacks(),
                user.getCreatedAt(),
                courseService.listByOwner(user.getId(), viewer),
                postService.listByOwner(user.getId(), viewer),
                trilhaService.listByOwner(user.getId(), viewer));
    }

    /**
     * Returns a freshly-signed token along with the updated profile: {@code name} and
     * {@code nickname} are both embedded in the JWT (see {@link JwtService#extractPrincipal}), so
     * the old token would keep asserting the pre-update values until it expired otherwise -
     * breaking, in particular, "set your nickname" immediately followed by creating content.
     */
    @Transactional
    public AuthResponse updateProfile(UUID targetId, UpdateUserRequest request, User currentUser) {
        if (!targetId.equals(currentUser.getId())) {
            throw new ForbiddenException("Voce so pode editar o proprio perfil");
        }
        User user = userRepository.findById(targetId)
                .orElseThrow(() -> ResourceNotFoundException.of("Usuario"));

        if (request.name() != null) {
            user.setName(request.name().trim());
        }
        if (request.bio() != null) {
            user.setBio(request.bio());
        }
        if (request.image() != null) {
            user.setImage(request.image().isBlank() ? null : request.image().trim());
        }
        if (request.stacks() != null) {
            user.setStacks(request.stacks().stream()
                    .filter(stack -> stack != null && !stack.isBlank())
                    .map(String::trim)
                    .distinct()
                    .limit(MAX_STACKS)
                    .collect(java.util.stream.Collectors.toCollection(ArrayList::new)));
        }
        applyNickname(user, request.nickname());

        User saved = userRepository.save(user);
        return new AuthResponse(jwtService.generateToken(saved), jwtService.getExpiresInSeconds(), UserResponse.from(saved));
    }

    /** The nickname is part of every public URL, so it can be claimed once and never changed. */
    private void applyNickname(User user, String requested) {
        if (requested == null) {
            return;
        }
        String nickname = requested.trim().toLowerCase();
        if (nickname.equals(user.getNickname())) {
            return;
        }
        if (user.getNickname() != null) {
            throw new ConflictException("O nickname nao pode ser alterado depois de definido");
        }
        if (userRepository.existsByNicknameIgnoreCase(nickname)) {
            throw new ConflictException("Este nickname ja esta em uso");
        }
        user.setNickname(nickname);
    }

    @Transactional(readOnly = true)
    public boolean isNicknameAvailable(String nickname) {
        return !userRepository.existsByNicknameIgnoreCase(nickname.trim().toLowerCase());
    }

    @Transactional(readOnly = true)
    public PageResponse<PersonSummary> search(String q, String sort, int page, int size) {
        Page<User> result = userRepository.search(blankToNull(q), sort == null ? "recent" : sort,
                PageRequest.of(Math.max(0, page), Math.clamp(size, 1, MAX_PAGE_SIZE)));
        return PageResponse.of(result, PersonSummary::from);
    }

    private static String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}
