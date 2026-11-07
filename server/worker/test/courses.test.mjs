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

function createEnvironment({
  instructor = { id: 'instructor-1', email: 'teacher@example.test', createdAt: '2026-01-01T00:00:00.000Z' },
  studentRecord = { id: 'student-1', name: 'Test Student' },
  studentCourses = [{ id: 'course-1', title: 'Course One' }],
  studentDashboardCourse = {
    id: 'course-1',
    title: 'Course One',
    lmsUrl: null,
    consentFormUrl: null,
  },
  studentConsentCourse = {
    id: 'course-1',
    title: 'Course One',
    consentFormUrl: 'https://consent.example.test',
    consent: null,
  },
  studentPracticeQuizzes = [],
  studentDashboardAttempts = [],
  studentDashboardQuestionAttempts = [],
  studentDashboardConfidences = [],
  studentQuizRecord = {
    id: 'quiz-1',
    title: 'Practice Quiz',
    type: 'PRACTICE',
    courseId: 'course-1',
  },
  activeStudentQuizAttempt = null,
  studentRateAttempt = { quizId: 'quiz-1' },
  studentConceptQuestionCounts = [
    { concept: 'Algebra', questionCount: 2 },
    { concept: 'Geometry', questionCount: 3 },
  ],
  studentQuizQuestionRows = [
    {
      id: 'question-1',
      concept: 'Algebra',
      prompt: 'Question one?',
      type: 'MULTIPLE_CHOICE',
      optionId: 'option-1',
      optionText: 'Answer one',
    },
    {
      id: 'question-1',
      concept: 'Algebra',
      prompt: 'Question one?',
      type: 'MULTIPLE_CHOICE',
      optionId: 'option-2',
      optionText: 'Answer two',
    },
  ],
  studentQuizQuestionAttempts = [],
  studentQuizConceptConfidences = [],
  createAttemptChanges = 1,
  studentCompletionAttempt = {
    quizId: 'quiz-1',
    ltiSessionInfo: null,
    questionCount: 2,
    correctCount: 1,
    courseId: 'course-1',
    ltiSecret: 'course-secret',
  },
  completedAttemptRecord = {
    completed: '2026-01-05T00:00:00.000Z',
    score: 0.5,
    postSucceeded: null,
  },
  completeAttemptChanges = 1,
  studentAttemptId = 'attempt-1',
  studentAttemptQuestion = null,
  studentQuestionAttemptExists = false,
  studentQuestionAttemptRecord = {
    id: 'question-attempt-1',
    questionId: 'question-1',
    shortAnswer: null,
    correctShortAnswer: null,
    isCorrect: 1,
    isConfident: 1,
    concept: 'Algebra',
    prompt: '<p>Question?</p>',
    type: 'MULTIPLE_CHOICE',
    selectedOptionId: 'option-1',
    selectedOptionText: 'Answer',
    correctOptionId: 'option-1',
    correctOptionText: 'Answer',
  },
  courses = [],
  courseRecord = {
    id: 'course-1',
    title: 'Course One',
    number: null,
    lmsUrl: null,
    consentFormUrl: null,
    ltiSecret: 'course-secret',
    survey: null,
    studentCount: 3,
  },
  quizRecord = {
    id: 'quiz-1',
    title: 'Quiz One',
    type: 'GRADED',
    courseId: 'course-1',
    courseTitle: 'Course One',
    ltiSecret: 'course-secret',
  },
  questionRecord = {
    id: 'question-1',
    concept: 'Algebra',
    prompt: '<p>Question?</p>',
    type: 'MULTIPLE_CHOICE',
    correctShortAnswers: '[]',
  },
  quizReviewAttempt = {
    id: 'attempt-1',
    studentId: 'student-1',
    quizId: 'quiz-1',
    quizTitle: 'Quiz One',
    quizType: 'GRADED',
    courseId: 'course-1',
    completed: '2026-01-04T00:00:00.000Z',
    score: 1,
    postSucceeded: 1,
  },
  quizReviewQuestions = [{
    id: 'question-1',
    concept: 'Algebra',
    prompt: '<p>Question?</p>',
    type: 'MULTIPLE_CHOICE',
  }],
  quizReviewQuestionAttempts = [{
    id: 'question-attempt-1',
    questionId: 'question-1',
    shortAnswer: null,
    correctShortAnswer: null,
    isCorrect: 1,
    isConfident: 1,
    concept: 'Algebra',
    prompt: '<p>Question?</p>',
    type: 'MULTIPLE_CHOICE',
    selectedOptionId: 'option-1',
    selectedOptionText: '<p>Answer</p>',
    correctOptionId: 'option-1',
    correctOptionText: '<p>Answer</p>',
  }],
  quizReviewOptions = [
    { id: 'option-1', questionId: 'question-1', text: '<p>Answer</p>' },
    { id: 'option-2', questionId: 'question-1', text: '<p>Other</p>' },
  ],
  quizReviewConfidences = [{ id: 'confidence-1', concept: 'Algebra', confidence: 1 }],
  quizImportRows = [
    {
      quizId: 'quiz-1',
      quizTitle: 'Quiz One',
      quizType: 'GRADED',
      questionId: 'question-1',
      prompt: 'Question one?',
    },
    {
      quizId: 'quiz-2',
      quizTitle: 'Quiz Two',
      quizType: 'PRACTICE',
      questionId: 'question-2',
      prompt: 'Question two?',
    },
    {
      quizId: 'quiz-3',
      quizTitle: 'Empty Quiz',
      quizType: 'PRACTICE',
      questionId: null,
      prompt: null,
    },
  ],
  importQuestionRows = [{
    id: 'question-2',
    prompt: '<p>Imported question?</p>',
    concept: 'Algebra',
    type: 'MULTIPLE_CHOICE',
    correctShortAnswers: '[]',
  }],
  importOptionRows = [
    { questionId: 'question-2', text: 'Correct', isCorrect: 1 },
    { questionId: 'question-2', text: 'Incorrect', isCorrect: 0 },
  ],
  questionQuizId = 'quiz-1',
  questionOptions = [
    { id: 'option-1', text: 'Answer', isCorrect: 1 },
    { id: 'option-2', text: 'Other', isCorrect: 0 },
  ],
  quizQuestions = [{ id: 'question-1', prompt: 'Question one?' }],
  quizAttemptCount = 2,
  studentSurveyCourse = {
    id: 'course-1',
    title: 'Course One',
    survey: { questions: [{ index: 1, prompt: 'Question?', options: [{ index: 1, text: 'Yes' }] }] },
  },
  studentId = 'student-1',
  studentEnrolled = true,
  courseOwnerId = 'instructor-1',
  courseInstructorCount = 2,
  ltiFetch = async () => new Response(
    '<imsx_POXEnvelopeResponse><imsx_POXHeader><imsx_POXResponseHeaderInfo><imsx_statusInfo><imsx_codeMajor>success</imsx_codeMajor></imsx_statusInfo></imsx_POXResponseHeaderInfo></imsx_POXHeader></imsx_POXEnvelopeResponse>',
  ),
  removableInstructor = { id: 'instructor-2' },
  inviteDeleteChanges = 0,
  removeInstructorChanges = 1,
  surveyUpdateChanges = 1,
  updateQuizChanges = 1,
  surveyResultRows = [],
  courseConceptRows = [{ concept: 'Algebra' }, { concept: 'Biology' }],
  courseQuizzes = [],
  courseInstructors = [{ id: 'instructor-1', email: 'teacher@example.test' }],
  pendingInvites = [],
  batchError,
  batchResults,
  updateChanges = 1,
  insertChanges = 1,
} = {}) {
  const queries = [];
  let statements = [];
  let batchCalls = 0;

  return {
    env: {
      APP_SECRET: appSecret,
      LTI_FETCH: ltiFetch,
      DB: {
        prepare(sql) {
          return {
            bind(...values) {
              const statement = { sql, values };
              return {
                ...statement,
                async first() {
                  queries.push(statement);
                  if (sql.includes('AS "consent"') && sql.includes('FROM "Course" c')) {
                    return values[2] === studentId && studentEnrolled
                      ? studentConsentCourse
                      : null;
                  }
                  if (sql.includes('SELECT 1') && sql.includes('FROM "CourseStudent"')) {
                    return values[1] === studentId && studentEnrolled ? { 1: 1 } : null;
                  }
                  if (sql.includes('FROM "QuizAttempt" attempt')) {
                    return values[0] === quizReviewAttempt.id ? quizReviewAttempt : null;
                  }
                  if (sql.includes('FROM "QuizAttempt" studentAttempt')) {
                    return values[1] === studentId ? studentRateAttempt : null;
                  }
                  if (sql.includes('FROM "QuizAttempt" quizAttempt')) {
                    return values[1] === studentId ? studentCompletionAttempt : null;
                  }
                  if (sql.includes('SELECT "completed", "score", "postSucceeded"')
                    && sql.includes('FROM "QuizAttempt"')) {
                    return values[1] === studentId ? completedAttemptRecord : null;
                  }
                  if (sql.includes('FROM "QuizAttempt" ownedAttempt')
                    && sql.includes('JOIN "QuizQuestion" qq')) {
                    return values[0] === studentAttemptId
                      && values[1] === studentId
                      && values[2] === questionRecord.id
                      && studentEnrolled
                      ? { ...(studentAttemptQuestion ?? questionRecord), id: values[2] }
                      : null;
                  }
                  if (sql.includes('FROM "QuizQuestionAttempt" link')
                    && sql.includes('questionAttempt."questionId"')) {
                    return (studentQuestionAttemptExists || batchCalls > 0)
                      && values[0] === studentAttemptId
                      && values[1] === (studentAttemptQuestion?.id ?? questionRecord.id)
                      ? studentQuestionAttemptRecord
                      : null;
                  }
                  if (sql.includes('AS "ownsCourse"')) {
                    return values[0] === courseOwnerId && values[1] === quizReviewAttempt.courseId
                      ? { ownsCourse: 1 }
                      : null;
                  }
                  if (sql.includes('FROM "Quiz" q')
                    && sql.includes('JOIN "CourseStudent" cs')) {
                    return values[1] === studentId && studentEnrolled ? studentQuizRecord : null;
                  }
                  if (sql.includes('FROM "QuizAttempt"')
                    && sql.includes('"completed" IS NULL')) {
                    return values[1] === studentId ? activeStudentQuizAttempt : null;
                  }
                  if (sql.includes('c."consentFormUrl"')
                    && sql.includes('JOIN "CourseStudent" cs')) {
                    return values[1] === studentId && studentEnrolled
                      ? studentDashboardCourse
                      : null;
                  }
                  if (sql.includes('JOIN "CourseStudent" cs')) {
                    return values[1] === studentId && studentEnrolled ? studentSurveyCourse : null;
                  }
                  if (sql.includes('FROM "Student" WHERE')) {
                    return values[0] === studentId ? studentRecord : null;
                  }
                  if (sql.includes('FROM "Quiz" q')) {
                    return values[1] === courseOwnerId ? quizRecord : null;
                  }
                  if (sql.includes('FROM "Question" q')) {
                    return values[1] === questionQuizId && values[2] === courseOwnerId
                      ? questionRecord
                      : null;
                  }
                  if (sql.includes('AS "attemptCount"')) {
                    return { attemptCount: quizAttemptCount };
                  }
                  if (sql.includes('FROM "Course" c')) {
                    return values[1] === courseOwnerId ? courseRecord : null;
                  }
                  if (sql.includes('AS "instructorCount"')) {
                    return { instructorCount: courseInstructorCount };
                  }
                  if (sql.includes('SELECT 1') && sql.includes('FROM "CourseInstructor"')) {
                    return values[1] === courseOwnerId ? { 1: 1 } : null;
                  }
                  if (sql.includes('JOIN "Instructor" i')) {
                    return removableInstructor;
                  }
                  return instructor;
                },
                async all() {
                  queries.push(statement);
                  if (sql.includes('GROUP BY question."concept"')) {
                    return { results: studentConceptQuestionCounts };
                  }
                  if (sql.includes('FROM "QuizQuestion" qq') && sql.includes('AS "optionId"')) {
                    return { results: studentQuizQuestionRows };
                  }
                  if (sql.includes('FROM "QuizQuestionAttempt" link')) {
                    return { results: studentQuizQuestionAttempts };
                  }
                  if (sql.includes('FROM "QuizConceptConfidence" link')) {
                    return { results: studentQuizConceptConfidences };
                  }
                  if (sql.includes('FROM "Quiz" sourceQuiz')) {
                    return { results: quizImportRows };
                  }
                  if (sql.includes('FROM "Question" q')
                    && sql.includes('JOIN "QuizQuestion" qq')) {
                    return { results: importQuestionRows };
                  }
                  if (sql.includes('FROM "Option" sourceOption')) {
                    return { results: importOptionRows };
                  }
                  if (sql.includes('FROM "QuizQuestion" qq') && sql.includes('q."concept"')) {
                    return { results: quizReviewQuestions };
                  }
                  if (sql.includes('FROM "Option" option') && sql.includes('"questionId" IN')) {
                    return { results: quizReviewOptions };
                  }
                  if (sql.includes('JOIN "QuestionAttempt" questionAttempt')) {
                    return { results: quizReviewQuestionAttempts };
                  }
                  if (sql.includes('JOIN "ConceptConfidence" confidence')) {
                    return { results: quizReviewConfidences };
                  }
                  if (sql.includes('FROM "QuizAttempt" qa')) {
                    return { results: studentDashboardAttempts };
                  }
                  if (sql.includes('FROM "QuizQuestionAttempt" qqa')) {
                    return { results: studentDashboardQuestionAttempts };
                  }
                  if (sql.includes('FROM "QuizConceptConfidence" qcc')) {
                    return { results: studentDashboardConfidences };
                  }
                  if (sql.includes('AS "questionCount"') && sql.includes('FROM "Quiz" q')) {
                    return { results: studentPracticeQuizzes };
                  }
                  if (sql.includes('JOIN "SurveyResult" sr')) {
                    return { results: surveyResultRows };
                  }
                  if (sql.includes('SELECT c."id", c."title"')
                    && sql.includes('FROM "CourseStudent" cs')) {
                    return { results: studentCourses };
                  }
                  if (sql.includes('FROM "Quiz" quiz')) {
                    return { results: courseConceptRows };
                  }
                  if (sql.includes('FROM "QuizQuestion" qq')) {
                    return { results: quizQuestions };
                  }
                  if (sql.includes('FROM "Option"')) {
                    return {
                      results: sql.includes('"isCorrect"')
                        ? questionOptions
                        : questionOptions.map(({ id, text }) => ({ id, text })),
                    };
                  }
                  if (sql.includes('FROM "Quiz"')) {
                    return { results: courseQuizzes };
                  }
                  if (sql.includes('JOIN "Instructor" i')) {
                    return { results: courseInstructors };
                  }
                  if (sql.includes('FROM "PendingCourseInvite"')) {
                    return { results: pendingInvites };
                  }
                  return { results: courses };
                },
                async run() {
                  queries.push(statement);
                  let changes = insertChanges;
                  if (sql.trimStart().startsWith('UPDATE "Course"')) {
                    changes = sql.includes('"survey"') ? surveyUpdateChanges : updateChanges;
                  } else if (sql.trimStart().startsWith('UPDATE "Quiz"')) {
                    changes = updateQuizChanges;
                  } else if (sql.trimStart().startsWith('UPDATE "QuizAttempt"')) {
                    changes = completeAttemptChanges;
                  } else if (sql.trimStart().startsWith('INSERT INTO "QuizAttempt"')) {
                    changes = createAttemptChanges;
                  } else if (sql.trimStart().startsWith('DELETE FROM "PendingCourseInvite"')) {
                    changes = inviteDeleteChanges;
                  } else if (sql.trimStart().startsWith('DELETE FROM "CourseInstructor"')) {
                    changes = removeInstructorChanges;
                  }
                  return { meta: { changes } };
                },
              };
            },
          };
        },
        async batch(input) {
          batchCalls += 1;
          statements = input;
          if (batchError) throw batchError;
          return batchResults ?? input.map(() => ({ meta: { changes: 1 } }));
        },
      },
    },
    get queries() {
      return queries;
    },
    get statements() {
      return statements;
    },
    get batchCalls() {
      return batchCalls;
    },
  };
}

