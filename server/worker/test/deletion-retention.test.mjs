import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import worker from '../src/index.js';

const appSecret = 'test-only-secret';
const workerRoot = fileURLToPath(new URL('../', import.meta.url));
const prisma = fileURLToPath(new URL('../node_modules/prisma/build/index.js', import.meta.url));
const schema = execFileSync(process.execPath, [
  prisma,
  'migrate',
  'diff',
  '--from-empty',
  '--to-schema-datamodel',
  'prisma/schema.prisma',
  '--script',
], { cwd: workerRoot, encoding: 'utf8' });

function token(userId) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    userId,
    isInstructor: true,
  })}`;
  const signature = createHmac('sha256', appSecret).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

function environment() {
  const database = new DatabaseSync(':memory:');
  database.exec('PRAGMA foreign_keys = ON');
  database.exec(schema);

  const prepare = sql => ({
    sql,
    bind(...values) {
      return {
        sql,
        values,
        async first() {
          return database.prepare(sql).get(...values) ?? null;
        },
        async all() {
          return { results: database.prepare(sql).all(...values) };
        },
        async run() {
          const result = database.prepare(sql).run(...values);
          return { meta: { changes: Number(result.changes) } };
        },
      };
    },
  });

  return {
    database,
    env: {
      APP_SECRET: appSecret,
      DB: {
        prepare,
        async batch(statements) {
          database.exec('BEGIN');
          try {
            const results = statements.map(({ sql, values }) => {
              const result = database.prepare(sql).run(...values);
              return { meta: { changes: Number(result.changes) } };
            });
            database.exec('COMMIT');
            return results;
          } catch (error) {
            database.exec('ROLLBACK');
            throw error;
          }
        },
      },
    },
  };
}

function request(path, userId) {
  return new Request(`https://example.test${path}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${token(userId)}` },
  });
}

function seedCourse(database) {
  database.exec(`
    INSERT INTO "Instructor" (id, email, password, updatedAt)
      VALUES ('instructor-1', 'one@example.test', 'hash', CURRENT_TIMESTAMP);
    INSERT INTO "Instructor" (id, email, password, updatedAt)
      VALUES ('instructor-2', 'two@example.test', 'hash', CURRENT_TIMESTAMP);
    INSERT INTO "Student" (id, ltiUserId, email, name, updatedAt)
      VALUES ('student-1', 'lti-user', 'student@example.test', 'Student', CURRENT_TIMESTAMP);
    INSERT INTO "Course" (id, title, ltiSecret, updatedAt)
      VALUES ('course-1', 'Course', 'test-secret', CURRENT_TIMESTAMP);
    INSERT INTO "CourseInstructor" VALUES ('course-1', 'instructor-1');
    INSERT INTO "CourseStudent" VALUES ('course-1', 'student-1');
    INSERT INTO "Quiz" (id, title, type, orderedQuestionIds, courseId, updatedAt)
      VALUES ('quiz-1', 'Quiz', 'PRACTICE', '["question-1"]', 'course-1', CURRENT_TIMESTAMP);
    INSERT INTO "Question" (id, prompt, type, correctShortAnswers, updatedAt)
      VALUES ('question-1', 'Prompt', 'SHORT_ANSWER', '["answer"]', CURRENT_TIMESTAMP);
    INSERT INTO "QuizQuestion" VALUES ('quiz-1', 'question-1');
    INSERT INTO "Option" (id, text, isCorrect, questionId, updatedAt)
      VALUES ('option-1', 'Option', 1, 'question-1', CURRENT_TIMESTAMP);
    INSERT INTO "QuizAttempt" (id, studentId, quizId, updatedAt)
      VALUES ('attempt-1', 'student-1', 'quiz-1', CURRENT_TIMESTAMP);
    INSERT INTO "QuestionAttempt" (id, questionId, isCorrect, isConfident, updatedAt)
      VALUES ('question-attempt-1', 'question-1', 1, 1, CURRENT_TIMESTAMP);
    INSERT INTO "QuizQuestionAttempt" VALUES ('attempt-1', 'question-attempt-1');
    INSERT INTO "ConceptConfidence" (id, concept, confidence, updatedAt)
      VALUES ('confidence-1', 'Concept', 3, CURRENT_TIMESTAMP);
    INSERT INTO "QuizConceptConfidence" VALUES ('attempt-1', 'confidence-1');
    INSERT INTO "CourseConsent" (id, consent, courseId, studentId, updatedAt)
      VALUES ('consent-1', 'yes', 'course-1', 'student-1', CURRENT_TIMESTAMP);
    INSERT INTO "SurveyResult" (id, answers, courseId, studentId, updatedAt)
      VALUES ('survey-1', '{}', 'course-1', 'student-1', CURRENT_TIMESTAMP);
    INSERT INTO "TrackingEvent" (id, action, context, studentId, updatedAt)
      VALUES ('tracking-1', 'STUDENT_REVIEW_CONCEPT', '{}', 'student-1', CURRENT_TIMESTAMP);
  `);
}

