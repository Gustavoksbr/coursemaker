-- Progress tracking and certificates are no longer optional per course: every course is
-- completable now, gated only by whether it has any lessons (see EnrollmentService.isFinished).
ALTER TABLE courses DROP COLUMN progress_enabled;