function apiRequest(path, { method = 'GET', body, user = { userId: 'instructor-1', isInstructor: true } } = {}) {
  return new Request(`https://example.test${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token(user)}`,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

test('instructor endpoint returns only the authenticated instructor course summaries', async () => {
  const bindings = createEnvironment({
    courses: [
      { id: 'course-1', title: 'Course One', quizCount: 2, studentCount: 5 },
      { id: 'course-2', title: 'Course Two', quizCount: 0, studentCount: 0 },
    ],
  });
  const response = await worker.fetch(apiRequest('/api/instructor'), bindings.env);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), {
    id: 'instructor-1',
    email: 'teacher@example.test',
    createdAt: '2026-01-01T00:00:00.000Z',
    courses: [
      { id: 'course-1', title: 'Course One', quizCount: 2, studentCount: 5 },
      { id: 'course-2', title: 'Course Two', quizCount: 0, studentCount: 0 },
    ],
  });
  assert.equal(bindings.queries.length, 2);
  assert.match(bindings.queries[1].sql, /COUNT\(DISTINCT q\."id"\)/);
});

test('instructor endpoint denies student tokens before querying D1', async () => {
  const bindings = createEnvironment();
  const response = await worker.fetch(
    apiRequest('/api/instructor', { user: { userId: 'student-1', isInstructor: false } }),
    bindings.env,
  );

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: 'forbidden' });
  assert.equal(bindings.queries.length, 0);
});

