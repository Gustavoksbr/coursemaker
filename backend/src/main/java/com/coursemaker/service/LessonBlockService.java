package com.coursemaker.service;

import com.coursemaker.domain.entity.CompositeIds.UserBlockId;
import com.coursemaker.domain.entity.Lesson;
import com.coursemaker.domain.entity.LessonBlock;
import com.coursemaker.domain.entity.QuestionAnswer;
import com.coursemaker.domain.entity.User;
import com.coursemaker.domain.enums.BlockType;
import com.coursemaker.dto.curriculum.CurriculumDtos.AnswerBlockRequest;
import com.coursemaker.dto.curriculum.CurriculumDtos.AnswerBlockResponse;
import com.coursemaker.dto.curriculum.CurriculumDtos.BlockResponse;
import com.coursemaker.dto.curriculum.CurriculumDtos.CreateBlockRequest;
import com.coursemaker.dto.curriculum.CurriculumDtos.UpdateBlockRequest;
import com.coursemaker.exception.ApiExceptions.BadRequestException;
import com.coursemaker.exception.ApiExceptions.ResourceNotFoundException;
import com.coursemaker.repository.LessonBlockRepository;
import com.coursemaker.repository.QuestionAnswerRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LessonBlockService {

    private final LessonBlockRepository blockRepository;
    private final QuestionAnswerRepository questionAnswerRepository;
    private final LessonService lessonService;
    private final CourseAccessService accessService;
    private final HtmlSanitizer htmlSanitizer;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<BlockResponse> list(UUID lessonId, User viewer) {
        lessonService.loadVisible(lessonId, viewer);
        return blockRepository.findByLessonOrdered(lessonId).stream().map(BlockResponse::of).toList();
    }

    @Transactional
    public BlockResponse create(UUID lessonId, CreateBlockRequest request, User viewer) {
        Lesson lesson = lessonService.loadForEditing(lessonId, viewer);

        LessonBlock block = LessonBlock.builder()
                .lesson(lesson)
                .type(request.type())
                .content(htmlSanitizer.sanitize(request.type(), request.content()))
                .language(request.language())
                .orderIndex(blockRepository.findMaxOrder(lessonId) + 1)
                .build();

        return BlockResponse.of(blockRepository.save(block));
    }

    @Transactional
    public BlockResponse update(UUID blockId, UpdateBlockRequest request, User viewer) {
        LessonBlock block = loadForEditing(blockId, viewer);

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
    public List<BlockResponse> reorder(UUID lessonId, List<UUID> orderedIds, User viewer) {
        lessonService.loadForEditing(lessonId, viewer);

        List<LessonBlock> blocks = blockRepository.findByLessonOrdered(lessonId);
        Map<UUID, LessonBlock> byId = blocks.stream().collect(Collectors.toMap(LessonBlock::getId, block -> block));

        if (orderedIds.size() != blocks.size() || !byId.keySet().containsAll(orderedIds)) {
            throw new BadRequestException("A lista de reordenacao deve conter exatamente os blocos da licao");
        }

        for (int index = 0; index < orderedIds.size(); index++) {
            byId.get(orderedIds.get(index)).setOrderIndex(index);
        }
        blockRepository.saveAll(byId.values());

        return blockRepository.findByLessonOrdered(lessonId).stream().map(BlockResponse::of).toList();
    }

    private LessonBlock loadForEditing(UUID blockId, User viewer) {
        LessonBlock block = blockRepository.findByIdWithCourse(blockId)
                .orElseThrow(() -> ResourceNotFoundException.of("Bloco"));
        accessService.requireOwner(block.getLesson().getModule().getCourse(), viewer);
        return block;
    }

    /**
     * Records whether {@code viewer} picked the correct alternative of a QUESTION block. Re-answering
     * overwrites the previous attempt - there is no limit on tries, matching the QuestionBlock UI,
     * which lets a student keep guessing after a wrong pick. See ProgressService#markComplete for
     * where this gates lesson completion.
     */
    @Transactional
    public AnswerBlockResponse answer(UUID blockId, AnswerBlockRequest request, User viewer) {
        LessonBlock block = blockRepository.findByIdWithCourse(blockId)
                .orElseThrow(() -> ResourceNotFoundException.of("Bloco"));
        accessService.requireContentAccess(block.getLesson().getModule().getCourse(), viewer);

        if (block.getType() != BlockType.QUESTION) {
            throw new BadRequestException("Este bloco nao e uma questao");
        }

        boolean correct = isCorrectAlternative(block.getContent(), request.alternativeId());

        UserBlockId id = new UserBlockId(viewer.getId(), blockId);
        QuestionAnswer answer = questionAnswerRepository.findById(id)
                .orElseGet(() -> QuestionAnswer.of(viewer.getId(), blockId));
        answer.setCorrect(correct);
        answer.setAnsweredAt(Instant.now());
        questionAnswerRepository.save(answer);

        return new AnswerBlockResponse(blockId, correct);
    }

    private boolean isCorrectAlternative(String content, String alternativeId) {
        JsonNode root;
        try {
            root = objectMapper.readTree(content);
        } catch (Exception e) {
            throw new BadRequestException("Questao malformada");
        }
        for (JsonNode alternative : root.path("alternatives")) {
            if (alternative.path("id").asText("").equals(alternativeId)) {
                return alternative.path("correct").asBoolean(false);
            }
        }
        throw new BadRequestException("Alternativa invalida");
    }
}
