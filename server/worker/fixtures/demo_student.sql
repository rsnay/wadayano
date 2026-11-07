INSERT OR IGNORE INTO "Student"
  ("id", "ltiUserId", "email", "name", "createdAt", "updatedAt")
VALUES
  ('demo-student', 'wadayano-local-demo-student', 'demo-student@example.test',
   'Demo Student', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');

INSERT OR IGNORE INTO "Course"
  ("id", "title", "number", "lmsUrl", "consentFormUrl", "ltiSecret", "survey", "createdAt", "updatedAt")
VALUES
  ('demo-course', 'Demo Research Course', 'DEMO 101', NULL, NULL,
   'wadayano-local-demo-consumer-secret',
   json('{"questions":[{"index":1,"prompt":"How confident are you with these topics?","options":[{"index":1,"text":"Not yet"},{"index":2,"text":"Somewhat"},{"index":3,"text":"Very"}]}]}'),
   '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');

INSERT OR IGNORE INTO "CourseStudent" ("courseId", "studentId")
VALUES ('demo-course', 'demo-student');

INSERT OR IGNORE INTO "Quiz"
  ("id", "title", "type", "orderedQuestionIds", "createdAt", "updatedAt", "courseId")
VALUES
  ('demo-practice-quiz', 'Demo Practice Quiz', 'PRACTICE',
   json('["demo-question-algebra","demo-question-arithmetic"]'),
   '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', 'demo-course');

INSERT OR IGNORE INTO "Question"
  ("id", "prompt", "concept", "type", "correctShortAnswers", "createdAt", "updatedAt")
VALUES
  ('demo-question-algebra', '<p>Which expression is equivalent to 2(x + 3)?</p>',
   'Algebra', 'MULTIPLE_CHOICE', json('[]'),
   '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('demo-question-arithmetic', '<p>What is 2 + 2?</p>',
   'Arithmetic', 'SHORT_ANSWER', json('["4"]'),
   '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');

INSERT OR IGNORE INTO "Option"
  ("id", "text", "isCorrect", "createdAt", "updatedAt", "questionId")
VALUES
  ('demo-algebra-option-correct', '<p>2x + 6</p>', 1,
   '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', 'demo-question-algebra'),
  ('demo-algebra-option-incorrect', '<p>2x + 3</p>', 0,
   '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', 'demo-question-algebra');

INSERT OR IGNORE INTO "QuizQuestion" ("quizId", "questionId")
VALUES
  ('demo-practice-quiz', 'demo-question-algebra'),
  ('demo-practice-quiz', 'demo-question-arithmetic');

INSERT OR IGNORE INTO "QuizAttempt"
  ("id", "createdAt", "updatedAt", "completed", "postSucceeded", "score", "studentId", "quizId")
VALUES
  ('demo-past-attempt', '2026-01-02T00:00:00.000Z', '2026-01-02T00:00:00.000Z',
   '2026-01-02T00:05:00.000Z', NULL, 0.5, 'demo-student', 'demo-practice-quiz');

INSERT OR IGNORE INTO "QuestionAttempt"
  ("id", "createdAt", "updatedAt", "shortAnswer", "isCorrect", "correctShortAnswer",
   "isConfident", "questionId", "optionId", "correctOptionId")
VALUES
  ('demo-past-algebra-answer', '2026-01-02T00:01:00.000Z', '2026-01-02T00:01:00.000Z',
   NULL, 1, NULL, 1, 'demo-question-algebra',
   'demo-algebra-option-correct', 'demo-algebra-option-correct'),
  ('demo-past-arithmetic-answer', '2026-01-02T00:02:00.000Z', '2026-01-02T00:02:00.000Z',
   '5', 0, '4', 0, 'demo-question-arithmetic', NULL, NULL);

INSERT OR IGNORE INTO "QuizQuestionAttempt" ("quizAttemptId", "questionAttemptId")
VALUES
  ('demo-past-attempt', 'demo-past-algebra-answer'),
  ('demo-past-attempt', 'demo-past-arithmetic-answer');

INSERT OR IGNORE INTO "ConceptConfidence"
  ("id", "concept", "confidence", "createdAt", "updatedAt")
VALUES
  ('demo-algebra-confidence', 'Algebra', 1,
   '2026-01-02T00:00:00.000Z', '2026-01-02T00:00:00.000Z'),
  ('demo-arithmetic-confidence', 'Arithmetic', 0,
   '2026-01-02T00:00:00.000Z', '2026-01-02T00:00:00.000Z');

INSERT OR IGNORE INTO "QuizConceptConfidence" ("quizAttemptId", "conceptConfidenceId")
VALUES
  ('demo-past-attempt', 'demo-algebra-confidence'),
  ('demo-past-attempt', 'demo-arithmetic-confidence');

INSERT OR IGNORE INTO "SurveyResult"
  ("id", "answers", "createdAt", "updatedAt", "courseId", "studentId")
VALUES
  ('demo-survey-result', json('{"1":2}'),
   '2026-01-02T00:10:00.000Z', '2026-01-02T00:10:00.000Z',
   'demo-course', 'demo-student');