test('student endpoint returns only the authenticated student and enrolled courses', async () => {
  const bindings = createEnvironment();
  const response = await worker.fetch(
    apiRequest('/api/student', { user: { userId: 'student-1', isInstructor: false } }),
    bindings.env,
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    id: 'student-1',
    name: 'Test Student',
    courses: [{ id: 'course-1', title: 'Course One' }],
  });
  assert.equal(bindings.queries.length, 2);

  const roleDenied = await worker.fetch(apiRequest('/api/student'), bindings.env);
  assert.equal(roleDenied.status, 403);

  const missingStudent = createEnvironment({ studentRecord: null });
  const missing = await worker.fetch(
    apiRequest('/api/student', { user: { userId: 'student-1', isInstructor: false } }),
    missingStudent.env,
  );
  assert.equal(missing.status, 401);
});

test('student starts or resumes an enrolled practice quiz without exposing answer keys', async () => {
  const bindings = createEnvironment();
  const response = await worker.fetch(
    apiRequest('/api/student/quizzes/quiz-1/attempt', {
      method: 'POST',
      user: { userId: 'student-1', isInstructor: false },
    }),
    bindings.env,
  );
  assert.equal(response.status, 200);
  const { quizAttempt } = await response.json();
  assert.match(quizAttempt.id, /^[0-9a-f-]{36}$/);
  assert.equal(quizAttempt.quiz.type, 'PRACTICE');
  assert.deepEqual(quizAttempt.quiz.questions, [{
    id: 'question-1',
    concept: 'Algebra',
    prompt: 'Question one?',
    type: 'MULTIPLE_CHOICE',
    options: [
      { id: 'option-1', text: 'Answer one' },
      { id: 'option-2', text: 'Answer two' },
    ],
  }]);
  assert.deepEqual(quizAttempt.questionAttempts, []);
  assert.deepEqual(quizAttempt.conceptConfidences, []);
  assert.equal(JSON.stringify(quizAttempt).includes('isCorrect'), false);
  assert.match(bindings.queries.find(query => query.sql.includes('INSERT INTO "QuizAttempt"')).sql, /NOT EXISTS/);

  const existing = createEnvironment({
    activeStudentQuizAttempt: {
      id: 'existing-attempt',
      completed: null,
      score: null,
      postSucceeded: null,
    },
    studentQuizQuestionAttempts: [{
      id: 'question-attempt-1',
      questionId: 'question-1',
    }],
    studentQuizConceptConfidences: [{
      id: 'confidence-1',
      concept: 'Algebra',
      confidence: 1,
    }],
  });
  const resumed = await worker.fetch(
    apiRequest('/api/student/quizzes/quiz-1/attempt', {
      method: 'POST',
      user: { userId: 'student-1', isInstructor: false },
    }),
    existing.env,
  );
  assert.equal(resumed.status, 200);
  const resumedAttempt = (await resumed.json()).quizAttempt;
  assert.equal(resumedAttempt.id, 'existing-attempt');
  assert.deepEqual(resumedAttempt.questionAttempts, [{
    id: 'question-attempt-1',
    question: { id: 'question-1' },
  }]);
  assert.deepEqual(resumedAttempt.conceptConfidences, [{
    id: 'confidence-1',
    concept: 'Algebra',
    confidence: 1,
  }]);
  assert.equal(existing.queries.some(query => query.sql.includes('INSERT INTO "QuizAttempt"')), false);
});

test('student cannot start a graded quiz without an LTI-created attempt or use an unowned enrollment', async () => {
  const graded = createEnvironment({
    studentQuizRecord: {
      id: 'quiz-1',
      title: 'Graded Quiz',
      type: 'GRADED',
      courseId: 'course-1',
    },
  });
  const gradedResponse = await worker.fetch(
    apiRequest('/api/student/quizzes/quiz-1/attempt', {
      method: 'POST',
      user: { userId: 'student-1', isInstructor: false },
    }),
    graded.env,
  );
  assert.equal(gradedResponse.status, 409);

  const notEnrolled = createEnvironment({ studentEnrolled: false });
  const denied = await worker.fetch(
    apiRequest('/api/student/quizzes/quiz-1/attempt', {
      method: 'POST',
      user: { userId: 'student-1', isInstructor: false },
    }),
    notEnrolled.env,
  );
  assert.equal(denied.status, 404);
});

test('student concept ratings require owned-attempt concepts and are atomically replaced', async () => {
  const bindings = createEnvironment();
  const response = await worker.fetch(
    apiRequest('/api/student/quiz-attempts/attempt-1/concept-confidences', {
      method: 'POST',
      body: {
        conceptConfidences: [
          { concept: 'Algebra', confidence: 1 },
          { concept: 'Geometry', confidence: 3 },
        ],
      },
      user: { userId: 'student-1', isInstructor: false },
    }),
    bindings.env,
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { saved: true });
  assert.equal(bindings.batchCalls, 1);
  assert.equal(bindings.statements.length, 6);
  assert.match(bindings.statements[0].sql, /DELETE FROM "ConceptConfidence"/);
  assert.match(bindings.statements[1].sql, /DELETE FROM "QuizConceptConfidence"/);
  assert.equal(bindings.statements.filter(statement =>
    statement.sql.includes('INSERT INTO "ConceptConfidence"')).length, 2);
  assert.equal(bindings.statements.filter(statement =>
    statement.sql.includes('INSERT INTO "QuizConceptConfidence"')).length, 2);

  const invalid = createEnvironment();
  const invalidResponse = await worker.fetch(
    apiRequest('/api/student/quiz-attempts/attempt-1/concept-confidences', {
      method: 'POST',
      body: {
        conceptConfidences: [
          { concept: 'Algebra', confidence: 3 },
          { concept: 'Geometry', confidence: 1 },
        ],
      },
      user: { userId: 'student-1', isInstructor: false },
    }),
    invalid.env,
  );
  assert.equal(invalidResponse.status, 400);
  assert.equal(invalid.batchCalls, 0);

  const otherStudent = createEnvironment({
    studentId: 'student-2',
    studentRateAttempt: null,
  });
  const denied = await worker.fetch(
    apiRequest('/api/student/quiz-attempts/attempt-1/concept-confidences', {
      method: 'POST',
      body: { conceptConfidences: [] },
      user: { userId: 'student-2', isInstructor: false },
    }),
    otherStudent.env,
  );
  assert.equal(denied.status, 404);
});

