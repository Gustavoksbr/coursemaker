package com.coursemaker.service;

import com.coursemaker.domain.entity.CompositeIds.UserLessonId;
import com.coursemaker.domain.entity.Course;
import com.coursemaker.domain.entity.Lesson;
import com.coursemaker.domain.entity.LessonBlock;
import com.coursemaker.domain.entity.LessonCompletion;
import com.coursemaker.domain.entity.User;
import com.coursemaker.domain.enums.BlockType;
import com.coursemaker.dto.course.CourseDtos.ProgressResponse;
import com.coursemaker.exception.ApiExceptions.BadRequestException;
import com.coursemaker.repository.LessonBlockRepository;
import com.coursemaker.repository.LessonCompletionRepository;
import com.coursemaker.repository.LessonRepository;
import com.coursemaker.repository.QuestionAnswerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/** Lesson completion tracking - every course has it, gated only by whether it has lessons at all
 * (see EnrollmentService#isFinished). */
@Service
@RequiredArgsConstructor
public class ProgressService {

    private final LessonCompletionRepository completionRepository;
    private final LessonRepository lessonRepository;
    private final LessonBlockRepository lessonBlockRepository;
    private final QuestionAnswerRepository questionAnswerRepository;
    private final LessonService lessonService;
    private final CourseService courseService;

    @Transactional
    public ProgressResponse markComplete(UUID lessonId, User user) {
        Lesson lesson = lessonService.loadVisible(lessonId, user);
        Course course = lesson.getModule().getCourse();
        requireQuestionsAnswered(lessonId, user);

        UserLessonId key = new UserLessonId(user.getId(), lessonId);
        if (!completionRepository.existsById(key)) {
            completionRepository.save(LessonCompletion.of(user.getId(), lessonId));
        }
        return progressOf(course, user);
    }

    @Transactional
    public ProgressResponse markIncomplete(UUID lessonId, User user) {
        Lesson lesson = lessonService.loadVisible(lessonId, user);
        Course course = lesson.getModule().getCourse();

        completionRepository.deleteById(new UserLessonId(user.getId(), lessonId));
        return progressOf(course, user);
    }

    @Transactional
    public ProgressResponse getProgress(UUID courseId, User user) {
        Course course = courseService.loadVisible(courseId, user);
        return progressOf(course, user);
    }

    private ProgressResponse progressOf(Course course, User user) {
        List<UUID> completed = completionRepository.findCompletedLessonIds(user.getId(), course.getId());
        long total = lessonRepository.countByCourseId(course.getId());
        int percentage = total == 0 ? 0 : (int) Math.round(completed.size() * 100.0 / total);
        return new ProgressResponse(completed.size(), total, percentage, completed);
    }

    /**
     * A lesson with QUESTION blocks cannot be marked complete until every one of them has a correct
     * answer on record - no more finishing a lesson by simply clicking through it. See
     * LessonBlockService#answer for where that record is written.
     */
    private void requireQuestionsAnswered(UUID lessonId, User user) {
        List<UUID> questionBlockIds = lessonBlockRepository.findByLessonOrdered(lessonId).stream()
                .filter(block -> block.getType() == BlockType.QUESTION)
                .map(LessonBlock::getId)
                .toList();
        if (questionBlockIds.isEmpty()) {
            return;
        }
        List<UUID> answeredCorrectly =
                questionAnswerRepository.findCorrectlyAnsweredBlockIds(user.getId(), questionBlockIds);
        if (answeredCorrectly.size() < questionBlockIds.size()) {
            throw new BadRequestException(
                    "Responda corretamente todas as questoes desta licao antes de concluir");
        }
    }
}
