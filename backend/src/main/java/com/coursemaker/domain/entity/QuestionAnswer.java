package com.coursemaker.domain.entity;

import com.coursemaker.domain.entity.CompositeIds.UserBlockId;
import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/** Whether `user` answered the QUESTION block `blockId` correctly. Re-answering overwrites the
 * same row (see LessonBlockService#answer), so only the latest attempt counts. */
@Entity
@Table(name = "question_answers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class QuestionAnswer {

    @EmbeddedId
    private UserBlockId id;

    @Column(nullable = false)
    private boolean correct;

    @Column(name = "answered_at", nullable = false)
    private Instant answeredAt;

    public static QuestionAnswer of(UUID userId, UUID blockId) {
        QuestionAnswer answer = new QuestionAnswer();
        answer.setId(new UserBlockId(userId, blockId));
        return answer;
    }
}