test('student answers are scored and linked atomically with question-attempt detail', async () => {
  const bindings = createEnvironment();
  const response = await worker.fetch(
    apiRequest('/api/student/quiz-attempts/attempt-1/questions', {
      method: 'POST',
      body: {
        questionId: 'question-1',
        optionId: 'option-1',
        shortAnswer: '',
        isConfident: true,
      },
      user: { userId: 'student-1', isInstructor: false },
    }),
    bindings.env,
  );
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    questionAttempt: {
      id: 'question-attempt-1',
      question: {
        id: 'question-1',
        concept: 'Algebra',
        prompt: '<p>Question?</p>',
        type: 'MULTIPLE_CHOICE',
        options: [
          { id: 'option-1', text: 'Answer' },
          { id: 'option-2', text: 'Other' },
        ],
      },
      option: { id: 'option-1', text: 'Answer' },
      correctOption: { id: 'option-1', text: 'Answer' },
      shortAnswer: null,
      correctShortAnswer: null,
      isCorrect: true,
      isConfident: true,
    },
  });
  assert.equal(bindings.batchCalls, 1);
  assert.equal(bindings.statements.length, 2);
  assert.match(bindings.statements[0].sql, /INSERT INTO "QuestionAttempt"/);
  assert.match(bindings.statements[1].sql, /INSERT INTO "QuizQuestionAttempt"/);

  const alreadyAnswered = createEnvironment({ studentQuestionAttemptExists: true });
  const duplicate = await worker.fetch(
    apiRequest('/api/student/quiz-attempts/attempt-1/questions', {
      method: 'POST',
      body: {
        questionId: 'question-1',
        optionId: 'option-2',
        shortAnswer: '',
        isConfident: false,
      },
      user: { userId: 'student-1', isInstructor: false },
    }),
    alreadyAnswered.env,
  );
  assert.equal(duplicate.status, 200);
  assert.equal((await duplicate.json()).questionAttempt.id, 'question-attempt-1');
  assert.equal(alreadyAnswered.batchCalls, 0);

  const otherStudent = createEnvironment();
  const denied = await worker.fetch(
    apiRequest('/api/student/quiz-attempts/attempt-1/questions', {
      method: 'POST',
      body: {
        questionId: 'question-1',
        optionId: 'option-1',
        shortAnswer: '',
        isConfident: true,
      },
      user: { userId: 'student-2', isInstructor: false },
    }),
    otherStudent.env,
  );
  assert.equal(denied.status, 404);
});

test('short-answer scoring preserves case/whitespace and decimal normalization semantics', async () => {
  const bindings = createEnvironment({
    studentAttemptQuestion: {
      id: 'question-1',
      concept: 'Algebra',
      prompt: 'Enter the decimal',
      type: 'SHORT_ANSWER',
      correctShortAnswers: '["0.14"]',
    },
    studentQuestionAttemptRecord: {
      id: 'short-question-attempt',
      questionId: 'question-1',
      shortAnswer: '.14',
      correctShortAnswer: '0.14',
      isCorrect: 1,
      isConfident: 0,
      concept: 'Algebra',
      prompt: 'Enter the decimal',
      type: 'SHORT_ANSWER',
      selectedOptionId: null,
      selectedOptionText: null,
      correctOptionId: null,
      correctOptionText: null,
    },
    questionOptions: [],
  });
  const response = await worker.fetch(
    apiRequest('/api/student/quiz-attempts/attempt-1/questions', {
      method: 'POST',
      body: {
        questionId: 'question-1',
        optionId: null,
        shortAnswer: ' .14 ',
        isConfident: false,
      },
      user: { userId: 'student-1', isInstructor: false },
    }),
    bindings.env,
  );
  assert.equal(response.status, 201);
  const questionAttempt = (await response.json()).questionAttempt;
  assert.equal(questionAttempt.isCorrect, true);
  assert.equal(questionAttempt.correctShortAnswer, '0.14');
  assert.equal(bindings.statements[0].values[3], ' .14 ');
  assert.equal(bindings.statements[0].values[4], true);
  assert.equal(bindings.statements[0].values[5], '0.14');
});

test('student quiz completion calculates a score and posts LTI grades through the Worker', async () => {
  const bindings = createEnvironment();
  const response = await worker.fetch(
    apiRequest('/api/student/quiz-attempts/attempt-1/complete', {
      method: 'POST',
      user: { userId: 'student-1', isInstructor: false },
    }),
    bindings.env,
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    isGraded: false,
    postSucceeded: null,
    error: null,
    quizAttempt: {
      id: 'attempt-1',
      completed: '2026-01-05T00:00:00.000Z',
      score: 0.5,
    },
  });
  assert.equal(bindings.queries.some(query => query.sql.includes('UPDATE "QuizAttempt"')), true);

  const lti = createEnvironment({
    studentCompletionAttempt: {
      quizId: 'quiz-1',
      ltiSessionInfo: JSON.stringify({
        lis_outcome_service_url: 'https://lms.example.test/outcome',
        lis_result_sourcedid: 'result-1',
      }),
      questionCount: 2,
      correctCount: 1,
      courseId: 'course-1',
      ltiSecret: 'course-secret',
    },
    completedAttemptRecord: {
      completed: '2026-01-05T00:00:00.000Z',
      score: 0.5,
      postSucceeded: 1,
    },
  });
  const ltiResponse = await worker.fetch(
    apiRequest('/api/student/quiz-attempts/attempt-1/complete', {
      method: 'POST',
      user: { userId: 'student-1', isInstructor: false },
    }),
    lti.env,
  );
  assert.equal(ltiResponse.status, 200);
  assert.deepEqual(await ltiResponse.json(), {
    isGraded: true,
    postSucceeded: true,
    error: null,
    quizAttempt: {
      id: 'attempt-1',
      completed: '2026-01-05T00:00:00.000Z',
      score: 0.5,
    },
  });
  assert.equal(lti.queries.some(query => query.sql.includes('UPDATE "QuizAttempt"')), true);

  const empty = createEnvironment({
    studentCompletionAttempt: {
      quizId: 'quiz-1',
      ltiSessionInfo: null,
      questionCount: 0,
      correctCount: 0,
      courseId: 'course-1',
      ltiSecret: 'course-secret',
    },
  });
  const emptyResponse = await worker.fetch(
    apiRequest('/api/student/quiz-attempts/attempt-1/complete', {
      method: 'POST',
      user: { userId: 'student-1', isInstructor: false },
    }),
    empty.env,
  );
  assert.equal(emptyResponse.status, 409);

  const otherStudent = createEnvironment({ studentCompletionAttempt: null });
  const denied = await worker.fetch(
    apiRequest('/api/student/quiz-attempts/attempt-1/complete', {
      method: 'POST',
      user: { userId: 'student-2', isInstructor: false },
    }),
    otherStudent.env,
  );
  assert.equal(denied.status, 404);
});

test('student course dashboard returns enrolled course, quizzes, and only the student attempts', async () => {
  const bindings = createEnvironment({
    studentDashboardCourse: {
      id: 'course-1',
      title: 'Course One',
      lmsUrl: 'https://lms.example.test',
      consentFormUrl: null,
    },
    studentPracticeQuizzes: [{ id: 'practice-1', title: 'Practice', questionCount: 3 }],
    studentDashboardAttempts: [{
      id: 'attempt-1',
      createdAt: '2026-01-03T00:00:00.000Z',
      completed: '2026-01-04T00:00:00.000Z',
      score: 0.75,
      quizId: 'practice-1',
      quizTitle: 'Practice',
      quizType: 'PRACTICE',
      questionCount: 2,
    }],
    studentDashboardQuestionAttempts: [{
      quizAttemptId: 'attempt-1',
      id: 'question-attempt-1',
      isCorrect: 1,
      isConfident: 1,
    }],
    studentDashboardConfidences: [{
      quizAttemptId: 'attempt-1',
      id: 'confidence-1',
      concept: 'Algebra',
      confidence: 1,
    }],
  });
  const response = await worker.fetch(
    apiRequest('/api/student/courses/course-1/dashboard', {
      user: { userId: 'student-1', isInstructor: false },
    }),
    bindings.env,
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    course: {
      id: 'course-1',
      title: 'Course One',
      lmsUrl: 'https://lms.example.test',
      consentFormUrl: null,
      quizzes: [{ id: 'practice-1', title: 'Practice', questionCount: 3 }],
    },
    quizAttempts: [{
      id: 'attempt-1',
      createdAt: '2026-01-03T00:00:00.000Z',
      completed: '2026-01-04T00:00:00.000Z',
      score: 0.75,
      quiz: {
        id: 'practice-1',
        title: 'Practice',
        type: 'PRACTICE',
        questionCount: 2,
      },
      questionAttempts: [{
        id: 'question-attempt-1',
        isCorrect: true,
        isConfident: true,
      }],
      conceptConfidences: [{
        id: 'confidence-1',
        concept: 'Algebra',
        confidence: 1,
      }],
    }],
  });

  const notEnrolled = createEnvironment({ studentEnrolled: false });
  const denied = await worker.fetch(
    apiRequest('/api/student/courses/course-1/dashboard', {
      user: { userId: 'student-1', isInstructor: false },
    }),
    notEnrolled.env,
  );
  assert.equal(denied.status, 404);
});

