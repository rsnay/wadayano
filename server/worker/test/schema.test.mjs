import { execFileSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../', import.meta.url));
const prisma = fileURLToPath(new URL('../node_modules/prisma/build/index.js', import.meta.url));
const sql = execFileSync(process.execPath, [
  prisma, 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script',
], { cwd: root, encoding: 'utf8' });

function database() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(sql);
  return db;
}

test('draft migration preserves legacy entity IDs and relation records', () => {
  const db = database();
  try {
    db.exec(`
      INSERT INTO "Instructor" (id, email, password, updatedAt) VALUES ('i1', 'instructor@example.test', 'legacy-hash', CURRENT_TIMESTAMP);
      INSERT INTO "Student" (id, ltiUserId, email, name, updatedAt) VALUES ('s1', 'lti-user', 'student@example.test', 'Student', CURRENT_TIMESTAMP);
      INSERT INTO "Course" (id, title, ltiSecret, survey, updatedAt) VALUES ('c1', 'Course', 'fixture-secret', '{"questions":["one"]}', CURRENT_TIMESTAMP);
      INSERT INTO "CourseInstructor" VALUES ('c1', 'i1');
      INSERT INTO "CourseStudent" VALUES ('c1', 's1');
      INSERT INTO "Quiz" (id, title, type, orderedQuestionIds, courseId, updatedAt) VALUES ('quiz', 'Quiz', 'GRADED', '["q1"]', 'c1', CURRENT_TIMESTAMP);
      INSERT INTO "Question" (id, prompt, type, correctShortAnswers, updatedAt) VALUES ('q1', 'Prompt', 'SHORT_ANSWER', '["one","two"]', CURRENT_TIMESTAMP);
      INSERT INTO "QuizQuestion" VALUES ('quiz', 'q1');
      INSERT INTO "QuizAttempt" (id, studentId, quizId, ltiSessionInfo, updatedAt) VALUES ('a1', 's1', 'quiz', '{"outcome":"fixture"}', CURRENT_TIMESTAMP);
      INSERT INTO "QuestionAttempt" (id, questionId, isCorrect, isConfident, correctShortAnswer, updatedAt) VALUES ('qa1', 'q1', 1, 1, 'one', CURRENT_TIMESTAMP);
      INSERT INTO "QuizQuestionAttempt" VALUES ('a1', 'qa1');
      INSERT INTO "ConceptConfidence" (id, concept, confidence, updatedAt) VALUES ('cc1', 'Concept', 3, CURRENT_TIMESTAMP);
      INSERT INTO "QuizConceptConfidence" VALUES ('a1', 'cc1');
      INSERT INTO "SurveyResult" (id, courseId, studentId, answers, updatedAt) VALUES ('sr1', 'c1', 's1', '{"answer":true}', CURRENT_TIMESTAMP);
      INSERT INTO "CourseConsent" (id, courseId, studentId, consent, updatedAt) VALUES ('consent1', 'c1', 's1', 'yes', CURRENT_TIMESTAMP);
      INSERT INTO "TrackingEvent" (id, action, context, studentId, updatedAt) VALUES ('event1', 'STUDENT_REVIEW_CONCEPT', '{"concept":"Concept"}', 's1', CURRENT_TIMESTAMP);
    `);
    const row = db.prepare(`
      SELECT q.id, q.correctShortAnswers, qa.correctShortAnswer
      FROM "Question" q
      JOIN "QuestionAttempt" qa ON qa.questionId = q.id
      JOIN "QuizQuestionAttempt" qqa ON qqa.questionAttemptId = qa.id
      JOIN "QuizAttempt" a ON a.id = qqa.quizAttemptId
      WHERE a.studentId = ?
    `).get('s1');
    assert.equal(row.id, 'q1');
    assert.deepEqual(JSON.parse(row.correctShortAnswers), ['one', 'two']);
    assert.equal(row.correctShortAnswer, 'one');
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
    assert.throws(() => db.prepare('INSERT INTO "CourseStudent" VALUES (?, ?)').run('missing', 's1'));
    assert.throws(() => db.prepare('INSERT INTO "CourseStudent" VALUES (?, ?)').run('c1', 's1'));
  } finally {
    db.close();
  }
});

test('join cascades unlink records without deleting shared data', () => {
  const db = database();
  try {
    db.exec(`
      INSERT INTO "Question" (id, prompt, type, correctShortAnswers, updatedAt) VALUES ('q1', 'Prompt', 'SHORT_ANSWER', '[]', CURRENT_TIMESTAMP);
      INSERT INTO "Quiz" (id, title, type, orderedQuestionIds, updatedAt) VALUES ('quiz1', 'One', 'PRACTICE', '[]', CURRENT_TIMESTAMP), ('quiz2', 'Two', 'PRACTICE', '[]', CURRENT_TIMESTAMP);
      INSERT INTO "QuizQuestion" VALUES ('quiz1', 'q1'), ('quiz2', 'q1');
      DELETE FROM "Quiz" WHERE id = 'quiz1';
    `);
    assert.equal(db.prepare('SELECT count(*) AS count FROM "Question"').get().count, 1);
    assert.equal(db.prepare('SELECT count(*) AS count FROM "QuizQuestion" WHERE quizId = ?').get('quiz2').count, 1);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  } finally {
    db.close();
  }
});

test('LTI nonce records enforce uniqueness for durable replay protection', () => {
  const db = database();
  try {
    db.prepare(`
      INSERT INTO "LtiNonce" ("consumerKey", "nonce", "timestampSec")
      VALUES (?, ?, ?)
    `).run('course-1', 'nonce-1', 1_800_000_000);
    assert.throws(() => db.prepare(`
      INSERT INTO "LtiNonce" ("consumerKey", "nonce", "timestampSec")
      VALUES (?, ?, ?)
    `).run('course-1', 'nonce-1', 1_800_000_001));
    assert.equal(
      db.prepare('SELECT COUNT(*) AS count FROM "LtiNonce"').get().count,
      1,
    );
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  } finally {
    db.close();
  }
});
