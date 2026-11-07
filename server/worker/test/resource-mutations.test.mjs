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

function environment() {
  const batchedStatements = [];
  return {
    batchedStatements,
    env: {
      APP_SECRET: appSecret,
      DB: {
        prepare(sql) {
          return {
            sql,
            bind(...values) {
              return {
                sql,
                values,
                async first() {
                  if (sql.includes('FROM "Quiz"')) return { id: 'quiz-1' };
                  if (sql.includes('FROM "QuizQuestion"')) return { value: 1 };
                  return null;
                },
                async run() {
                  return { meta: { changes: 1 } };
                },
              };
            },
          };
        },
        async batch(statements) {
          batchedStatements.push(...statements);
          return statements.map(() => ({ meta: { changes: 1 } }));
        },
      },
      ASSETS: { fetch: async () => new Response('asset') },
    },
  };
}

function request(path, method, body) {
  return new Request(`https://example.test${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token({ userId: 'instructor-1', isInstructor: true })}`,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const validQuestion = {
  concept: 'Concept A',
  correctShortAnswers: [],
  options: [
    { text: 'Correct', isCorrect: true },
    { text: 'Incorrect', isCorrect: false },
  ],
  prompt: '<p>Choose an answer</p>',
  type: 'MULTIPLE_CHOICE',
};

test('JSON question import validates and commits question, quiz link, and options in one batch', async () => {
  const bindings = environment();
  const response = await worker.fetch(
    request('/api/quizzes/quiz-1/questions/import-json', 'POST', { questions: [validQuestion] }),
    bindings.env,
  );

  assert.equal(response.status, 201);
  const result = await response.json();
  assert.equal(result.questionIds.length, 1);
  assert.equal(bindings.batchedStatements.length, 4);
  assert.match(bindings.batchedStatements[0].sql, /INSERT INTO "Question"/);
  assert.match(bindings.batchedStatements[1].sql, /INSERT INTO "QuizQuestion"/);
  assert.deepEqual(bindings.batchedStatements.slice(2).map(statement => statement.sql.match(/INSERT INTO "Option"/) !== null), [true, true]);
});

test('JSON question import rejects invalid content before writing', async () => {
  const bindings = environment();
  const response = await worker.fetch(
    request('/api/quizzes/quiz-1/questions/import-json', 'POST', {
      questions: [{ ...validQuestion, type: 'INVALID' }],
    }),
    bindings.env,
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'invalid_question' });
  assert.equal(bindings.batchedStatements.length, 0);
});

test('quiz and course deletions and question unlinking route through the Worker', async () => {
  const bindings = environment();
  for (const [path, method] of [
    ['/api/courses/course-1', 'DELETE'],
    ['/api/quizzes/quiz-1', 'DELETE'],
    ['/api/quizzes/quiz-1/questions/question-1', 'DELETE'],
  ]) {
    const response = await worker.fetch(request(path, method), bindings.env);
    assert.equal(response.status, 204, path);
  }
  assert.equal(bindings.batchedStatements.length, 8);
});
