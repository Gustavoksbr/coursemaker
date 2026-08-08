package com.coursemaker.service;

import com.coursemaker.domain.entity.Post;
import com.coursemaker.domain.entity.PostBlock;
import com.coursemaker.domain.entity.User;
import com.coursemaker.dto.curriculum.CurriculumDtos.BlockResponse;
import com.coursemaker.dto.curriculum.CurriculumDtos.CreateBlockRequest;
import com.coursemaker.dto.curriculum.CurriculumDtos.UpdateBlockRequest;
import com.coursemaker.exception.ApiExceptions.BadRequestException;
import com.coursemaker.exception.ApiExceptions.ForbiddenException;
import com.coursemaker.exception.ApiExceptions.ResourceNotFoundException;
import com.coursemaker.repository.PostBlockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PostBlockService {

    private final PostBlockRepository blockRepository;
    private final PostService postService;
    private final HtmlSanitizer htmlSanitizer;

    @Transactional(readOnly = true)
    public List<BlockResponse> list(UUID postId, User viewer) {
        postService.loadVisible(postId, viewer);
        return blockRepository.findByPostOrdered(postId).stream().map(BlockResponse::of).toList();
    }

    @Transactional
    public BlockResponse create(UUID postId, CreateBlockRequest request, User viewer) {
        Post post = postService.loadForEditing(postId, viewer);

        PostBlock block = PostBlock.builder()
                .post(post)
                .type(request.type())
                .content(htmlSanitizer.sanitize(request.type(), request.content()))
                .language(request.language())
                .orderIndex(blockRepository.findMaxOrder(postId) + 1)
                .build();

        return BlockResponse.of(blockRepository.save(block));
    }

    @Transactional
    public BlockResponse update(UUID blockId, UpdateBlockRequest request, User viewer) {
        PostBlock block = loadForEditing(blockId, viewer);

        if (request.type() != null) {
            block.setType(request.type());
        }
        if (request.content() != null) {
            block.setContent(htmlSanitizer.sanitize(block.getType(), request.content()));
        }
        if (request.language() != null) {
            block.setLanguage(request.language());
        }
        return BlockResponse.of(blockRepository.save(block));
    }

    @Transactional
    public void delete(UUID blockId, User viewer) {
        blockRepository.delete(loadForEditing(blockId, viewer));
    }

    @Transactional
    public List<BlockResponse> reorder(UUID postId, List<UUID> orderedIds, User viewer) {
        postService.loadForEditing(postId, viewer);

        List<PostBlock> blocks = blockRepository.findByPostOrdered(postId);
        Map<UUID, PostBlock> byId = blocks.stream().collect(Collectors.toMap(PostBlock::getId, block -> block));

        if (orderedIds.size() != blocks.size() || !byId.keySet().containsAll(orderedIds)) {
            throw new BadRequestException("A lista de reordenacao deve conter exatamente os blocos do post");
        }

        for (int index = 0; index < orderedIds.size(); index++) {
            byId.get(orderedIds.get(index)).setOrderIndex(index);
        }
        blockRepository.saveAll(byId.values());

        return blockRepository.findByPostOrdered(postId).stream().map(BlockResponse::of).toList();
    }

    private PostBlock loadForEditing(UUID blockId, User viewer) {
        PostBlock block = blockRepository.findByIdWithPost(blockId)
                .orElseThrow(() -> ResourceNotFoundException.of("Bloco"));
        if (!postService.isOwner(block.getPost(), viewer)) {
            throw new ForbiddenException("Apenas o dono do post pode fazer isso");
        }
        return block;
    }
}
