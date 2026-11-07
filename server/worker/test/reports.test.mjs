import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import worker from '../src/index.js';

const appSecret = 'test-only-secret';

function token(payload) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}`;
  const signature = createHmac('sha256', appSecret).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

function reportEnvironment({ owned = true } = {}) {
  const queries = [];
  const rows = {
    students: [{ id: 'student-1', name: 'Student One' }],
    questions: [{
      id: 'question-1',
      concept: 'Concept A',
      prompt: '<p>Question?</p>',
      type: 'MULTIPLE_CHOICE',
      correctShortAnswers: '[]',
    }],
    options: [{
      id: 'option-1',
      questionId: 'question-1',
      text: 'Answer',
      isCorrect: 1,
    }],
    attempts: [{
      id: 'attempt-1',
      studentId: 'student-1',
      studentName: 'Student One',
      createdAt: '2026-01-01T00:00:00.000Z',
      completed: '2026-01-01T00:01:00.000Z',
      score: 1,
    }],
    questionAttempts: [{
      quizAttemptId: 'attempt-1',
      id: 'answer-1',
      isCorrect: 1,
      isConfident: 1,
      optionId: 'option-1',
      shortAnswer: null,
      correctShortAnswer: null,
      questionId: 'question-1',
      concept: 'Concept A',
    }],
    confidences: [{
      quizAttemptId: 'attempt-1',
      id: 'confidence-1',
      concept: 'Concept A',
      confidence: 1,
    }],
  };

  return {
    queries,
    env: {
      APP_SECRET: appSecret,
      DB: {
        prepare(sql) {
          return {
            bind(...values) {
              return {
                async first() {
                  queries.push(sql);
                  if (sql.includes('FROM "Quiz" quiz')) {
                    return owned
                      ? { id: 'quiz-1', title: 'Quiz One', type: 'GRADED', courseId: 'course-1', courseTitle: 'Course One' }
                      : null;
                  }
                  return null;
                },
                async all() {
                  queries.push(sql);
                  if (sql.includes('FROM "CourseStudent"')) return { results: rows.students };
                  if (sql.includes('FROM "Option" option')) return { results: rows.options };
                  if (sql.includes('FROM "QuizQuestionAttempt" link')) return { results: rows.questionAttempts };
                  if (sql.includes('FROM "QuizConceptConfidence" link')) return { results: rows.confidences };
                  if (sql.includes('FROM "QuizAttempt" attempt')) return { results: rows.attempts };
                  if (sql.includes('FROM "QuizQuestion" link')) return { results: rows.questions };
                  return { results: [] };
                },
              };
            },
          };
        },
      },
    },
  };
}

function reportRequest() {
  return new Request('https://example.test/api/quizzes/quiz-1/report', {
    headers: {
      authorization: `Bearer ${token({ userId: 'instructor-1', isInstructor: true })}`,
    },
  });
}

test('quiz report API returns full data required by instructor score and question reports', async () => {
  const bindings = reportEnvironment();
  const response = await worker.fetch(reportRequest(), bindings.env);

  assert.equal(response.status, 200);
  const { quiz } = await response.json();
  assert.equal(quiz.id, 'quiz-1');
  assert.deepEqual(quiz.course.students, [{ id: 'student-1', name: 'Student One' }]);
  assert.deepEqual(quiz.questions[0].options, [{
    id: 'option-1',
    text: 'Answer',
    isCorrect: true,
  }]);
  assert.deepEqual(quiz.quizAttempts[0].questionAttempts[0], {
    id: 'answer-1',
    isCorrect: true,
    isConfident: true,
    question: { id: 'question-1', concept: 'Concept A' },
    option: { id: 'option-1' },
    shortAnswer: null,
    correctShortAnswer: null,
  });
  assert.deepEqual(quiz.quizAttempts[0].conceptConfidences, [{
    id: 'confidence-1',
    concept: 'Concept A',
    confidence: 1,
  }]);
  assert.equal(bindings.queries.length, 7);
});

test('quiz report API hides reports for quizzes the instructor does not own', async () => {
  const bindings = reportEnvironment({ owned: false });
  const response = await worker.fetch(reportRequest(), bindings.env);

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'quiz_not_found' });
  assert.equal(bindings.queries.length, 1);
});
