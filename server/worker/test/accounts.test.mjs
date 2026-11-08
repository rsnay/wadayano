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

function accountDatabase() {
  const instructors = new Map();
  const resetTokens = new Map();

  function apply(sql, values) {
    if (sql.includes('INSERT INTO "Instructor"')) {
      const [id, email, password, createdAt, updatedAt] = values;
      if ([...instructors.values()].some(instructor => instructor.email === email)) {
        throw new Error('UNIQUE constraint failed: Instructor.email');
      }
      instructors.set(id, { id, email, password, createdAt, updatedAt });
      return { meta: { changes: 1 } };
    }
    if (sql.includes('INSERT INTO "InstructorPasswordResetToken"')) {
      const [id, createdAt, updatedAt, instructorId] = values;
      resetTokens.set(id, { id, createdAt, updatedAt, instructorId });
      return { meta: { changes: 1 } };
    }
    if (sql.includes('UPDATE "Instructor"')) {
      const instructorId = sql.includes('InstructorPasswordResetToken')
        ? values[2]
        : values.at(-1);
      const instructor = instructors.get(instructorId);
      if (!instructor) return { meta: { changes: 0 } };
      instructor.password = values[0];
      instructor.updatedAt = values[1];
      return { meta: { changes: 1 } };
    }
    if (sql.includes('DELETE FROM "InstructorPasswordResetToken"')) {
      return { meta: { changes: Number(resetTokens.delete(values[0])) } };
    }
    return { meta: { changes: 0 } };
  }

  return {
    instructors,
    resetTokens,
    prepare(sql) {
      return {
        bind(...values) {
          return {
            sql,
            values,
            async first() {
              if (sql.includes('FROM "InstructorPasswordResetToken"')) {
                return resetTokens.get(values[0]) ?? null;
              }
              if (sql.includes('FROM "Instructor"')) {
                const email = values[0]?.toLowerCase();
                return [...instructors.values()].find(record => record.email === email) ?? null;
              }
              return null;
            },
            async run() {
              return apply(sql, values);
            },
          };
        },
      };
    },
    async batch(statements) {
      return statements.map(statement => apply(statement.sql, statement.values));
    },
  };
}

function accountEnvironment(db) {
  return {
    APP_SECRET: appSecret,
    PUBLIC_BASE_URL: 'https://example.test',
    AWS_SES_REGION: 'us-west-2',
    AWS_SES_KEY: 'test-key',
    AWS_SES_SECRET: 'test-secret',
    AWS_SES_FROM_ADDRESS: 'no-reply@example.test',
    SES_FETCH: async () => new Response(null, { status: 200 }),
    DB: db,
    ASSETS: { fetch: async () => new Response('asset') },
  };
}

function jsonRequest(path, body) {
  return new Request(`https://example.test${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('Worker signup and login use PBKDF2 passwords and issue authenticated sessions', async () => {
  const db = accountDatabase();
  const env = accountEnvironment(db);

  const signup = await worker.fetch(
    jsonRequest('/api/auth/signup', { email: 'Teacher@example.test', password: 'secure-pass' }),
    env,
  );
  assert.equal(signup.status, 201);
  const signupResult = await signup.json();
  const instructor = [...db.instructors.values()][0];
  assert.equal(instructor.email, 'teacher@example.test');
  assert.match(instructor.password, /^pbkdf2-sha256\$600000\$/);
  assert.equal(typeof signupResult.token, 'string');

  const login = await worker.fetch(
    jsonRequest('/api/auth/login', { email: 'teacher@example.test', password: 'secure-pass' }),
    env,
  );
  assert.equal(login.status, 200);
  assert.equal(typeof (await login.json()).token, 'string');

  const invalidLogin = await worker.fetch(
    jsonRequest('/api/auth/login', { email: 'teacher@example.test', password: 'wrong-pass' }),
    env,
  );
  assert.equal(invalidLogin.status, 401);
});

test('unexpected signup failures log a diagnostic while keeping the response generic', async () => {
  const db = accountDatabase();
  db.batch = async () => {
    throw new Error('D1 mock failure');
  };
  const originalError = console.error;
  const loggedErrors = [];
  console.error = (...args) => loggedErrors.push(args);

  try {
    const response = await worker.fetch(
      jsonRequest('/api/auth/signup', { email: 'Teacher@example.test', password: 'secure-pass' }),
      accountEnvironment(db),
    );
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'request_failed' });
    assert.deepEqual(loggedErrors, [['signup API failed: Error: D1 mock failure']]);
  } finally {
    console.error = originalError;
  }
});

test('legacy bcrypt accounts must use the email reset flow before Worker login', async () => {
  const db = accountDatabase();
  db.instructors.set('legacy-instructor', {
    id: 'legacy-instructor',
    email: 'legacy@example.test',
    password: '$2b$10$legacy-hash',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  const env = accountEnvironment(db);

  const login = await worker.fetch(
    jsonRequest('/api/auth/login', { email: 'legacy@example.test', password: 'legacy-pass' }),
    env,
  );
  assert.equal(login.status, 409);
  assert.deepEqual(await login.json(), { error: 'password_reset_required' });

  const request = await worker.fetch(
    jsonRequest('/api/auth/password-reset-requests', { email: 'legacy@example.test' }),
    env,
  );
  assert.equal(request.status, 200);
  assert.deepEqual(await request.json(), { sent: true });
  const [resetToken] = db.resetTokens.keys();

  const reset = await worker.fetch(
    jsonRequest('/api/auth/password-resets', { token: resetToken, password: 'new-secure-pass' }),
    env,
  );
  assert.equal(reset.status, 200);
  assert.equal(typeof (await reset.json()).token, 'string');
  assert.equal(db.resetTokens.has(resetToken), false);

  const loginAfterReset = await worker.fetch(
    jsonRequest('/api/auth/login', { email: 'legacy@example.test', password: 'new-secure-pass' }),
    env,
  );
  assert.equal(loginAfterReset.status, 200);

  const reusedReset = await worker.fetch(
    jsonRequest('/api/auth/password-resets', { token: resetToken, password: 'another-pass' }),
    env,
  );
  assert.equal(reusedReset.status, 400);
});

test('password reset rejects expired, invalid, and future token timestamps without changing account data', async () => {
  const db = accountDatabase();
  const createdAt = new Date().toISOString();
  db.instructors.set('instructor-1', {
    id: 'instructor-1',
    email: 'teacher@example.test',
    password: 'existing-hash',
    createdAt,
    updatedAt: createdAt,
  });
  db.resetTokens.set('invalid-date', {
    id: 'invalid-date',
    createdAt: 'not-a-date',
    updatedAt: createdAt,
    instructorId: 'instructor-1',
  });
  db.resetTokens.set('expired-date', {
    id: 'expired-date',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000 - 1).toISOString(),
    updatedAt: createdAt,
    instructorId: 'instructor-1',
  });
  db.resetTokens.set('future-date', {
    id: 'future-date',
    createdAt: new Date(Date.now() + 60_000).toISOString(),
    updatedAt: createdAt,
    instructorId: 'instructor-1',
  });
  const env = accountEnvironment(db);

  for (const resetToken of ['expired-date', 'invalid-date', 'future-date']) {
    const response = await worker.fetch(
      jsonRequest('/api/auth/password-resets', {
        token: resetToken,
        password: 'new-secure-pass',
      }),
      env,
    );
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'invalid_or_expired_reset_token' });
    assert.equal(db.resetTokens.has(resetToken), true);
    assert.equal(db.instructors.get('instructor-1').password, 'existing-hash');
  }
});
