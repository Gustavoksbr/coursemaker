package com.coursemaker.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * One test case. In FUNCTION mode {@code args} is a JSON array and {@code expected} a JSON value;
 * in OUTPUT mode {@code input} is the stdin and {@code expected} the text expected on stdout.
 * Visible tests are echoed to students as examples, hidden ones only ever count as pass/fail.
 */
@Entity
@Table(name = "code_exercise_tests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CodeExerciseTest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "block_id", nullable = false)
    private UUID blockId;

    @Column(nullable = false)
    private int position;

    @Column(nullable = false)
    private boolean visible;

    @Column(columnDefinition = "text")
    private String args;

    @Column(columnDefinition = "text")
    private String input;

    @Column(nullable = false, columnDefinition = "text")
    private String expected;
}