test('student course consent reads enrollment state and atomically replaces the saved choice', async () => {
  const bindings = createEnvironment({
    studentConsentCourse: {
      id: 'course-1',
      title: 'Course One',
      consentFormUrl: 'https://consent.example.test',
      consent: 'no',
    },
  });
  const readResponse = await worker.fetch(
    apiRequest('/api/student/courses/course-1/consent', {
      user: { userId: 'student-1', isInstructor: false },
    }),
    bindings.env,
  );
  assert.equal(readResponse.status, 200);
  assert.deepEqual(await readResponse.json(), {
    course: {
      id: 'course-1',
      title: 'Course One',
      consentFormUrl: 'https://consent.example.test',
    },
    consent: 'no',
  });

  const writeResponse = await worker.fetch(
    apiRequest('/api/student/courses/course-1/consent', {
      method: 'POST',
      body: { consent: 'yes' },
      user: { userId: 'student-1', isInstructor: false },
    }),
    bindings.env,
  );
  assert.equal(writeResponse.status, 200);
  assert.deepEqual(await writeResponse.json(), { saved: true });
  assert.equal(bindings.batchCalls, 1);
  assert.equal(bindings.statements.length, 2);
  assert.match(bindings.statements[0].sql, /DELETE FROM "CourseConsent"/);
  assert.match(bindings.statements[1].sql, /INSERT INTO "CourseConsent"/);

  const invalid = createEnvironment();
  const invalidResponse = await worker.fetch(
    apiRequest('/api/student/courses/course-1/consent', {
      method: 'POST',
      body: { consent: 'maybe' },
      user: { userId: 'student-1', isInstructor: false },
    }),
    invalid.env,
  );
  assert.equal(invalidResponse.status, 400);
  assert.equal(invalid.batchCalls, 0);

  const notEnrolled = createEnvironment({ studentEnrolled: false });
  const denied = await worker.fetch(
    apiRequest('/api/student/courses/course-1/consent', {
      user: { userId: 'student-1', isInstructor: false },
    }),
    notEnrolled.env,
  );
  assert.equal(denied.status, 404);
});

test('quiz attempt review is available only to its student or an owning instructor', async () => {
  const bindings = createEnvironment();
  const studentResponse = await worker.fetch(
    apiRequest('/api/quiz-attempts/attempt-1/review', {
      user: { userId: 'student-1', isInstructor: false },
    }),
    bindings.env,
  );
  assert.equal(studentResponse.status, 200);
  assert.deepEqual(await studentResponse.json(), {
    quizAttempt: {
      id: 'attempt-1',
      completed: '2026-01-04T00:00:00.000Z',
      score: 1,
      postSucceeded: true,
      quiz: {
        id: 'quiz-1',
        title: 'Quiz One',
        questions: [{
          id: 'question-1',
          concept: 'Algebra',
          prompt: '<p>Question?</p>',
          type: 'MULTIPLE_CHOICE',
          options: [
            { id: 'option-1', text: '<p>Answer</p>' },
            { id: 'option-2', text: '<p>Other</p>' },
          ],
        }],
      },
      questionAttempts: [{
        id: 'question-attempt-1',
        question: {
          id: 'question-1',
          concept: 'Algebra',
          prompt: '<p>Question?</p>',
          type: 'MULTIPLE_CHOICE',
          options: [
            { id: 'option-1', text: '<p>Answer</p>' },
            { id: 'option-2', text: '<p>Other</p>' },
          ],
        },
        option: { id: 'option-1', text: '<p>Answer</p>' },
        correctOption: { id: 'option-1', text: '<p>Answer</p>' },
        shortAnswer: null,
        correctShortAnswer: null,
        isCorrect: true,
        isConfident: true,
      }],
      conceptConfidences: [{ id: 'confidence-1', concept: 'Algebra', confidence: 1 }],
    },
  });

  const instructorResponse = await worker.fetch(
    apiRequest('/api/quiz-attempts/attempt-1/review'),
    bindings.env,
  );
  assert.equal(instructorResponse.status, 200);

  const otherStudent = await worker.fetch(
    apiRequest('/api/quiz-attempts/attempt-1/review', {
      user: { userId: 'student-2', isInstructor: false },
    }),
    bindings.env,
  );
  assert.equal(otherStudent.status, 404);

  const otherInstructor = createEnvironment({ courseOwnerId: 'instructor-2' });
  const unowned = await worker.fetch(
    apiRequest('/api/quiz-attempts/attempt-1/review'),
    otherInstructor.env,
  );
  assert.equal(unowned.status, 404);
});

test('course endpoint returns details, quiz summaries, and student count only to its instructor', async () => {
  const bindings = createEnvironment({
    courseQuizzes: [{ id: 'quiz-1', title: 'Quiz One', type: 'GRADED' }],
  });
  const response = await worker.fetch(apiRequest('/api/courses/course-1'), bindings.env);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    course: {
      id: 'course-1',
      title: 'Course One',
      number: null,
      lmsUrl: null,
      consentFormUrl: null,
      ltiSecret: 'course-secret',
      survey: null,
      studentCount: 3,
      quizzes: [{ id: 'quiz-1', title: 'Quiz One', type: 'GRADED' }],
      instructors: [{ id: 'instructor-1', email: 'teacher@example.test' }],
      pendingCourseInvites: [],
    },
  });
  assert.equal(bindings.queries.length, 4);
  assert.match(bindings.queries[0].sql, /ci\."instructorId" = \?/);

  const otherInstructor = createEnvironment({ courseOwnerId: 'owner-2' });
  const denied = await worker.fetch(apiRequest('/api/courses/course-1'), otherInstructor.env);
  assert.equal(denied.status, 404);
  assert.deepEqual(await denied.json(), { error: 'course_not_found' });
});

test('course concepts are returned only to an owning instructor', async () => {
  const bindings = createEnvironment({
    courseConceptRows: [{ concept: 'Algebra' }, { concept: 'Biology' }],
  });
  const response = await worker.fetch(apiRequest('/api/courses/course-1/concepts'), bindings.env);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { concepts: ['Algebra', 'Biology'] });
  assert.equal(bindings.queries.length, 2);

  const unowned = createEnvironment({ courseOwnerId: 'other-instructor' });
  const denied = await worker.fetch(
    apiRequest('/api/courses/course-1/concepts'),
    unowned.env,
  );
  assert.equal(denied.status, 404);
});

test('survey endpoint saves valid survey JSON only for an owning instructor', async () => {
  const survey = { questions: [{ index: 1, prompt: 'Question?', options: [{ index: 1, text: 'Answer' }] }] };
  const bindings = createEnvironment();
  const response = await worker.fetch(
    apiRequest('/api/courses/course-1/survey', { method: 'PUT', body: { survey } }),
    bindings.env,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { survey });
  assert.match(bindings.queries.at(-1).sql, /UPDATE "Course"/);
  assert.equal(bindings.queries.at(-1).values[0], JSON.stringify(survey));

  const unowned = createEnvironment({
    courseOwnerId: 'other-instructor',
    surveyUpdateChanges: 0,
  });
  const denied = await worker.fetch(
    apiRequest('/api/courses/course-1/survey', { method: 'PUT', body: { survey } }),
    unowned.env,
  );
  assert.equal(denied.status, 404);
});

test('survey endpoint rejects malformed survey data before writing', async () => {
  const bindings = createEnvironment();
  const response = await worker.fetch(
    apiRequest('/api/courses/course-1/survey', {
      method: 'PUT',
      body: { survey: { questions: [{ prompt: '', options: [] }] } },
    }),
    bindings.env,
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'invalid_survey' });
  assert.equal(bindings.queries.length, 0);
});

