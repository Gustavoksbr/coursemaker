package com.coursemaker.service;

import com.coursemaker.domain.entity.User;
import com.coursemaker.dto.admin.AdminDtos.BlockedContentItem;
import com.coursemaker.exception.ApiExceptions.ForbiddenException;
import com.coursemaker.repository.CourseRepository;
import com.coursemaker.repository.PostRepository;
import com.coursemaker.repository.TrilhaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;

/** Backs the admin moderation list: every course, post and trilha currently blocked. */
@Service
@RequiredArgsConstructor
public class AdminModerationService {

    private final CourseRepository courseRepository;
    private final PostRepository postRepository;
    private final TrilhaRepository trilhaRepository;
    private final CourseMapper courseMapper;
    private final PostMapper postMapper;
    private final TrilhaMapper trilhaMapper;

    @Transactional(readOnly = true)
    public List<BlockedContentItem> listBlockedContent(User admin) {
        if (!admin.isAdmin()) {
            throw new ForbiddenException("Apenas administradores podem ver o conteudo bloqueado");
        }

        Stream<BlockedContentItem> courses = courseMapper.toSummaries(courseRepository.findAllBlocked(), admin)
                .stream().map(BlockedContentItem::of);
        Stream<BlockedContentItem> posts = postMapper.toSummaries(postRepository.findAllBlocked(), admin)
                .stream().map(BlockedContentItem::of);
        Stream<BlockedContentItem> trilhas = trilhaMapper.toSummaries(trilhaRepository.findAllBlocked(), admin)
                .stream().map(BlockedContentItem::of);

        return Stream.of(courses, posts, trilhas)
                .flatMap(s -> s)
                .sorted(Comparator.comparing(BlockedContentItem::blockedAt).reversed())
                .toList();
    }
}