function count(database, table) {
  return database.prepare(`SELECT COUNT(*) AS count FROM "${table}"`).get().count;
}

test('course deletion is ownership-gated and removes course-scoped research records', async () => {
  const { database, env } = environment();
  try {
    seedCourse(database);

    const denied = await worker.fetch(request('/api/courses/course-1', 'instructor-2'), env);
    assert.equal(denied.status, 404);
    assert.equal(count(database, 'QuizAttempt'), 1);
    assert.equal(count(database, 'SurveyResult'), 1);

    const deleted = await worker.fetch(request('/api/courses/course-1', 'instructor-1'), env);
    assert.equal(deleted.status, 204);
    for (const table of [
      'Course',
      'CourseInstructor',
      'Quiz',
      'QuizQuestion',
      'QuizAttempt',
      'QuestionAttempt',
      'ConceptConfidence',
      'CourseStudent',
      'CourseConsent',
      'SurveyResult',
    ]) {
      assert.equal(count(database, table), 0, `${table} should be removed`);
    }
    assert.equal(count(database, 'Instructor'), 2);
    assert.equal(count(database, 'Student'), 1);
    assert.equal(count(database, 'TrackingEvent'), 1);
    assert.equal(count(database, 'Question'), 1);
    assert.equal(count(database, 'Option'), 1);
    assert.deepEqual(database.prepare('PRAGMA foreign_key_check').all(), []);
  } finally {
    database.close();
  }
});

test('quiz deletion removes its attempt data but preserves shared question history', async () => {
  const { database, env } = environment();
  try {
    seedCourse(database);
    database.exec(`
      INSERT INTO "Quiz" (id, title, type, orderedQuestionIds, courseId, updatedAt)
        VALUES ('quiz-2', 'Second Quiz', 'PRACTICE', '["question-1"]', 'course-1', CURRENT_TIMESTAMP);
      INSERT INTO "QuizQuestion" VALUES ('quiz-2', 'question-1');
      INSERT INTO "QuizAttempt" (id, studentId, quizId, updatedAt)
        VALUES ('attempt-2', 'student-1', 'quiz-2', CURRENT_TIMESTAMP);
      INSERT INTO "QuizQuestionAttempt" VALUES ('attempt-2', 'question-attempt-1');
      INSERT INTO "QuizConceptConfidence" VALUES ('attempt-2', 'confidence-1');
    `);

    const response = await worker.fetch(request('/api/quizzes/quiz-1', 'instructor-1'), env);
    assert.equal(response.status, 204);
    assert.equal(count(database, 'QuizAttempt'), 1);
    assert.equal(count(database, 'QuizQuestionAttempt'), 1);
    assert.equal(count(database, 'QuestionAttempt'), 1);
    assert.equal(count(database, 'ConceptConfidence'), 1);
    assert.equal(count(database, 'QuizQuestion'), 1);
    assert.equal(count(database, 'Question'), 1);
    assert.equal(count(database, 'Option'), 1);
    assert.deepEqual(database.prepare('PRAGMA foreign_key_check').all(), []);
  } finally {
    database.close();
  }
});

test('removing a question from a quiz preserves historical question attempts', async () => {
  const { database, env } = environment();
  try {
    seedCourse(database);

    const response = await worker.fetch(
      request('/api/quizzes/quiz-1/questions/question-1', 'instructor-1'),
      env,
    );
    assert.equal(response.status, 204);
    assert.equal(count(database, 'QuizQuestion'), 0);
    assert.equal(count(database, 'Question'), 1);
    assert.equal(count(database, 'Option'), 1);
    assert.equal(count(database, 'QuestionAttempt'), 1);
    assert.equal(count(database, 'QuizQuestionAttempt'), 1);
    assert.deepEqual(database.prepare('PRAGMA foreign_key_check').all(), []);
  } finally {
    database.close();
  }
});