test('survey results endpoint returns enrolled students and their course survey answers', async () => {
  const survey = { questions: [{ index: 1, prompt: 'Question?', options: [{ index: 1, text: 'Yes' }] }] };
  const bindings = createEnvironment({
    courseRecord: { id: 'course-1', title: 'Course One', survey },
    surveyResultRows: [
      {
        studentId: 'student-1',
        studentName: 'First Student',
        surveyResultId: null,
        surveyResultCreatedAt: null,
        surveyResultAnswers: null,
      },
      {
        studentId: 'student-2',
        studentName: 'Second Student',
        surveyResultId: 'survey-result-1',
        surveyResultCreatedAt: '2026-01-02T00:00:00.000Z',
        surveyResultAnswers: '{"1":1}',
      },
    ],
  });
  const response = await worker.fetch(
    apiRequest('/api/courses/course-1/survey-results'),
    bindings.env,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    course: {
      id: 'course-1',
      title: 'Course One',
      survey,
      students: [
        { id: 'student-1', name: 'First Student', surveyResults: [] },
        {
          id: 'student-2',
          name: 'Second Student',
          surveyResults: [{
            createdAt: '2026-01-02T00:00:00.000Z',
            answers: { 1: 1 },
            course: { id: 'course-1' },
          }],
        },
      ],
    },
  });

  const unowned = createEnvironment({ courseOwnerId: 'other-instructor' });
  const denied = await worker.fetch(
    apiRequest('/api/courses/course-1/survey-results'),
    unowned.env,
  );
  assert.equal(denied.status, 404);
});

test('student survey endpoint returns only the enrolled student course survey', async () => {
  const bindings = createEnvironment();
  const response = await worker.fetch(
    apiRequest('/api/student/courses/course-1/survey', {
      user: { userId: 'student-1', isInstructor: false },
    }),
    bindings.env,
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    course: {
      id: 'course-1',
      title: 'Course One',
      survey: {
        questions: [{ index: 1, prompt: 'Question?', options: [{ index: 1, text: 'Yes' }] }],
      },
    },
  });

  const notEnrolled = createEnvironment({ studentEnrolled: false });
  const denied = await worker.fetch(
    apiRequest('/api/student/courses/course-1/survey', {
      user: { userId: 'student-1', isInstructor: false },
    }),
    notEnrolled.env,
  );
  assert.equal(denied.status, 404);
});

test('student survey submission validates answers and atomically replaces prior responses', async () => {
  const bindings = createEnvironment();
  const response = await worker.fetch(
    apiRequest('/api/student/courses/course-1/survey-results', {
      method: 'POST',
      body: { answers: { 1: 1 } },
      user: { userId: 'student-1', isInstructor: false },
    }),
    bindings.env,
  );
  const result = await response.json();

  assert.equal(response.status, 201);
  assert.match(result.id, /^[0-9a-f-]{36}$/i);
  assert.equal(bindings.batchCalls, 1);
  assert.equal(bindings.statements.length, 2);
  assert.match(bindings.statements[0].sql, /DELETE FROM "SurveyResult"/);
  assert.match(bindings.statements[1].sql, /INSERT INTO "SurveyResult"/);
  assert.equal(bindings.statements[1].values[1], '{"1":1}');

  const invalid = createEnvironment();
  const invalidResponse = await worker.fetch(
    apiRequest('/api/student/courses/course-1/survey-results', {
      method: 'POST',
      body: { answers: { 1: 4 } },
      user: { userId: 'student-1', isInstructor: false },
    }),
    invalid.env,
  );
  assert.equal(invalidResponse.status, 400);
  assert.deepEqual(await invalidResponse.json(), { error: 'invalid_survey_answers' });
  assert.equal(invalid.batchCalls, 0);

  const nonStudent = createEnvironment();
  const roleDenied = await worker.fetch(
    apiRequest('/api/student/courses/course-1/survey-results', {
      method: 'POST',
      body: { answers: { 1: 1 } },
    }),
    nonStudent.env,
  );
  assert.equal(roleDenied.status, 403);
});

test('instructor removal cancels a pending invite and removes course links', async () => {
  const inviteBindings = createEnvironment({ inviteDeleteChanges: 1 });
  const inviteResponse = await worker.fetch(
    apiRequest('/api/courses/course-1/instructors', {
      method: 'DELETE',
      body: { email: 'INVITED@example.test' },
    }),
    inviteBindings.env,
  );
  assert.deepEqual(await inviteResponse.json(), { message: 'Invite canceled' });
  assert.deepEqual(inviteBindings.queries[1].values, [
    'course-1',
    'invited@example.test',
    'course-1',
    'instructor-1',
  ]);

  const removeBindings = createEnvironment();
  const removeResponse = await worker.fetch(
    apiRequest('/api/courses/course-1/instructors', {
      method: 'DELETE',
      body: { email: 'other@example.test' },
    }),
    removeBindings.env,
  );
  assert.deepEqual(await removeResponse.json(), { message: 'Instructor removed' });
  assert.match(removeBindings.queries.at(-1).sql, /"instructorId" = \?/);
});

test('instructor removal enforces course ownership and prevents removing the last instructor', async () => {
  const unowned = createEnvironment({ courseOwnerId: 'other-instructor' });
  const denied = await worker.fetch(
    apiRequest('/api/courses/course-1/instructors', {
      method: 'DELETE',
      body: { email: 'other@example.test' },
    }),
    unowned.env,
  );
  assert.equal(denied.status, 404);

  const onlyInstructor = createEnvironment({
    courseInstructorCount: 1,
    removableInstructor: { id: 'instructor-1' },
    removeInstructorChanges: 0,
  });
  const response = await worker.fetch(
    apiRequest('/api/courses/course-1/instructors', {
      method: 'DELETE',
      body: { email: 'teacher@example.test' },
    }),
    onlyInstructor.env,
  );
  assert.match((await response.json()).message, /only instructor/);
});

test('course creation uses an atomic insert and links the course to its instructor', async () => {
  const bindings = createEnvironment();
  const response = await worker.fetch(
    apiRequest('/api/courses', { method: 'POST', body: { title: 'New course' } }),
    bindings.env,
  );
  const course = await response.json();

  assert.equal(response.status, 201);
  assert.match(course.id, /^[0-9a-f-]{36}$/i);
  assert.equal(bindings.batchCalls, 1);
  assert.equal(bindings.statements.length, 2);
  assert.match(bindings.statements[0].sql, /INSERT INTO "Course"/);
  assert.match(bindings.statements[1].sql, /INSERT INTO "CourseInstructor"/);
  assert.deepEqual(bindings.statements[1].values, [course.id, 'instructor-1']);
  assert.match(bindings.statements[0].values[2], /^[0-9a-f]{32}$/);
  assert.equal(JSON.stringify(course).includes(bindings.statements[0].values[2]), false);
});

test('course creation validates the title and requires an existing instructor', async () => {
  const invalidTitle = createEnvironment();
  const invalidResponse = await worker.fetch(
    apiRequest('/api/courses', { method: 'POST', body: { title: '   ' } }),
    invalidTitle.env,
  );
  assert.equal(invalidResponse.status, 400);
  assert.equal(invalidTitle.queries.length, 0);
  assert.equal(invalidTitle.batchCalls, 0);

  const missingInstructor = createEnvironment({ instructor: null });
  const missingResponse = await worker.fetch(
    apiRequest('/api/courses', { method: 'POST', body: { title: 'New course' } }),
    missingInstructor.env,
  );
  assert.equal(missingResponse.status, 401);
  assert.equal(missingInstructor.batchCalls, 0);
});

test('course creation reports batch failure without returning success', async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    const bindings = createEnvironment({ batchError: new Error('D1 batch failed') });
    const response = await worker.fetch(
      apiRequest('/api/courses', { method: 'POST', body: { title: 'New course' } }),
      bindings.env,
    );

    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'database_unavailable' });
  } finally {
    console.error = originalError;
  }
});

test('quiz metadata update accepts only safe fields for an owned quiz', async () => {
  const bindings = createEnvironment();
  const response = await worker.fetch(
    apiRequest('/api/quizzes/quiz-1', {
      method: 'PATCH',
      body: { title: 'Updated quiz', type: 'PRACTICE' },
    }),
    bindings.env,
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { id: 'quiz-1' });
  assert.deepEqual(bindings.queries[0].values.slice(0, 2), ['Updated quiz', 'PRACTICE']);
  assert.match(bindings.queries[0].sql, /"courseId" = "Quiz"\."courseId"/);

  const invalid = createEnvironment();
  const invalidResponse = await worker.fetch(
    apiRequest('/api/quizzes/quiz-1', {
      method: 'PATCH',
      body: { type: 'UNKNOWN', courseId: 'other-course' },
    }),
    invalid.env,
  );
  assert.equal(invalidResponse.status, 400);
  assert.equal(invalid.queries.length, 0);

  const unowned = createEnvironment({ updateQuizChanges: 0 });
  const denied = await worker.fetch(
    apiRequest('/api/quizzes/quiz-1', { method: 'PATCH', body: { title: 'Updated quiz' } }),
    unowned.env,
  );
  assert.equal(denied.status, 404);
});

test('quiz editor endpoint returns owned quiz metadata, question summaries, and attempt count', async () => {
  const bindings = createEnvironment();
  const response = await worker.fetch(apiRequest('/api/quizzes/quiz-1'), bindings.env);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    quiz: {
      id: 'quiz-1',
      title: 'Quiz One',
      type: 'GRADED',
      course: { id: 'course-1', title: 'Course One', ltiSecret: 'course-secret' },
      questions: [{ id: 'question-1', prompt: 'Question one?' }],
      quizAttemptCount: 2,
    },
  });
  assert.equal(bindings.queries.length, 3);

  const unowned = createEnvironment({ courseOwnerId: 'other-instructor' });
  const denied = await worker.fetch(apiRequest('/api/quizzes/quiz-1'), unowned.env);
  assert.equal(denied.status, 404);
});

test('quiz importer endpoint returns all source question summaries only for the owning instructor', async () => {
  const bindings = createEnvironment();
  const response = await worker.fetch(
    apiRequest('/api/quizzes/quiz-1/importable-questions'),
    bindings.env,
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    quiz: {
      id: 'quiz-1',
      title: 'Quiz One',
      course: {
        id: 'course-1',
        title: 'Course One',
        quizzes: [
          {
            id: 'quiz-1',
            title: 'Quiz One',
            type: 'GRADED',
            questions: [{ id: 'question-1', prompt: 'Question one?' }],
          },
          {
            id: 'quiz-2',
            title: 'Quiz Two',
            type: 'PRACTICE',
            questions: [{ id: 'question-2', prompt: 'Question two?' }],
          },
          {
            id: 'quiz-3',
            title: 'Empty Quiz',
            type: 'PRACTICE',
            questions: [],
          },
        ],
      },
    },
  });

  const unowned = createEnvironment({ courseOwnerId: 'instructor-2' });
  const denied = await worker.fetch(
    apiRequest('/api/quizzes/quiz-1/importable-questions'),
    unowned.env,
  );
  assert.equal(denied.status, 404);
});

test('quiz importer copies selected same-course questions and options atomically', async () => {
  const bindings = createEnvironment();
  const response = await worker.fetch(
    apiRequest('/api/quizzes/quiz-1/questions/import', {
      method: 'POST',
      body: { questionIds: ['question-2'] },
    }),
    bindings.env,
  );
  const imported = await response.json();

  assert.equal(response.status, 201);
  assert.equal(imported.questionIds.length, 1);
  assert.match(imported.questionIds[0], /^[0-9a-f-]{36}$/i);
  assert.equal(bindings.batchCalls, 1);
  assert.equal(bindings.statements.length, 4);
  assert.match(bindings.statements[0].sql, /INSERT INTO "Question"/);
  assert.equal(bindings.statements[0].values[1], '<p>Imported question?</p>');
  assert.deepEqual(bindings.statements.slice(1).map(statement => statement.sql.match(/INSERT INTO "(\w+)"/)?.[1]), [
    'QuizQuestion',
    'Option',
    'Option',
  ]);
  assert.equal(bindings.statements[1].values[0], 'quiz-1');
  assert.equal(bindings.statements[1].values[1], imported.questionIds[0]);
  assert.deepEqual(bindings.statements.slice(2).map(statement => statement.values[2]), [1, 0]);

  const invalid = createEnvironment();
  const invalidResponse = await worker.fetch(
    apiRequest('/api/quizzes/quiz-1/questions/import', {
      method: 'POST',
      body: { questionIds: ['question-2', 'question-2'] },
    }),
    invalid.env,
  );
  assert.equal(invalidResponse.status, 400);
  assert.equal(invalid.batchCalls, 0);

  const missingSource = createEnvironment({ importQuestionRows: [] });
  const missingResponse = await worker.fetch(
    apiRequest('/api/quizzes/quiz-1/questions/import', {
      method: 'POST',
      body: { questionIds: ['question-outside-course'] },
    }),
    missingSource.env,
  );
  assert.equal(missingResponse.status, 404);
  assert.equal(missingSource.batchCalls, 0);

  const unowned = createEnvironment({ courseOwnerId: 'other-instructor' });
  const denied = await worker.fetch(
    apiRequest('/api/quizzes/quiz-1/questions/import', {
      method: 'POST',
      body: { questionIds: ['question-2'] },
    }),
    unowned.env,
  );
  assert.equal(denied.status, 404);
  assert.equal(unowned.batchCalls, 0);
});

test('question creation sanitizes HTML and atomically creates the owned question and options', async () => {
  const bindings = createEnvironment();
  const response = await worker.fetch(
    apiRequest('/api/quizzes/quiz-1/questions', {
      method: 'POST',
      body: {
        question: {
          concept: 'Algebra',
          correctShortAnswers: [],
          options: [
            { id: '_newOption1', text: '<b onclick="run()">Correct</b>', isCorrect: true },
            { id: '_newOption2', text: 'Other', isCorrect: false },
          ],
          prompt: '<p onclick="run()" style="text-align:center;background-image:url(javascript:run())">Question<script>run()</script> <a href="javascript:run()">link</a></p>',
          type: 'MULTIPLE_CHOICE',
        },
      },
    }),
    bindings.env,
  );
  const { question } = await response.json();

  assert.equal(response.status, 201);
  assert.match(question.id, /^[0-9a-f-]{36}$/i);
  assert.equal(question.prompt.includes('script'), false);
  assert.equal(question.prompt.includes('onclick'), false);
  assert.equal(question.prompt.includes('javascript:'), false);
  assert.equal(question.prompt.includes('text-align:center'), true);
  assert.equal(question.prompt.includes('background-image'), false);
  assert.equal(question.options[0].text.includes('onclick'), false);
  assert.equal(question.options[0].isCorrect, true);
  assert.notEqual(question.options[0].id, '_newOption1');
  assert.equal(bindings.batchCalls, 1);
  assert.equal(bindings.statements.length, 4);
  assert.match(bindings.statements[0].sql, /INSERT INTO "Question"/);
  assert.match(bindings.statements[1].sql, /INSERT INTO "QuizQuestion"/);
  assert.equal(bindings.statements[0].values[1], question.prompt);

  const invalid = createEnvironment();
  const invalidResponse = await worker.fetch(
    apiRequest('/api/quizzes/quiz-1/questions', {
      method: 'POST',
      body: {
        question: {
          concept: 'Algebra',
          correctShortAnswers: [],
          options: [{ id: '_1', text: 'Only option', isCorrect: true }],
          prompt: 'Question?',
          type: 'MULTIPLE_CHOICE',
        },
      },
    }),
    invalid.env,
  );
  assert.equal(invalidResponse.status, 400);
  assert.equal(invalid.batchCalls, 0);
});

test('question updates require owned quiz membership and atomically update question fields and options', async () => {
  const bindings = createEnvironment();
  const response = await worker.fetch(
    apiRequest('/api/quizzes/quiz-1/questions/question-1', {
      method: 'PUT',
      body: {
        question: {
          concept: 'Geometry',
          correctShortAnswers: [],
          options: [
            { id: 'option-1', text: 'Updated answer', isCorrect: true },
            { id: 'option-2', text: 'Updated distractor', isCorrect: false },
          ],
          prompt: '<p>Updated prompt</p>',
          type: 'MULTIPLE_CHOICE',
        },
      },
    }),
    bindings.env,
  );
  const { question } = await response.json();
  assert.equal(response.status, 200);
  assert.equal(question.id, 'question-1');
  assert.equal(question.concept, 'Geometry');
  assert.equal(bindings.batchCalls, 1);
  assert.equal(bindings.statements.length, 3);
  assert.match(bindings.statements[0].sql, /UPDATE "Question"/);
  assert.ok(bindings.statements.slice(1).every(statement => statement.sql.includes('UPDATE "Option"')));

  const unowned = createEnvironment({ courseOwnerId: 'other-instructor' });
  const denied = await worker.fetch(
    apiRequest('/api/quizzes/quiz-1/questions/question-1', {
      method: 'PUT',
      body: {
        question: {
          concept: 'Geometry',
          correctShortAnswers: [],
          options: [
            { id: 'option-1', text: 'Updated answer', isCorrect: true },
            { id: 'option-2', text: 'Updated distractor', isCorrect: false },
          ],
          prompt: 'Updated prompt',
          type: 'MULTIPLE_CHOICE',
        },
      },
    }),
    unowned.env,
  );
  assert.equal(denied.status, 404);
  assert.equal(unowned.batchCalls, 0);
});

test('question editor endpoint returns answer keys only for an instructor owning its quiz', async () => {
  const bindings = createEnvironment();
  const response = await worker.fetch(
    apiRequest('/api/quizzes/quiz-1/questions/question-1'),
    bindings.env,
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    question: {
      id: 'question-1',
      concept: 'Algebra',
      prompt: '<p>Question?</p>',
      type: 'MULTIPLE_CHOICE',
      correctShortAnswers: [],
      options: [
        { id: 'option-1', text: 'Answer', isCorrect: true },
        { id: 'option-2', text: 'Other', isCorrect: false },
      ],
    },
  });

  const unowned = createEnvironment({ courseOwnerId: 'other-instructor' });
  const denied = await worker.fetch(
    apiRequest('/api/quizzes/quiz-1/questions/question-1'),
    unowned.env,
  );
  assert.equal(denied.status, 404);

  const unrelatedQuiz = createEnvironment({ questionQuizId: 'different-quiz' });
  const notLinked = await worker.fetch(
    apiRequest('/api/quizzes/quiz-1/questions/question-1'),
    unrelatedQuiz.env,
  );
  assert.equal(notLinked.status, 404);
});

test('quiz creation is limited to the owning instructor and initializes a graded quiz', async () => {
  const bindings = createEnvironment();
  const response = await worker.fetch(
    apiRequest('/api/courses/course-1/quizzes', { method: 'POST' }),
    bindings.env,
  );
  const quiz = await response.json();

  assert.equal(response.status, 201);
  assert.match(quiz.id, /^[0-9a-f-]{36}$/i);
  assert.equal(bindings.queries.length, 1);
  assert.match(bindings.queries[0].sql, /'Untitled Quiz', 'GRADED', '\[\]'/);
  assert.match(bindings.queries[0].sql, /ci\."instructorId" = \?/);
  assert.deepEqual(bindings.queries[0].values.slice(-2), ['course-1', 'instructor-1']);

  const notOwned = createEnvironment({ insertChanges: 0 });
  const denied = await worker.fetch(
    apiRequest('/api/courses/course-1/quizzes', { method: 'POST' }),
    notOwned.env,
  );
  assert.equal(denied.status, 404);
});

test('course update accepts only safe, owned course fields', async () => {
  const bindings = createEnvironment();
  const response = await worker.fetch(
    apiRequest('/api/courses/course-1', {
      method: 'PATCH',
      body: { title: 'Updated title', number: 'BIO 101', lmsUrl: '' },
    }),
    bindings.env,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { id: 'course-1' });
  assert.equal(bindings.queries.length, 1);
  assert.match(bindings.queries[0].sql, /"title" = \?, "number" = \?, "lmsUrl" = \?/);
  assert.match(bindings.queries[0].sql, /"instructorId" = \?/);
  assert.deepEqual(bindings.queries[0].values.slice(0, 3), ['Updated title', 'BIO 101', '']);
  assert.equal(bindings.queries[0].values.at(-1), 'instructor-1');
});

test('course update rejects privileged fields and does not update unowned courses', async () => {
  const privilegedField = createEnvironment();
  const invalidResponse = await worker.fetch(
    apiRequest('/api/courses/course-1', {
      method: 'PATCH',
      body: { ltiSecret: 'attacker-controlled' },
    }),
    privilegedField.env,
  );
  assert.equal(invalidResponse.status, 400);
  assert.equal(privilegedField.queries.length, 0);

  const unownedCourse = createEnvironment({ updateChanges: 0 });
  const missingResponse = await worker.fetch(
    apiRequest('/api/courses/course-1', {
      method: 'PATCH',
      body: { title: 'Updated title' },
    }),
    unownedCourse.env,
  );
  assert.equal(missingResponse.status, 404);
  assert.deepEqual(await missingResponse.json(), { error: 'course_not_found' });
});

test('course scores are limited to owned courses and include attempts in deterministic order', async () => {
  const statements = [];
  const quizzes = [{ id: 'quiz-1' }];
  const attempts = [
    {
      id: 'attempt-first',
      quizId: 'quiz-1',
      studentId: 'student-1',
      completed: '2026-01-01T00:00:00.000Z',
      score: 0.5,
    },
    {
      id: 'attempt-later',
      quizId: 'quiz-1',
      studentId: 'student-1',
      completed: '2026-01-02T00:00:00.000Z',
      score: 1,
    },
  ];
  const questionAttempts = [
    { quizAttemptId: 'attempt-first', isCorrect: 1, isConfident: 1 },
    { quizAttemptId: 'attempt-first', isCorrect: 0, isConfident: 1 },
    { quizAttemptId: 'attempt-later', isCorrect: 1, isConfident: 1 },
  ];
  const confidences = [
    { quizAttemptId: 'attempt-first', confidence: 1 },
    { quizAttemptId: 'attempt-first', confidence: 0 },
    { quizAttemptId: 'attempt-later', confidence: 2 },
  ];
  const bindings = {
    env: {
      APP_SECRET: appSecret,
      DB: {
        prepare(sql) {
          return {
            bind(...values) {
              const statement = { sql, values };
              statements.push(statement);
              return {
                async first() {
                  assert.match(sql, /FROM "CourseInstructor"/);
                  assert.deepEqual(values, ['course-1', 'instructor-1']);
                  return { 1: 1 };
                },
                async all() {
                  if (sql.includes('FROM "Quiz"')) return { results: quizzes };
                  if (sql.includes('FROM "QuizAttempt" attempt')) return { results: attempts };
                  if (sql.includes('FROM "QuizQuestionAttempt" link')) {
                    return { results: questionAttempts };
                  }
                  if (sql.includes('FROM "QuizConceptConfidence" link')) {
                    return { results: confidences };
                  }
                  throw new Error(`Unexpected report query: ${sql}`);
                },
              };
            },
          };
        },
      },
    },
  };
  const response = await worker.fetch(apiRequest('/api/courses/course-1/scores'), bindings.env);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    course: {
      quizzes: [{
        id: 'quiz-1',
        quizAttempts: [
          {
            id: 'attempt-first',
            student: { id: 'student-1' },
            completed: '2026-01-01T00:00:00.000Z',
            score: 0.5,
            questionAttempts: [
              { isCorrect: true, isConfident: true },
              { isCorrect: false, isConfident: true },
            ],
            conceptConfidences: [{ confidence: 1 }, { confidence: 0 }],
          },
          {
            id: 'attempt-later',
            student: { id: 'student-1' },
            completed: '2026-01-02T00:00:00.000Z',
            score: 1,
            questionAttempts: [{ isCorrect: true, isConfident: true }],
            conceptConfidences: [{ confidence: 2 }],
          },
        ],
      }],
    },
  });
  assert.equal(statements.length, 5);
  assert.match(statements[2].sql, /ORDER BY attempt\."createdAt", attempt\."id"/);
});

test('course score reads reject non-GET methods and hide unowned courses', async () => {
  const notGet = createEnvironment();
  const methodResponse = await worker.fetch(
    apiRequest('/api/courses/course-1/scores', { method: 'POST' }),
    notGet.env,
  );
  assert.equal(methodResponse.status, 405);
  assert.equal(methodResponse.headers.get('allow'), 'GET');
  assert.equal(notGet.queries.length, 0);

  const notOwned = createEnvironment({ courseOwnerId: 'another-instructor' });
  const missingResponse = await worker.fetch(
    apiRequest('/api/courses/course-1/scores'),
    notOwned.env,
  );
  assert.equal(missingResponse.status, 404);
  assert.deepEqual(await missingResponse.json(), { error: 'course_not_found' });
  assert.equal(notOwned.queries.length, 1);
});
