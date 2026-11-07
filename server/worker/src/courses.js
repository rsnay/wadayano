import sanitizeHtml from 'sanitize-html';
import { authenticateRequest, requireRole } from './auth.js';
import { HttpError, jsonResponse, readJsonBody } from './http.js';
import { postLtiGrade } from './lti.js';

const questionHtmlOptions = {
  allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img'],
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    '*': ['class', 'style'],
    a: [...(sanitizeHtml.defaults.allowedAttributes.a ?? []), 'rel'],
  },
  allowedStyles: {
    '*': {
      'background-color': [/^#[\da-f]{3,8}$/i, /^rgba?\([\d.,%\s]+\)$/i],
      color: [/^#[\da-f]{3,8}$/i, /^rgba?\([\d.,%\s]+\)$/i],
      'font-size': [/^\d+(?:\.\d+)?(?:px|pt|em|rem|%)$/i],
      'font-style': [/^(?:normal|italic|oblique)$/i],
      'font-weight': [/^(?:normal|bold|[1-9]00)$/i],
      height: [/^(?:auto|\d+(?:\.\d+)?(?:px|%))$/i],
      'text-align': [/^(?:left|right|center|justify)$/i],
      'text-decoration': [/^(?:none|underline|line-through|overline)$/i],
      'vertical-align': [/^(?:baseline|sub|super|top|middle|bottom)$/i],
      width: [/^(?:auto|\d+(?:\.\d+)?(?:px|%))$/i],
    },
  },
  allowedSchemesByTag: {
    img: ['http', 'https', 'data', 'cid'],
  },
};

function errorResponse(error, operation) {
  if (error instanceof HttpError) {
    return jsonResponse(
      { error: error.code },
      error.status,
      error.status === 405 ? { allow: operation === 'read' ? 'GET' : 'POST' } : {},
    );
  }
  console.error(`${operation} API failed`);
  return jsonResponse({ error: 'database_unavailable' }, 503);
}

export async function getCurrentInstructor(request, env) {
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'GET' });
  }

  try {
    const user = await requireRole(request, env, 'instructor');
    const instructor = await env.DB.prepare(
      'SELECT "id", "email", "createdAt" FROM "Instructor" WHERE "id" = ?',
    ).bind(user.userId).first();
    if (!instructor) {
      throw new HttpError(401, 'unauthorized');
    }

    const result = await env.DB.prepare(`
      SELECT
        c."id",
        c."title",
        COUNT(DISTINCT q."id") AS "quizCount",
        COUNT(DISTINCT cs."studentId") AS "studentCount"
      FROM "CourseInstructor" ci
      JOIN "Course" c ON c."id" = ci."courseId"
      LEFT JOIN "Quiz" q ON q."courseId" = c."id"
      LEFT JOIN "CourseStudent" cs ON cs."courseId" = c."id"
      WHERE ci."instructorId" = ?
      GROUP BY c."id", c."title", c."createdAt"
      ORDER BY c."createdAt", c."id"
    `).bind(user.userId).all();
    if (!Array.isArray(result.results)) {
      throw new Error('Unexpected D1 result');
    }

    return jsonResponse({
      ...instructor,
      courses: result.results.map(course => ({
        ...course,
        quizCount: Number(course.quizCount),
        studentCount: Number(course.studentCount),
      })),
    });
  } catch (error) {
    return errorResponse(error, 'read');
  }
}

export async function getCurrentStudent(request, env) {
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'GET' });
  }

  try {
    const user = await requireRole(request, env, 'student');
    const student = await env.DB.prepare(
      'SELECT "id", "name" FROM "Student" WHERE "id" = ?',
    ).bind(user.userId).first();
    if (!student) {
      throw new HttpError(401, 'unauthorized');
    }

    const result = await env.DB.prepare(`
      SELECT c."id", c."title"
      FROM "CourseStudent" cs
      JOIN "Course" c ON c."id" = cs."courseId"
      WHERE cs."studentId" = ?
      ORDER BY c."createdAt", c."id"
    `).bind(user.userId).all();
    if (!Array.isArray(result.results)) {
      throw new Error('Unexpected D1 result');
    }

    return jsonResponse({ ...student, courses: result.results });
  } catch (error) {
    return errorResponse(error, 'read');
  }
}

export async function getStudentCourseDashboard(request, env, courseId) {
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'GET' });
  }

  try {
    const user = await requireRole(request, env, 'student');
    const course = await env.DB.prepare(`
      SELECT c."id", c."title", c."lmsUrl", c."consentFormUrl"
      FROM "Course" c
      JOIN "CourseStudent" cs ON cs."courseId" = c."id"
      WHERE c."id" = ? AND cs."studentId" = ?
    `).bind(courseId, user.userId).first();
    if (!course) {
      throw new HttpError(404, 'course_not_found');
    }

    const quizzesResult = await env.DB.prepare(`
      SELECT
        q."id",
        q."title",
        (SELECT COUNT(*) FROM "QuizQuestion" qq WHERE qq."quizId" = q."id") AS "questionCount"
      FROM "Quiz" q
      WHERE q."courseId" = ? AND q."type" = 'PRACTICE'
      ORDER BY q."createdAt", q."id"
    `).bind(courseId).all();
    const attemptsResult = await env.DB.prepare(`
      SELECT
        qa."id",
        qa."createdAt",
        qa."completed",
        qa."score",
        q."id" AS "quizId",
        q."title" AS "quizTitle",
        q."type" AS "quizType",
        (SELECT COUNT(*) FROM "QuizQuestion" qq WHERE qq."quizId" = q."id") AS "questionCount"
      FROM "QuizAttempt" qa
      JOIN "Quiz" q ON q."id" = qa."quizId"
      WHERE qa."studentId" = ? AND q."courseId" = ?
      ORDER BY qa."completed" DESC, qa."createdAt" DESC, qa."id"
    `).bind(user.userId, courseId).all();
    const questionAttemptsResult = await env.DB.prepare(`
      SELECT qqa."quizAttemptId", qa."id", qa."isCorrect", qa."isConfident"
      FROM "QuizQuestionAttempt" qqa
      JOIN "QuizAttempt" attempt ON attempt."id" = qqa."quizAttemptId"
      JOIN "Quiz" q ON q."id" = attempt."quizId"
      JOIN "QuestionAttempt" qa ON qa."id" = qqa."questionAttemptId"
      WHERE attempt."studentId" = ? AND q."courseId" = ?
      ORDER BY qqa."quizAttemptId", qa."createdAt", qa."id"
    `).bind(user.userId, courseId).all();
    const confidencesResult = await env.DB.prepare(`
      SELECT qcc."quizAttemptId", cc."id", cc."concept", cc."confidence"
      FROM "QuizConceptConfidence" qcc
      JOIN "QuizAttempt" attempt ON attempt."id" = qcc."quizAttemptId"
      JOIN "Quiz" q ON q."id" = attempt."quizId"
      JOIN "ConceptConfidence" cc ON cc."id" = qcc."conceptConfidenceId"
      WHERE attempt."studentId" = ? AND q."courseId" = ?
      ORDER BY qcc."quizAttemptId", cc."createdAt", cc."id"
    `).bind(user.userId, courseId).all();
    if (!Array.isArray(quizzesResult.results) || !Array.isArray(attemptsResult.results)
      || !Array.isArray(questionAttemptsResult.results) || !Array.isArray(confidencesResult.results)) {
      throw new Error('Unexpected D1 result');
    }

    const quizAttempts = attemptsResult.results.map(attempt => ({
      id: attempt.id,
      createdAt: attempt.createdAt,
      completed: attempt.completed,
      score: attempt.score,
      quiz: {
        id: attempt.quizId,
        title: attempt.quizTitle,
        type: attempt.quizType,
        questionCount: Number(attempt.questionCount),
      },
      questionAttempts: [],
      conceptConfidences: [],
    }));
    const attemptById = new Map(quizAttempts.map(attempt => [attempt.id, attempt]));
    for (const row of questionAttemptsResult.results) {
      const attempt = attemptById.get(row.quizAttemptId);
      if (attempt) {
        attempt.questionAttempts.push({
          id: row.id,
          isCorrect: Boolean(row.isCorrect),
          isConfident: Boolean(row.isConfident),
        });
      }
    }
    for (const row of confidencesResult.results) {
      const attempt = attemptById.get(row.quizAttemptId);
      if (attempt) {
        attempt.conceptConfidences.push({
          id: row.id,
          concept: row.concept,
          confidence: row.confidence,
        });
      }
    }

    return jsonResponse({
      course: {
        ...course,
        quizzes: quizzesResult.results.map(quiz => ({
          ...quiz,
          questionCount: Number(quiz.questionCount),
        })),
      },
      quizAttempts,
    });
  } catch (error) {
    return errorResponse(error, 'read');
  }
}

export async function startStudentQuizAttempt(request, env, quizId) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'POST' });
  }

  try {
    const user = await requireRole(request, env, 'student');
    const quiz = await env.DB.prepare(`
      SELECT q."id", q."title", q."type", q."courseId"
      FROM "Quiz" q
      JOIN "CourseStudent" cs ON cs."courseId" = q."courseId"
      WHERE q."id" = ? AND cs."studentId" = ?
    `).bind(quizId, user.userId).first();
    if (!quiz) {
      throw new HttpError(404, 'quiz_not_found');
    }

    let attempt = await env.DB.prepare(`
      SELECT "id", "completed", "score", "postSucceeded", "ltiSessionInfo"
      FROM "QuizAttempt"
      WHERE "quizId" = ? AND "studentId" = ? AND "completed" IS NULL
      ORDER BY "createdAt", "id"
      LIMIT 1
    `).bind(quizId, user.userId).first();

    if (!attempt) {
      if (quiz.type !== 'PRACTICE') {
        throw new HttpError(409, 'graded_quiz_requires_launch');
      }

      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const result = await env.DB.prepare(`
        INSERT INTO "QuizAttempt" ("id", "createdAt", "updatedAt", "studentId", "quizId")
        SELECT ?, ?, ?, ?, ?
        WHERE EXISTS (
          SELECT 1
          FROM "Quiz" q
          JOIN "CourseStudent" cs ON cs."courseId" = q."courseId"
          WHERE q."id" = ? AND q."type" = 'PRACTICE' AND cs."studentId" = ?
        )
          AND NOT EXISTS (
            SELECT 1
            FROM "QuizAttempt"
            WHERE "quizId" = ? AND "studentId" = ? AND "completed" IS NULL
          )
      `).bind(
        id,
        now,
        now,
        user.userId,
        quizId,
        quizId,
        user.userId,
        quizId,
        user.userId,
      ).run();
      if (result.meta.changes === 1) {
        attempt = { id, completed: null, score: null, postSucceeded: null };
      } else {
        attempt = await env.DB.prepare(`
          SELECT "id", "completed", "score", "postSucceeded", "ltiSessionInfo"
          FROM "QuizAttempt"
          WHERE "quizId" = ? AND "studentId" = ? AND "completed" IS NULL
          ORDER BY "createdAt", "id"
          LIMIT 1
        `).bind(quizId, user.userId).first();
        if (!attempt) {
          throw new HttpError(404, 'quiz_not_found');
        }
      }
    }

    const questionsResult = await env.DB.prepare(`
      SELECT
        q."id",
        q."concept",
        q."prompt",
        q."type",
        o."id" AS "optionId",
        o."text" AS "optionText"
      FROM "QuizQuestion" qq
      JOIN "Question" q ON q."id" = qq."questionId"
      LEFT JOIN "Option" o ON o."questionId" = q."id"
      WHERE qq."quizId" = ?
      ORDER BY qq.rowid, o.rowid
    `).bind(quizId).all();
    const questionAttemptsResult = await env.DB.prepare(`
      SELECT questionAttempt."id", questionAttempt."questionId"
      FROM "QuizQuestionAttempt" link
      JOIN "QuestionAttempt" questionAttempt
        ON questionAttempt."id" = link."questionAttemptId"
      WHERE link."quizAttemptId" = ?
      ORDER BY link.rowid
    `).bind(attempt.id).all();
    const confidencesResult = await env.DB.prepare(`
      SELECT confidence."id", confidence."concept", confidence."confidence"
      FROM "QuizConceptConfidence" link
      JOIN "ConceptConfidence" confidence
        ON confidence."id" = link."conceptConfidenceId"
      WHERE link."quizAttemptId" = ?
      ORDER BY link.rowid
    `).bind(attempt.id).all();
    if (!Array.isArray(questionsResult.results)
      || !Array.isArray(questionAttemptsResult.results)
      || !Array.isArray(confidencesResult.results)) {
      throw new Error('Unexpected D1 result');
    }

    const ltiSessionInfo = typeof attempt.ltiSessionInfo === 'string'
      ? JSON.parse(attempt.ltiSessionInfo)
      : attempt.ltiSessionInfo;
    const questionsById = new Map();
    for (const row of questionsResult.results) {
      let question = questionsById.get(row.id);
      if (!question) {
        question = {
          id: row.id,
          concept: row.concept,
          prompt: row.prompt,
          type: row.type,
          options: [],
        };
        questionsById.set(row.id, question);
      }
      if (row.optionId) {
        question.options.push({ id: row.optionId, text: row.optionText });
      }
    }

    return jsonResponse({
      quizAttempt: {
        id: attempt.id,
        completed: attempt.completed,
        score: attempt.score,
        requiresLtiPassback: Boolean(ltiSessionInfo?.lis_outcome_service_url),
        postSucceeded: attempt.postSucceeded === null
          ? null
          : Boolean(attempt.postSucceeded),
        quiz: {
          id: quiz.id,
          title: quiz.title,
          type: quiz.type,
          questions: Array.from(questionsById.values()),
        },
        questionAttempts: questionAttemptsResult.results.map(questionAttempt => ({
          id: questionAttempt.id,
          question: { id: questionAttempt.questionId },
        })),
        conceptConfidences: confidencesResult.results,
      },
    });
  } catch (error) {
    return errorResponse(error, 'write');
  }
}

export async function rateStudentQuizConcepts(request, env, quizAttemptId) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'POST' });
  }

  try {
    const user = await requireRole(request, env, 'student');
    const body = await readJsonBody(request);
    if (!body || typeof body !== 'object' || Array.isArray(body)
      || Object.keys(body).length !== 1 || !Array.isArray(body.conceptConfidences)
      || body.conceptConfidences.length > 50) {
      throw new HttpError(400, 'invalid_concept_confidences');
    }

    const attempt = await env.DB.prepare(`
      SELECT studentAttempt."quizId"
      FROM "QuizAttempt" studentAttempt
      WHERE studentAttempt."id" = ? AND studentAttempt."studentId" = ?
    `).bind(quizAttemptId, user.userId).first();
    if (!attempt) {
      throw new HttpError(404, 'quiz_attempt_not_found');
    }

    const conceptsResult = await env.DB.prepare(`
      SELECT question."concept", COUNT(*) AS "questionCount"
      FROM "QuizQuestion" qq
      JOIN "Question" question ON question."id" = qq."questionId"
      WHERE qq."quizId" = ?
      GROUP BY question."concept"
    `).bind(attempt.quizId).all();
    if (!Array.isArray(conceptsResult.results)) {
      throw new Error('Unexpected D1 result');
    }

    const conceptQuestionCounts = new Map(
      conceptsResult.results.map(row => [row.concept, Number(row.questionCount)]),
    );
    const submittedConcepts = new Set();
    for (const rating of body.conceptConfidences) {
      if (!rating || typeof rating !== 'object' || Array.isArray(rating)
        || Object.keys(rating).length !== 2
        || !Object.hasOwn(rating, 'concept')
        || !Object.hasOwn(rating, 'confidence')
        || (rating.concept !== null
          && (typeof rating.concept !== 'string' || rating.concept.length > 200))
        || !Number.isInteger(rating.confidence)
        || !conceptQuestionCounts.has(rating.concept)
        || rating.confidence < 0
        || rating.confidence > conceptQuestionCounts.get(rating.concept)
        || submittedConcepts.has(rating.concept)) {
        throw new HttpError(400, 'invalid_concept_confidences');
      }
      submittedConcepts.add(rating.concept);
    }
    if (submittedConcepts.size !== conceptQuestionCounts.size) {
      throw new HttpError(400, 'invalid_concept_confidences');
    }

    const now = new Date().toISOString();
    const ids = body.conceptConfidences.map(() => crypto.randomUUID());
    const statements = [
      env.DB.prepare(`
        DELETE FROM "ConceptConfidence"
        WHERE "id" IN (
          SELECT qcc."conceptConfidenceId"
          FROM "QuizConceptConfidence" qcc
          WHERE qcc."quizAttemptId" = ?
        )
          AND NOT EXISTS (
            SELECT 1
            FROM "QuizConceptConfidence" other
            WHERE other."conceptConfidenceId" = "ConceptConfidence"."id"
              AND other."quizAttemptId" <> ?
          )
      `).bind(quizAttemptId, quizAttemptId),
      env.DB.prepare(`
        DELETE FROM "QuizConceptConfidence" WHERE "quizAttemptId" = ?
      `).bind(quizAttemptId),
    ];
    body.conceptConfidences.forEach((rating, index) => {
      statements.push(env.DB.prepare(`
        INSERT INTO "ConceptConfidence"
          ("id", "concept", "confidence", "createdAt", "updatedAt")
        VALUES (?, ?, ?, ?, ?)
      `).bind(ids[index], rating.concept, rating.confidence, now, now));
      statements.push(env.DB.prepare(`
        INSERT INTO "QuizConceptConfidence" ("quizAttemptId", "conceptConfidenceId")
        VALUES (?, ?)
      `).bind(quizAttemptId, ids[index]));
    });

    const results = await env.DB.batch(statements);
    if (!Array.isArray(results) || results.length !== statements.length
      || results.slice(2).some(result => result.meta.changes !== 1)) {
      throw new Error('Unexpected D1 batch result');
    }
    return jsonResponse({ saved: true });
  } catch (error) {
    return errorResponse(error, 'write');
  }
}

async function getStudentQuestionAttempt(env, quizAttemptId, questionId) {
  const attempt = await env.DB.prepare(`
    SELECT
      questionAttempt."id",
      questionAttempt."shortAnswer",
      questionAttempt."correctShortAnswer",
      questionAttempt."isCorrect",
      questionAttempt."isConfident",
      question."id" AS "questionId",
      question."concept",
      question."prompt",
      question."type",
      selectedOption."id" AS "selectedOptionId",
      selectedOption."text" AS "selectedOptionText",
      correctOption."id" AS "correctOptionId",
      correctOption."text" AS "correctOptionText"
    FROM "QuizQuestionAttempt" link
    JOIN "QuestionAttempt" questionAttempt
      ON questionAttempt."id" = link."questionAttemptId"
    JOIN "Question" question ON question."id" = questionAttempt."questionId"
    LEFT JOIN "Option" selectedOption ON selectedOption."id" = questionAttempt."optionId"
    LEFT JOIN "Option" correctOption ON correctOption."id" = questionAttempt."correctOptionId"
    WHERE link."quizAttemptId" = ? AND questionAttempt."questionId" = ?
    LIMIT 1
  `).bind(quizAttemptId, questionId).first();
  if (!attempt) {
    return null;
  }

  const optionsResult = await env.DB.prepare(`
    SELECT "id", "text"
    FROM "Option"
    WHERE "questionId" = ?
    ORDER BY rowid
  `).bind(questionId).all();
  if (!Array.isArray(optionsResult.results)) {
    throw new Error('Unexpected D1 result');
  }

  return {
    id: attempt.id,
    question: {
      id: attempt.questionId,
      concept: attempt.concept,
      prompt: attempt.prompt,
      type: attempt.type,
      options: optionsResult.results,
    },
    option: attempt.selectedOptionId
      ? { id: attempt.selectedOptionId, text: attempt.selectedOptionText }
      : null,
    correctOption: attempt.correctOptionId
      ? { id: attempt.correctOptionId, text: attempt.correctOptionText }
      : null,
    shortAnswer: attempt.shortAnswer,
    correctShortAnswer: attempt.correctShortAnswer,
    isCorrect: Boolean(attempt.isCorrect),
    isConfident: Boolean(attempt.isConfident),
  };
}

export async function attemptStudentQuestion(request, env, quizAttemptId) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'POST' });
  }

  try {
    const user = await requireRole(request, env, 'student');
    const body = await readJsonBody(request);
    if (!body || typeof body !== 'object' || Array.isArray(body)
      || Object.keys(body).length !== 4
      || typeof body.questionId !== 'string' || body.questionId.length === 0
      || body.questionId.length > 200
      || (body.optionId !== null && typeof body.optionId !== 'string')
      || typeof body.shortAnswer !== 'string' || body.shortAnswer.length > 4096
      || typeof body.isConfident !== 'boolean') {
      throw new HttpError(400, 'invalid_question_attempt');
    }

    const question = await env.DB.prepare(`
      SELECT question."id", question."concept", question."prompt", question."type",
        question."correctShortAnswers"
      FROM "QuizAttempt" ownedAttempt
      JOIN "QuizQuestion" qq ON qq."quizId" = ownedAttempt."quizId"
      JOIN "Question" question ON question."id" = qq."questionId"
      WHERE ownedAttempt."id" = ?
        AND ownedAttempt."studentId" = ?
        AND ownedAttempt."completed" IS NULL
        AND question."id" = ?
    `).bind(quizAttemptId, user.userId, body.questionId).first();
    if (!question) {
      throw new HttpError(404, 'quiz_question_not_found');
    }

    const previousAttempt = await getStudentQuestionAttempt(env, quizAttemptId, question.id);
    if (previousAttempt) {
      return jsonResponse({ questionAttempt: previousAttempt });
    }

    let optionId = null;
    let correctOptionId = null;
    let shortAnswer = null;
    let correctShortAnswer = null;
    let isCorrect = false;
    if (question.type === 'MULTIPLE_CHOICE') {
      if (typeof body.optionId !== 'string') {
        throw new HttpError(400, 'invalid_question_attempt');
      }
      const optionsResult = await env.DB.prepare(`
        SELECT "id", "text", "isCorrect"
        FROM "Option"
        WHERE "questionId" = ?
        ORDER BY rowid
      `).bind(question.id).all();
      if (!Array.isArray(optionsResult.results)) {
        throw new Error('Unexpected D1 result');
      }
      const correctOption = optionsResult.results.find(option => Boolean(option.isCorrect));
      const selectedOption = optionsResult.results.find(option => option.id === body.optionId);
      if (!correctOption) {
        throw new HttpError(409, 'question_has_no_correct_option');
      }
      if (!selectedOption) {
        throw new HttpError(400, 'invalid_question_attempt');
      }
      optionId = selectedOption.id;
      correctOptionId = correctOption.id;
      isCorrect = selectedOption.id === correctOption.id;
    } else if (question.type === 'SHORT_ANSWER') {
      if (body.optionId !== null) {
        throw new HttpError(400, 'invalid_question_attempt');
      }
      const correctShortAnswers = typeof question.correctShortAnswers === 'string'
        ? JSON.parse(question.correctShortAnswers)
        : question.correctShortAnswers;
      if (!Array.isArray(correctShortAnswers) || correctShortAnswers.length === 0
        || !correctShortAnswers.every(answer => typeof answer === 'string')) {
        throw new HttpError(409, 'question_has_no_correct_answer');
      }
      const prepareAnswer = answer =>
        answer.toLowerCase().replace(/\s/g, '').replace(/^0+./, '.');
      const comparableStudentAnswer = prepareAnswer(body.shortAnswer);
      correctShortAnswer = correctShortAnswers[0];
      for (const answer of correctShortAnswers) {
        if (prepareAnswer(answer) === comparableStudentAnswer) {
          isCorrect = true;
          correctShortAnswer = answer;
          break;
        }
      }
      shortAnswer = body.shortAnswer;
    } else {
      throw new HttpError(409, 'unsupported_question_type');
    }

    const questionAttemptId = crypto.randomUUID();
    const now = new Date().toISOString();
    const results = await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO "QuestionAttempt" (
          "id", "createdAt", "updatedAt", "shortAnswer", "isCorrect",
          "correctShortAnswer", "isConfident", "questionId", "optionId", "correctOptionId"
        )
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        WHERE EXISTS (
          SELECT 1
          FROM "QuizAttempt" ownedAttempt
          JOIN "QuizQuestion" qq ON qq."quizId" = ownedAttempt."quizId"
          WHERE ownedAttempt."id" = ?
            AND ownedAttempt."studentId" = ?
            AND ownedAttempt."completed" IS NULL
            AND qq."questionId" = ?
        )
          AND NOT EXISTS (
            SELECT 1
            FROM "QuizQuestionAttempt" link
            JOIN "QuestionAttempt" prior
              ON prior."id" = link."questionAttemptId"
            WHERE link."quizAttemptId" = ? AND prior."questionId" = ?
          )
      `).bind(
        questionAttemptId,
        now,
        now,
        shortAnswer,
        isCorrect,
        correctShortAnswer,
        body.isConfident,
        question.id,
        optionId,
        correctOptionId,
        quizAttemptId,
        user.userId,
        question.id,
        quizAttemptId,
        question.id,
      ),
      env.DB.prepare(`
        INSERT INTO "QuizQuestionAttempt" ("quizAttemptId", "questionAttemptId")
        SELECT ?, ?
        WHERE EXISTS (
          SELECT 1 FROM "QuestionAttempt"
          WHERE "id" = ? AND "questionId" = ?
        )
          AND EXISTS (
            SELECT 1 FROM "QuizAttempt"
            WHERE "id" = ? AND "studentId" = ? AND "completed" IS NULL
          )
          AND NOT EXISTS (
            SELECT 1
            FROM "QuizQuestionAttempt" link
            JOIN "QuestionAttempt" prior
              ON prior."id" = link."questionAttemptId"
            WHERE link."quizAttemptId" = ? AND prior."questionId" = ?
          )
      `).bind(
        quizAttemptId,
        questionAttemptId,
        questionAttemptId,
        question.id,
        quizAttemptId,
        user.userId,
        quizAttemptId,
        question.id,
      ),
    ]);
    if (!Array.isArray(results) || results.length !== 2) {
      throw new Error('Unexpected D1 batch result');
    }
    if (results[0].meta.changes !== 1) {
      const racedAttempt = await getStudentQuestionAttempt(env, quizAttemptId, question.id);
      if (racedAttempt) {
        return jsonResponse({ questionAttempt: racedAttempt });
      }
      throw new HttpError(404, 'quiz_question_not_found');
    }
    if (results[1].meta.changes !== 1) {
      throw new Error('Question attempt relation was not saved');
    }

    const savedAttempt = await getStudentQuestionAttempt(env, quizAttemptId, question.id);
    if (!savedAttempt) {
      throw new Error('Saved question attempt could not be read');
    }
    return jsonResponse({ questionAttempt: savedAttempt }, 201);
  } catch (error) {
    return errorResponse(error, 'write');
  }
}

export async function completeStudentQuizAttempt(request, env, quizAttemptId) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'POST' });
  }

  try {
    const user = await requireRole(request, env, 'student');
    const attempt = await env.DB.prepare(`
      SELECT
        quizAttempt."quizId",
        quizAttempt."ltiSessionInfo",
        quiz."courseId",
        course."ltiSecret",
        COUNT(DISTINCT qq."questionId") AS "questionCount",
        COUNT(DISTINCT CASE
          WHEN questionAttempt."isCorrect" = 1 THEN qq."questionId"
        END) AS "correctCount"
      FROM "QuizAttempt" quizAttempt
      JOIN "Quiz" quiz ON quiz."id" = quizAttempt."quizId"
      JOIN "Course" course ON course."id" = quiz."courseId"
      LEFT JOIN "QuizQuestion" qq ON qq."quizId" = quizAttempt."quizId"
      LEFT JOIN "QuizQuestionAttempt" link
        ON link."quizAttemptId" = quizAttempt."id"
      LEFT JOIN "QuestionAttempt" questionAttempt
        ON questionAttempt."id" = link."questionAttemptId"
          AND questionAttempt."questionId" = qq."questionId"
      WHERE quizAttempt."id" = ?
        AND quizAttempt."studentId" = ?
        AND quizAttempt."completed" IS NULL
      GROUP BY quizAttempt."id", quiz."courseId", course."ltiSecret"
    `).bind(quizAttemptId, user.userId).first();
    if (!attempt) {
      throw new HttpError(404, 'quiz_attempt_not_found');
    }

    const ltiSessionInfo = typeof attempt.ltiSessionInfo === 'string'
      ? JSON.parse(attempt.ltiSessionInfo)
      : attempt.ltiSessionInfo;
    if (Number(attempt.questionCount) === 0) {
      throw new HttpError(409, 'quiz_has_no_questions');
    }

    const completed = new Date().toISOString();
    const score = Number(attempt.correctCount) / Number(attempt.questionCount);
    const isGraded = Boolean(ltiSessionInfo?.lis_outcome_service_url);
    let postSucceeded = null;
    let passbackError = null;
    if (isGraded) {
      postSucceeded = false;
      for (let retry = 0; retry < 3; retry += 1) {
        try {
          await postLtiGrade(
            ltiSessionInfo,
            attempt.courseId,
            attempt.ltiSecret,
            score,
            env.LTI_FETCH ?? fetch,
          );
          postSucceeded = true;
          break;
        } catch {
          passbackError = 'grade_passback_failed';
          if (retry < 2) {
            await new Promise(resolve => setTimeout(resolve, (retry + 1) * 1000));
          }
        }
      }
    }

    const result = await env.DB.prepare(`
      UPDATE "QuizAttempt"
      SET
        "completed" = ?,
        "updatedAt" = ?,
        "score" = ?,
        "postSucceeded" = ?
      WHERE "id" = ?
        AND "studentId" = ?
        AND "completed" IS NULL
        AND EXISTS (
          SELECT 1
          FROM "QuizQuestion"
          WHERE "quizId" = "QuizAttempt"."quizId"
        )
    `).bind(
      completed,
      completed,
      score,
      postSucceeded === null ? null : Number(postSucceeded),
      quizAttemptId,
      user.userId,
    ).run();
    if (result.meta.changes !== 1) {
      throw new HttpError(409, 'quiz_attempt_already_completed');
    }

    const completedAttempt = await env.DB.prepare(`
      SELECT "completed", "score", "postSucceeded"
      FROM "QuizAttempt"
      WHERE "id" = ? AND "studentId" = ?
    `).bind(quizAttemptId, user.userId).first();
    if (!completedAttempt) {
      throw new Error('Completed quiz attempt could not be read');
    }
    return jsonResponse({
      isGraded,
      postSucceeded: completedAttempt.postSucceeded === null
        ? null
        : Boolean(completedAttempt.postSucceeded),
      error: passbackError,
      quizAttempt: {
        id: quizAttemptId,
        completed: completedAttempt.completed,
        score: completedAttempt.score,
      },
    });
  } catch (error) {
    return errorResponse(error, 'write');
  }
}

export async function getQuizAttemptReview(request, env, quizAttemptId) {
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'GET' });
  }

  try {
    const user = await authenticateRequest(request, env.APP_SECRET);
    const attempt = await env.DB.prepare(`
      SELECT
        attempt."id",
        attempt."studentId",
        attempt."completed",
        attempt."score",
        attempt."postSucceeded",
        quiz."id" AS "quizId",
        quiz."title" AS "quizTitle",
        quiz."type" AS "quizType",
        quiz."courseId"
      FROM "QuizAttempt" attempt
      JOIN "Quiz" quiz ON quiz."id" = attempt."quizId"
      WHERE attempt."id" = ?
    `).bind(quizAttemptId).first();
    if (!attempt) {
      throw new HttpError(404, 'quiz_attempt_not_found');
    }

    if (user.isInstructor) {
      const ownership = await env.DB.prepare(`
        SELECT 1 AS "ownsCourse"
        FROM "CourseInstructor"
        WHERE "instructorId" = ? AND "courseId" = ?
      `).bind(user.userId, attempt.courseId).first();
      if (!ownership) {
        throw new HttpError(404, 'quiz_attempt_not_found');
      }
    } else if (attempt.studentId !== user.userId) {
      throw new HttpError(404, 'quiz_attempt_not_found');
    }

    const questionsResult = await env.DB.prepare(`
      SELECT q."id", q."concept", q."prompt", q."type"
      FROM "QuizQuestion" qq
      JOIN "Question" q ON q."id" = qq."questionId"
      WHERE qq."quizId" = ?
      ORDER BY qq.rowid
    `).bind(attempt.quizId).all();
    const questionAttemptsResult = await env.DB.prepare(`
      SELECT
        questionAttempt."id",
        questionAttempt."questionId",
        questionAttempt."shortAnswer",
        questionAttempt."correctShortAnswer",
        questionAttempt."isCorrect",
        questionAttempt."isConfident",
        question."concept",
        question."prompt",
        question."type",
        selectedOption."id" AS "selectedOptionId",
        selectedOption."text" AS "selectedOptionText",
        correctOption."id" AS "correctOptionId",
        correctOption."text" AS "correctOptionText"
      FROM "QuizQuestionAttempt" qqa
      JOIN "QuestionAttempt" questionAttempt
        ON questionAttempt."id" = qqa."questionAttemptId"
      JOIN "Question" question ON question."id" = questionAttempt."questionId"
      LEFT JOIN "Option" selectedOption ON selectedOption."id" = questionAttempt."optionId"
      LEFT JOIN "Option" correctOption ON correctOption."id" = questionAttempt."correctOptionId"
      WHERE qqa."quizAttemptId" = ?
      ORDER BY qqa.rowid
    `).bind(quizAttemptId).all();
    const optionsResult = await env.DB.prepare(`
      SELECT option."id", option."questionId", option."text"
      FROM "Option" option
      WHERE option."questionId" IN (
        SELECT qq."questionId"
        FROM "QuizQuestion" qq
        WHERE qq."quizId" = ?
        UNION
        SELECT questionAttempt."questionId"
        FROM "QuizQuestionAttempt" qqa
        JOIN "QuestionAttempt" questionAttempt
          ON questionAttempt."id" = qqa."questionAttemptId"
        WHERE qqa."quizAttemptId" = ?
      )
      ORDER BY option.rowid
    `).bind(attempt.quizId, quizAttemptId).all();
    const confidencesResult = await env.DB.prepare(`
      SELECT confidence."id", confidence."concept", confidence."confidence"
      FROM "QuizConceptConfidence" qcc
      JOIN "ConceptConfidence" confidence
        ON confidence."id" = qcc."conceptConfidenceId"
      WHERE qcc."quizAttemptId" = ?
      ORDER BY qcc.rowid
    `).bind(quizAttemptId).all();
    if (!Array.isArray(questionsResult.results)
      || !Array.isArray(questionAttemptsResult.results)
      || !Array.isArray(optionsResult.results)
      || !Array.isArray(confidencesResult.results)) {
      throw new Error('Unexpected D1 result');
    }

    const optionsByQuestionId = new Map();
    for (const option of optionsResult.results) {
      const options = optionsByQuestionId.get(option.questionId) ?? [];
      options.push({ id: option.id, text: option.text });
      optionsByQuestionId.set(option.questionId, options);
    }
    const toQuestion = question => ({
      id: question.id,
      concept: question.concept,
      prompt: question.prompt,
      type: question.type,
      options: optionsByQuestionId.get(question.id) ?? [],
    });

    return jsonResponse({
      quizAttempt: {
        id: attempt.id,
        completed: attempt.completed,
        score: attempt.score,
        postSucceeded: attempt.postSucceeded === null
          ? null
          : Boolean(attempt.postSucceeded),
        quiz: {
          id: attempt.quizId,
          title: attempt.quizTitle,
          questions: questionsResult.results.map(toQuestion),
        },
        questionAttempts: questionAttemptsResult.results.map(questionAttempt => ({
          id: questionAttempt.id,
          question: toQuestion({
            id: questionAttempt.questionId,
            concept: questionAttempt.concept,
            prompt: questionAttempt.prompt,
            type: questionAttempt.type,
          }),
          option: questionAttempt.selectedOptionId
            ? {
              id: questionAttempt.selectedOptionId,
              text: questionAttempt.selectedOptionText,
            }
            : null,
          correctOption: questionAttempt.correctOptionId
            ? {
              id: questionAttempt.correctOptionId,
              text: questionAttempt.correctOptionText,
            }
            : null,
          shortAnswer: questionAttempt.shortAnswer,
          correctShortAnswer: questionAttempt.correctShortAnswer,
          isCorrect: Boolean(questionAttempt.isCorrect),
          isConfident: Boolean(questionAttempt.isConfident),
        })),
        conceptConfidences: confidencesResult.results,
      },
    });
  } catch (error) {
    return errorResponse(error, 'read');
  }
}

export async function getCourse(request, env, courseId) {
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'GET' });
  }

  try {
    const user = await requireRole(request, env, 'instructor');
    const course = await env.DB.prepare(`
      SELECT
        c."id",
        c."title",
        c."number",
        c."lmsUrl",
        c."consentFormUrl",
        c."ltiSecret",
        c."survey",
        (SELECT COUNT(*) FROM "CourseStudent" cs WHERE cs."courseId" = c."id") AS "studentCount"
      FROM "Course" c
      JOIN "CourseInstructor" ci ON ci."courseId" = c."id"
      WHERE c."id" = ? AND ci."instructorId" = ?
    `).bind(courseId, user.userId).first();
    if (!course) {
      throw new HttpError(404, 'course_not_found');
    }

    const result = await env.DB.prepare(`
      SELECT "id", "title", "type"
      FROM "Quiz"
      WHERE "courseId" = ?
      ORDER BY "createdAt", "id"
    `).bind(courseId).all();
    if (!Array.isArray(result.results)) {
      throw new Error('Unexpected D1 result');
    }
    const instructorsResult = await env.DB.prepare(`
      SELECT i."id", i."email"
      FROM "CourseInstructor" ci
      JOIN "Instructor" i ON i."id" = ci."instructorId"
      WHERE ci."courseId" = ?
      ORDER BY i."email"
    `).bind(courseId).all();
    const invitesResult = await env.DB.prepare(`
      SELECT "id", "createdAt", "email"
      FROM "PendingCourseInvite"
      WHERE "courseId" = ?
      ORDER BY "createdAt", "id"
    `).bind(courseId).all();
    if (!Array.isArray(instructorsResult.results) || !Array.isArray(invitesResult.results)) {
      throw new Error('Unexpected D1 result');
    }

    let survey = course.survey;
    if (typeof survey === 'string') {
      survey = JSON.parse(survey);
    }

    return jsonResponse({
      course: {
        ...course,
        survey,
        studentCount: Number(course.studentCount),
        quizzes: result.results,
        instructors: instructorsResult.results,
        pendingCourseInvites: invitesResult.results,
      },
    });
  } catch (error) {
    return errorResponse(error, 'read');
  }
}

export async function getCourseScores(request, env, courseId) {
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'GET' });
  }

  try {
    const user = await requireRole(request, env, 'instructor');
    const ownership = await env.DB.prepare(`
      SELECT 1
      FROM "CourseInstructor"
      WHERE "courseId" = ? AND "instructorId" = ?
    `).bind(courseId, user.userId).first();
    if (!ownership) {
      throw new HttpError(404, 'course_not_found');
    }

    const quizzesResult = await env.DB.prepare(`
      SELECT "id"
      FROM "Quiz"
      WHERE "courseId" = ?
      ORDER BY "createdAt", "id"
    `).bind(courseId).all();
    const attemptsResult = await env.DB.prepare(`
      SELECT
        attempt."id",
        attempt."quizId",
        attempt."studentId",
        attempt."completed",
        attempt."score"
      FROM "QuizAttempt" attempt
      JOIN "Quiz" quiz ON quiz."id" = attempt."quizId"
      WHERE quiz."courseId" = ? AND attempt."completed" IS NOT NULL
      ORDER BY attempt."createdAt", attempt."id"
    `).bind(courseId).all();
    const questionAttemptsResult = await env.DB.prepare(`
      SELECT
        link."quizAttemptId",
        questionAttempt."isCorrect",
        questionAttempt."isConfident"
      FROM "QuizQuestionAttempt" link
      JOIN "QuestionAttempt" questionAttempt
        ON questionAttempt."id" = link."questionAttemptId"
      JOIN "QuizAttempt" attempt ON attempt."id" = link."quizAttemptId"
      JOIN "Quiz" quiz ON quiz."id" = attempt."quizId"
      WHERE quiz."courseId" = ? AND attempt."completed" IS NOT NULL
      ORDER BY attempt."createdAt", attempt."id", questionAttempt."createdAt", questionAttempt."id"
    `).bind(courseId).all();
    const confidencesResult = await env.DB.prepare(`
      SELECT link."quizAttemptId", confidence."confidence"
      FROM "QuizConceptConfidence" link
      JOIN "ConceptConfidence" confidence
        ON confidence."id" = link."conceptConfidenceId"
      JOIN "QuizAttempt" attempt ON attempt."id" = link."quizAttemptId"
      JOIN "Quiz" quiz ON quiz."id" = attempt."quizId"
      WHERE quiz."courseId" = ? AND attempt."completed" IS NOT NULL
      ORDER BY attempt."createdAt", attempt."id", confidence."createdAt", confidence."id"
    `).bind(courseId).all();

    if (![quizzesResult, attemptsResult, questionAttemptsResult, confidencesResult]
      .every(result => Array.isArray(result.results))) {
      throw new Error('Unexpected D1 result');
    }

    const attemptsById = new Map();
    const quizzesById = new Map(
      quizzesResult.results.map(quiz => [quiz.id, { id: quiz.id, quizAttempts: [] }]),
    );
    for (const attempt of attemptsResult.results) {
      const quiz = quizzesById.get(attempt.quizId);
      if (!quiz) {
        throw new Error('Unexpected quiz attempt relation');
      }
      const quizAttempt = {
        id: attempt.id,
        student: { id: attempt.studentId },
        completed: attempt.completed,
        score: attempt.score,
        questionAttempts: [],
        conceptConfidences: [],
      };
      quiz.quizAttempts.push(quizAttempt);
      attemptsById.set(attempt.id, quizAttempt);
    }

    for (const questionAttempt of questionAttemptsResult.results) {
      const quizAttempt = attemptsById.get(questionAttempt.quizAttemptId);
      if (!quizAttempt) {
        throw new Error('Unexpected question attempt relation');
      }
      quizAttempt.questionAttempts.push({
        isCorrect: Boolean(questionAttempt.isCorrect),
        isConfident: Boolean(questionAttempt.isConfident),
      });
    }

    for (const confidence of confidencesResult.results) {
      const quizAttempt = attemptsById.get(confidence.quizAttemptId);
      if (!quizAttempt) {
        throw new Error('Unexpected concept confidence relation');
      }
      quizAttempt.conceptConfidences.push({ confidence: confidence.confidence });
    }

    return jsonResponse({ course: { quizzes: [...quizzesById.values()] } });
  } catch (error) {
    return errorResponse(error, 'read');
  }
}

export async function getCourseConcepts(request, env, courseId) {
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'GET' });
  }

  try {
    const user = await requireRole(request, env, 'instructor');
    const ownership = await env.DB.prepare(`
      SELECT 1
      FROM "CourseInstructor"
      WHERE "courseId" = ? AND "instructorId" = ?
    `).bind(courseId, user.userId).first();
    if (!ownership) {
      throw new HttpError(404, 'course_not_found');
    }

    const result = await env.DB.prepare(`
      SELECT DISTINCT trim(q."concept") AS "concept"
      FROM "Quiz" quiz
      JOIN "CourseInstructor" ci ON ci."courseId" = quiz."courseId"
      JOIN "QuizQuestion" qq ON qq."quizId" = quiz."id"
      JOIN "Question" q ON q."id" = qq."questionId"
      WHERE quiz."courseId" = ? AND ci."instructorId" = ?
        AND q."concept" IS NOT NULL AND trim(q."concept") <> ''
      ORDER BY "concept"
    `).bind(courseId, user.userId).all();
    if (!Array.isArray(result.results)) {
      throw new Error('Unexpected D1 result');
    }

    return jsonResponse({ concepts: result.results.map(row => row.concept) });
  } catch (error) {
    return errorResponse(error, 'read');
  }
}

export async function getCourseSurveyResults(request, env, courseId) {
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'GET' });
  }

  try {
    const user = await requireRole(request, env, 'instructor');
    const course = await env.DB.prepare(`
      SELECT c."id", c."title", c."survey"
      FROM "Course" c
      JOIN "CourseInstructor" ci ON ci."courseId" = c."id"
      WHERE c."id" = ? AND ci."instructorId" = ?
    `).bind(courseId, user.userId).first();
    if (!course) {
      throw new HttpError(404, 'course_not_found');
    }

    const result = await env.DB.prepare(`
      SELECT
        s."id" AS "studentId",
        s."name" AS "studentName",
        sr."id" AS "surveyResultId",
        sr."createdAt" AS "surveyResultCreatedAt",
        sr."answers" AS "surveyResultAnswers"
      FROM "CourseStudent" cs
      JOIN "Student" s ON s."id" = cs."studentId"
      LEFT JOIN "SurveyResult" sr
        ON sr."studentId" = s."id" AND sr."courseId" = cs."courseId"
      WHERE cs."courseId" = ?
      ORDER BY s."createdAt", s."id", sr."createdAt", sr."id"
    `).bind(courseId).all();
    if (!Array.isArray(result.results)) {
      throw new Error('Unexpected D1 result');
    }

    const students = [];
    for (const row of result.results) {
      let student = students[students.length - 1];
      if (!student || student.id !== row.studentId) {
        student = { id: row.studentId, name: row.studentName, surveyResults: [] };
        students.push(student);
      }
      if (row.surveyResultId !== null) {
        const answers = typeof row.surveyResultAnswers === 'string'
          ? JSON.parse(row.surveyResultAnswers)
          : row.surveyResultAnswers;
        student.surveyResults.push({
          createdAt: row.surveyResultCreatedAt,
          answers,
          course: { id: courseId },
        });
      }
    }

    const survey = typeof course.survey === 'string'
      ? JSON.parse(course.survey)
      : course.survey;
    return jsonResponse({
      course: { ...course, survey, students },
    });
  } catch (error) {
    return errorResponse(error, 'read');
  }
}

export async function getStudentCourseSurvey(request, env, courseId) {
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'GET' });
  }

  try {
    const user = await requireRole(request, env, 'student');
    const course = await env.DB.prepare(`
      SELECT c."id", c."title", c."survey"
      FROM "Course" c
      JOIN "CourseStudent" cs ON cs."courseId" = c."id"
      WHERE c."id" = ? AND cs."studentId" = ?
    `).bind(courseId, user.userId).first();
    if (!course) {
      throw new HttpError(404, 'course_not_found');
    }

    const survey = typeof course.survey === 'string'
      ? JSON.parse(course.survey)
      : course.survey;
    return jsonResponse({ course: { ...course, survey } });
  } catch (error) {
    return errorResponse(error, 'read');
  }
}

export async function getStudentCourseConsent(request, env, courseId) {
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'GET' });
  }

  try {
    const user = await requireRole(request, env, 'student');
    const course = await env.DB.prepare(`
      SELECT
        c."id",
        c."title",
        c."consentFormUrl",
        (
          SELECT cc."consent"
          FROM "CourseConsent" cc
          WHERE cc."courseId" = c."id" AND cc."studentId" = ?
          ORDER BY cc."createdAt" DESC, cc."id" DESC
          LIMIT 1
        ) AS "consent"
      FROM "Course" c
      JOIN "CourseStudent" cs ON cs."courseId" = c."id"
      WHERE c."id" = ? AND cs."studentId" = ?
    `).bind(user.userId, courseId, user.userId).first();
    if (!course) {
      throw new HttpError(404, 'course_not_found');
    }

    const { consent, ...courseData } = course;
    return jsonResponse({ course: courseData, consent: consent ?? null });
  } catch (error) {
    return errorResponse(error, 'read');
  }
}

export async function submitStudentCourseConsent(request, env, courseId) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'POST' });
  }

  try {
    const user = await requireRole(request, env, 'student');
    const body = await readJsonBody(request);
    if (!body || typeof body !== 'object' || Array.isArray(body)
      || Object.keys(body).length !== 1 || !['yes', 'no'].includes(body.consent)) {
      throw new HttpError(400, 'invalid_course_consent');
    }

    const enrollment = await env.DB.prepare(`
      SELECT 1
      FROM "CourseStudent"
      WHERE "courseId" = ? AND "studentId" = ?
    `).bind(courseId, user.userId).first();
    if (!enrollment) {
      throw new HttpError(404, 'course_not_found');
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const results = await env.DB.batch([
      env.DB.prepare(`
        DELETE FROM "CourseConsent"
        WHERE "courseId" = ? AND "studentId" = ?
          AND EXISTS (
            SELECT 1 FROM "CourseStudent"
            WHERE "courseId" = ? AND "studentId" = ?
          )
      `).bind(courseId, user.userId, courseId, user.userId),
      env.DB.prepare(`
        INSERT INTO "CourseConsent" ("id", "consent", "createdAt", "updatedAt", "courseId", "studentId")
        SELECT ?, ?, ?, ?, ?, ?
        WHERE EXISTS (
          SELECT 1 FROM "CourseStudent"
          WHERE "courseId" = ? AND "studentId" = ?
        )
      `).bind(
        id,
        body.consent,
        now,
        now,
        courseId,
        user.userId,
        courseId,
        user.userId,
      ),
    ]);
    if (!Array.isArray(results) || results.length !== 2 || results[1].meta.changes !== 1) {
      throw new HttpError(404, 'course_not_found');
    }

    return jsonResponse({ saved: true });
  } catch (error) {
    return errorResponse(error, 'write');
  }
}

export async function submitStudentSurveyResult(request, env, courseId) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'POST' });
  }

  try {
    const user = await requireRole(request, env, 'student');
    const body = await readJsonBody(request);
    if (!body || typeof body !== 'object' || Array.isArray(body)
      || Object.keys(body).length !== 1 || !Object.hasOwn(body, 'answers')
      || !body.answers || typeof body.answers !== 'object' || Array.isArray(body.answers)) {
      throw new HttpError(400, 'invalid_survey_answers');
    }

    const course = await env.DB.prepare(`
      SELECT c."survey"
      FROM "Course" c
      JOIN "CourseStudent" cs ON cs."courseId" = c."id"
      WHERE c."id" = ? AND cs."studentId" = ?
    `).bind(courseId, user.userId).first();
    if (!course) {
      throw new HttpError(404, 'course_not_found');
    }
    const survey = typeof course.survey === 'string'
      ? JSON.parse(course.survey)
      : course.survey;
    if (!survey || !Array.isArray(survey.questions)) {
      throw new HttpError(409, 'survey_unavailable');
    }

    const validAnswers = Object.entries(body.answers).every(([questionIndex, optionIndex]) => {
      const question = survey.questions.find(item => String(item.index) === questionIndex);
      return question
        && Number.isInteger(optionIndex)
        && Array.isArray(question.options)
        && question.options.some(option => option.index === optionIndex);
    });
    if (!validAnswers) {
      throw new HttpError(400, 'invalid_survey_answers');
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const results = await env.DB.batch([
      env.DB.prepare(`
        DELETE FROM "SurveyResult"
        WHERE "courseId" = ? AND "studentId" = ?
          AND EXISTS (
            SELECT 1 FROM "CourseStudent"
            WHERE "courseId" = ? AND "studentId" = ?
          )
      `).bind(courseId, user.userId, courseId, user.userId),
      env.DB.prepare(`
        INSERT INTO "SurveyResult" ("id", "answers", "createdAt", "updatedAt", "courseId", "studentId")
        SELECT ?, ?, ?, ?, ?, ?
        WHERE EXISTS (
          SELECT 1 FROM "CourseStudent"
          WHERE "courseId" = ? AND "studentId" = ?
        )
      `).bind(id, JSON.stringify(body.answers), now, now, courseId, user.userId, courseId, user.userId),
    ]);

    if (!Array.isArray(results) || results.length !== 2 || results[1].meta.changes !== 1) {
      throw new HttpError(404, 'course_not_found');
    }
    return jsonResponse({ id }, 201);
  } catch (error) {
    return errorResponse(error, 'write');
  }
}

export async function createCourse(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'POST' });
  }

  try {
    const user = await requireRole(request, env, 'instructor');
    const body = await readJsonBody(request);
    if (!body || typeof body !== 'object' || Array.isArray(body)
      || typeof body.title !== 'string'
      || body.title.trim().length === 0
      || body.title.length > 200) {
      throw new HttpError(400, 'invalid_course');
    }

    const instructor = await env.DB.prepare(
      'SELECT "id" FROM "Instructor" WHERE "id" = ?',
    ).bind(user.userId).first();
    if (!instructor) {
      throw new HttpError(401, 'unauthorized');
    }

    const id = crypto.randomUUID();
    const randomBytes = crypto.getRandomValues(new Uint8Array(16));
    const ltiSecret = Array.from(randomBytes, value => value.toString(16).padStart(2, '0')).join('');
    const now = new Date().toISOString();
    const results = await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO "Course" ("id", "title", "ltiSecret", "createdAt", "updatedAt")
        VALUES (?, ?, ?, ?, ?)
      `).bind(id, body.title, ltiSecret, now, now),
      env.DB.prepare(`
        INSERT INTO "CourseInstructor" ("courseId", "instructorId")
        VALUES (?, ?)
      `).bind(id, user.userId),
    ]);

    if (!Array.isArray(results)
      || results.length !== 2
      || results.some(result => result.meta.changes !== 1)) {
      throw new HttpError(503, 'course_creation_failed');
    }
    return jsonResponse({ id }, 201);
  } catch (error) {
    return errorResponse(error, 'write');
  }
}

export async function createQuiz(request, env, courseId) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'POST' });
  }

  try {
    const user = await requireRole(request, env, 'instructor');
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const result = await env.DB.prepare(`
      INSERT INTO "Quiz" ("id", "title", "type", "orderedQuestionIds", "createdAt", "updatedAt", "courseId")
      SELECT ?, 'Untitled Quiz', 'GRADED', '[]', ?, ?, c."id"
      FROM "Course" c
      JOIN "CourseInstructor" ci ON ci."courseId" = c."id"
      WHERE c."id" = ? AND ci."instructorId" = ?
    `).bind(id, now, now, courseId, user.userId).run();

    if (result.meta.changes !== 1) {
      throw new HttpError(404, 'course_not_found');
    }
    return jsonResponse({ id }, 201);
  } catch (error) {
    return errorResponse(error, 'write');
  }
}

export async function getQuiz(request, env, quizId) {
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'GET' });
  }

  try {
    const user = await requireRole(request, env, 'instructor');
    const quiz = await env.DB.prepare(`
      SELECT
        q."id",
        q."title",
        q."type",
        c."id" AS "courseId",
        c."title" AS "courseTitle",
        c."ltiSecret"
      FROM "Quiz" q
      JOIN "Course" c ON c."id" = q."courseId"
      JOIN "CourseInstructor" ci ON ci."courseId" = c."id"
      WHERE q."id" = ? AND ci."instructorId" = ?
    `).bind(quizId, user.userId).first();
    if (!quiz) {
      throw new HttpError(404, 'quiz_not_found');
    }

    const questionsResult = await env.DB.prepare(`
      SELECT q."id", q."prompt"
      FROM "QuizQuestion" qq
      JOIN "Question" q ON q."id" = qq."questionId"
      WHERE qq."quizId" = ?
      ORDER BY qq.rowid
    `).bind(quizId).all();
    const attemptsResult = await env.DB.prepare(`
      SELECT COUNT(*) AS "attemptCount"
      FROM "QuizAttempt"
      WHERE "quizId" = ?
    `).bind(quizId).first();
    if (!Array.isArray(questionsResult.results) || !attemptsResult) {
      throw new Error('Unexpected D1 result');
    }

    return jsonResponse({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        type: quiz.type,
        course: { id: quiz.courseId, title: quiz.courseTitle, ltiSecret: quiz.ltiSecret },
        questions: questionsResult.results,
        quizAttemptCount: Number(attemptsResult.attemptCount),
      },
    });
  } catch (error) {
    return errorResponse(error, 'read');
  }
}

export async function getQuizImportableQuestions(request, env, quizId) {
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'GET' });
  }

  try {
    const user = await requireRole(request, env, 'instructor');
    const quiz = await env.DB.prepare(`
      SELECT q."id", q."title", c."id" AS "courseId", c."title" AS "courseTitle"
      FROM "Quiz" q
      JOIN "Course" c ON c."id" = q."courseId"
      JOIN "CourseInstructor" ci ON ci."courseId" = c."id"
      WHERE q."id" = ? AND ci."instructorId" = ?
    `).bind(quizId, user.userId).first();
    if (!quiz) {
      throw new HttpError(404, 'quiz_not_found');
    }

    const questionsResult = await env.DB.prepare(`
      SELECT
        sourceQuiz."id" AS "quizId",
        sourceQuiz."title" AS "quizTitle",
        sourceQuiz."type" AS "quizType",
        question."id" AS "questionId",
        question."prompt"
      FROM "Quiz" sourceQuiz
      LEFT JOIN "QuizQuestion" qq ON qq."quizId" = sourceQuiz."id"
      LEFT JOIN "Question" question ON question."id" = qq."questionId"
      WHERE sourceQuiz."courseId" = ?
      ORDER BY sourceQuiz."createdAt", sourceQuiz."id", qq.rowid
    `).bind(quiz.courseId).all();
    if (!Array.isArray(questionsResult.results)) {
      throw new Error('Unexpected D1 result');
    }

    const quizzesById = new Map();
    for (const row of questionsResult.results) {
      let sourceQuiz = quizzesById.get(row.quizId);
      if (!sourceQuiz) {
        sourceQuiz = {
          id: row.quizId,
          title: row.quizTitle,
          type: row.quizType,
          questions: [],
        };
        quizzesById.set(row.quizId, sourceQuiz);
      }
      if (row.questionId) {
        sourceQuiz.questions.push({ id: row.questionId, prompt: row.prompt });
      }
    }

    return jsonResponse({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        course: {
          id: quiz.courseId,
          title: quiz.courseTitle,
          quizzes: Array.from(quizzesById.values()),
        },
      },
    });
  } catch (error) {
    return errorResponse(error, 'read');
  }
}

export function parseQuestionInput(question, isUpdate) {
  const keys = ['concept', 'correctShortAnswers', 'options', 'prompt', 'type'];
  if (!question || typeof question !== 'object' || Array.isArray(question)
    || Object.keys(question).length !== keys.length
    || Object.keys(question).some(key => !keys.includes(key))
    || typeof question.concept !== 'string' || question.concept.trim() === ''
    || typeof question.prompt !== 'string' || question.prompt.trim() === ''
    || !['MULTIPLE_CHOICE', 'SHORT_ANSWER'].includes(question.type)
    || !Array.isArray(question.correctShortAnswers)
    || !question.correctShortAnswers.every(answer => typeof answer === 'string')
    || !Array.isArray(question.options)
    || (question.type === 'MULTIPLE_CHOICE' && question.options.length === 0)
    || question.options.length > 50) {
    throw new HttpError(400, 'invalid_question');
  }

  const optionIds = new Set();
  const options = question.options.map(option => {
    const optionKeys = isUpdate ? ['id', 'text', 'isCorrect'] : ['id', 'text', 'isCorrect'];
    if (!option || typeof option !== 'object' || Array.isArray(option)
      || Object.keys(option).some(key => !optionKeys.includes(key))
      || (isUpdate && (typeof option.id !== 'string' || option.id.length === 0))
      || typeof option.text !== 'string'
      || typeof option.isCorrect !== 'boolean'
      || (option.id !== undefined && typeof option.id !== 'string')
      || (option.id !== undefined && optionIds.has(option.id))) {
      throw new HttpError(400, 'invalid_question');
    }
    if (option.id !== undefined) optionIds.add(option.id);
    return {
      id: option.id,
      text: sanitizeHtml(option.text, questionHtmlOptions),
      isCorrect: option.isCorrect,
    };
  });
  const prompt = sanitizeHtml(question.prompt, questionHtmlOptions);
  if (prompt.trim() === '') {
    throw new HttpError(400, 'invalid_question');
  }
  if (question.type === 'MULTIPLE_CHOICE') {
    const nonBlankOptions = options.filter(option => option.text.trim() !== '');
    if (nonBlankOptions.length < 2
      || !nonBlankOptions.some(option => option.isCorrect)) {
      throw new HttpError(400, 'invalid_question');
    }
  } else if (!question.correctShortAnswers.some(answer => answer.trim() !== '')) {
    throw new HttpError(400, 'invalid_question');
  }

  return {
    concept: question.concept,
    correctShortAnswers: question.correctShortAnswers,
    options,
    prompt,
    type: question.type,
  };
}

export async function createQuizQuestion(request, env, quizId) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'POST' });
  }

  try {
    const user = await requireRole(request, env, 'instructor');
    const body = await readJsonBody(request, 512 * 1024);
    if (!body || typeof body !== 'object' || Array.isArray(body)
      || Object.keys(body).length !== 1 || !Object.hasOwn(body, 'question')) {
      throw new HttpError(400, 'invalid_question');
    }
    const question = parseQuestionInput(body.question, false);
    const quiz = await env.DB.prepare(`
      SELECT q."id"
      FROM "Quiz" q
      JOIN "CourseInstructor" ci ON ci."courseId" = q."courseId"
      WHERE q."id" = ? AND ci."instructorId" = ?
    `).bind(quizId, user.userId).first();
    if (!quiz) {
      throw new HttpError(404, 'quiz_not_found');
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const options = question.options.map(option => ({
      id: crypto.randomUUID(),
      text: option.text,
      isCorrect: option.isCorrect,
    }));
    const statements = [
      env.DB.prepare(`
        INSERT INTO "Question"
          ("id", "prompt", "concept", "type", "correctShortAnswers", "createdAt", "updatedAt")
        SELECT ?, ?, ?, ?, ?, ?, ?
        WHERE EXISTS (
          SELECT 1
          FROM "Quiz" q
          JOIN "CourseInstructor" ci ON ci."courseId" = q."courseId"
          WHERE q."id" = ? AND ci."instructorId" = ?
        )
      `).bind(
        id,
        question.prompt,
        question.concept,
        question.type,
        JSON.stringify(question.correctShortAnswers),
        now,
        now,
        quizId,
        user.userId,
      ),
      env.DB.prepare(`
        INSERT INTO "QuizQuestion" ("quizId", "questionId")
        SELECT ?, ?
        WHERE EXISTS (
          SELECT 1
          FROM "Quiz" q
          JOIN "CourseInstructor" ci ON ci."courseId" = q."courseId"
          WHERE q."id" = ? AND ci."instructorId" = ?
        )
      `).bind(quizId, id, quizId, user.userId),
      ...options.map(option => env.DB.prepare(`
        INSERT INTO "Option" ("id", "text", "isCorrect", "createdAt", "updatedAt", "questionId")
        SELECT ?, ?, ?, ?, ?, ?
        WHERE EXISTS (
          SELECT 1
          FROM "Quiz" q
          JOIN "CourseInstructor" ci ON ci."courseId" = q."courseId"
          WHERE q."id" = ? AND ci."instructorId" = ?
        )
      `).bind(
        option.id,
        option.text,
        option.isCorrect,
        now,
        now,
        id,
        quizId,
        user.userId,
      )),
    ];
    const results = await env.DB.batch(statements);
    if (!Array.isArray(results) || results.length !== statements.length
      || results.some(result => result.meta.changes !== 1)) {
      throw new HttpError(404, 'quiz_not_found');
    }

    return jsonResponse({
      question: {
        id,
        ...question,
        options,
      },
    }, 201);
  } catch (error) {
    return errorResponse(error, 'write');
  }
}

export async function updateQuizQuestion(request, env, quizId, questionId) {
  if (request.method !== 'PUT') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'PUT' });
  }

  try {
    const user = await requireRole(request, env, 'instructor');
    const body = await readJsonBody(request, 512 * 1024);
    if (!body || typeof body !== 'object' || Array.isArray(body)
      || Object.keys(body).length !== 1 || !Object.hasOwn(body, 'question')) {
      throw new HttpError(400, 'invalid_question');
    }
    const question = parseQuestionInput(body.question, true);
    const ownership = await env.DB.prepare(`
      SELECT q."id"
      FROM "Question" q
      JOIN "QuizQuestion" qq ON qq."questionId" = q."id"
      JOIN "Quiz" quiz ON quiz."id" = qq."quizId"
      JOIN "CourseInstructor" ci ON ci."courseId" = quiz."courseId"
      WHERE q."id" = ? AND quiz."id" = ? AND ci."instructorId" = ?
    `).bind(questionId, quizId, user.userId).first();
    if (!ownership) {
      throw new HttpError(404, 'question_not_found');
    }

    const optionResult = await env.DB.prepare(
      'SELECT "id" FROM "Option" WHERE "questionId" = ?',
    ).bind(questionId).all();
    if (!Array.isArray(optionResult.results)) {
      throw new Error('Unexpected D1 result');
    }
    const currentOptionIds = optionResult.results.map(option => option.id).sort();
    const submittedOptionIds = question.options.map(option => option.id).sort();
    if (currentOptionIds.length !== submittedOptionIds.length
      || currentOptionIds.some((id, index) => id !== submittedOptionIds[index])) {
      throw new HttpError(409, 'question_options_changed');
    }

    const now = new Date().toISOString();
    const optionPlaceholders = submittedOptionIds.map(() => '?').join(', ');
    const optionCountGuard = `
      AND (
        SELECT COUNT(*) FROM "Option"
        WHERE "questionId" = ? AND "id" IN (${optionPlaceholders})
      ) = ?
      AND (SELECT COUNT(*) FROM "Option" WHERE "questionId" = ?) = ?
    `;
    const statements = [
      env.DB.prepare(`
        UPDATE "Question"
        SET "prompt" = ?, "concept" = ?, "type" = ?,
            "correctShortAnswers" = ?, "updatedAt" = ?
        WHERE "id" = ?
          AND EXISTS (
            SELECT 1
            FROM "QuizQuestion" qq
            JOIN "Quiz" quiz ON quiz."id" = qq."quizId"
            JOIN "CourseInstructor" ci ON ci."courseId" = quiz."courseId"
            WHERE qq."questionId" = "Question"."id"
              AND quiz."id" = ? AND ci."instructorId" = ?
          )
          ${optionCountGuard}
      `).bind(
        question.prompt,
        question.concept,
        question.type,
        JSON.stringify(question.correctShortAnswers),
        now,
        questionId,
        quizId,
        user.userId,
        questionId,
        ...submittedOptionIds,
        submittedOptionIds.length,
        questionId,
        submittedOptionIds.length,
      ),
      ...question.options.map(option => env.DB.prepare(`
        UPDATE "Option"
        SET "text" = ?, "isCorrect" = ?, "updatedAt" = ?
        WHERE "id" = ? AND "questionId" = ?
          AND EXISTS (
            SELECT 1
            FROM "QuizQuestion" qq
            JOIN "Quiz" quiz ON quiz."id" = qq."quizId"
            JOIN "CourseInstructor" ci ON ci."courseId" = quiz."courseId"
            WHERE qq."questionId" = ? AND quiz."id" = ? AND ci."instructorId" = ?
          )
          ${optionCountGuard}
      `).bind(
        option.text,
        option.isCorrect,
        now,
        option.id,
        questionId,
        questionId,
        quizId,
        user.userId,
        questionId,
        ...submittedOptionIds,
        submittedOptionIds.length,
        questionId,
        submittedOptionIds.length,
      )),
    ];
    const results = await env.DB.batch(statements);
    if (!Array.isArray(results) || results.length !== statements.length
      || results.some(result => result.meta.changes !== 1)) {
      throw new HttpError(404, 'question_not_found');
    }

    return jsonResponse({
      question: {
        id: questionId,
        ...question,
      },
    });
  } catch (error) {
    return errorResponse(error, 'write');
  }
}

export async function importQuizQuestions(request, env, quizId) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'POST' });
  }

  try {
    const user = await requireRole(request, env, 'instructor');
    const body = await readJsonBody(request);
    if (!body || typeof body !== 'object' || Array.isArray(body)
      || Object.keys(body).length !== 1 || !Array.isArray(body.questionIds)
      || body.questionIds.length === 0
      || !body.questionIds.every(id => typeof id === 'string' && id.length > 0 && id.length <= 200)
      || new Set(body.questionIds).size !== body.questionIds.length) {
      throw new HttpError(400, 'invalid_question_ids');
    }

    const destination = await env.DB.prepare(`
      SELECT q."id", q."courseId"
      FROM "Quiz" q
      JOIN "CourseInstructor" ci ON ci."courseId" = q."courseId"
      WHERE q."id" = ? AND ci."instructorId" = ?
    `).bind(quizId, user.userId).first();
    if (!destination) {
      throw new HttpError(404, 'quiz_not_found');
    }

    const placeholders = body.questionIds.map(() => '?').join(', ');
    const sourceResult = await env.DB.prepare(`
      SELECT DISTINCT q."id", q."prompt", q."concept", q."type", q."correctShortAnswers"
      FROM "Question" q
      JOIN "QuizQuestion" qq ON qq."questionId" = q."id"
      JOIN "Quiz" sourceQuiz ON sourceQuiz."id" = qq."quizId"
      WHERE sourceQuiz."courseId" = ? AND q."id" IN (${placeholders})
    `).bind(destination.courseId, ...body.questionIds).all();
    if (!Array.isArray(sourceResult.results)
      || sourceResult.results.length !== body.questionIds.length) {
      throw new HttpError(404, 'source_questions_not_found');
    }

    const sourceIds = sourceResult.results.map(question => question.id);
    const optionResult = await env.DB.prepare(`
      SELECT sourceOption."questionId", sourceOption."text", sourceOption."isCorrect"
      FROM "Option" sourceOption
      WHERE sourceOption."questionId" IN (${sourceIds.map(() => '?').join(', ')})
      ORDER BY sourceOption."createdAt", sourceOption."id"
    `).bind(...sourceIds).all();
    if (!Array.isArray(optionResult.results)) {
      throw new Error('Unexpected D1 result');
    }

    const optionsByQuestion = new Map(sourceIds.map(id => [id, []]));
    for (const option of optionResult.results) {
      optionsByQuestion.get(option.questionId)?.push(option);
    }

    const now = new Date().toISOString();
    const importedQuestionIds = [];
    const statements = [];
    for (const question of sourceResult.results) {
      const importedQuestionId = crypto.randomUUID();
      importedQuestionIds.push(importedQuestionId);
      const correctShortAnswers = typeof question.correctShortAnswers === 'string'
        ? question.correctShortAnswers
        : JSON.stringify(question.correctShortAnswers);
      statements.push(env.DB.prepare(`
        INSERT INTO "Question"
          ("id", "prompt", "concept", "type", "correctShortAnswers", "createdAt", "updatedAt")
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        importedQuestionId,
        question.prompt,
        question.concept,
        question.type,
        correctShortAnswers,
        now,
        now,
      ));
      statements.push(env.DB.prepare(`
        INSERT INTO "QuizQuestion" ("quizId", "questionId")
        VALUES (?, ?)
      `).bind(quizId, importedQuestionId));
      for (const option of optionsByQuestion.get(question.id) ?? []) {
        statements.push(env.DB.prepare(`
          INSERT INTO "Option" ("id", "text", "isCorrect", "createdAt", "updatedAt", "questionId")
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
          crypto.randomUUID(),
          option.text,
          option.isCorrect,
          now,
          now,
          importedQuestionId,
        ));
      }
    }

    await env.DB.batch(statements);
    return jsonResponse({ questionIds: importedQuestionIds }, 201);
  } catch (error) {
    return errorResponse(error, 'write');
  }
}

export async function getQuizQuestion(request, env, quizId, questionId) {
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'GET' });
  }

  try {
    const user = await requireRole(request, env, 'instructor');
    const question = await env.DB.prepare(`
      SELECT q."id", q."concept", q."prompt", q."type", q."correctShortAnswers"
      FROM "Question" q
      JOIN "QuizQuestion" qq ON qq."questionId" = q."id"
      JOIN "Quiz" quiz ON quiz."id" = qq."quizId"
      JOIN "CourseInstructor" ci ON ci."courseId" = quiz."courseId"
      WHERE q."id" = ? AND quiz."id" = ? AND ci."instructorId" = ?
    `).bind(questionId, quizId, user.userId).first();
    if (!question) {
      throw new HttpError(404, 'question_not_found');
    }

    const optionsResult = await env.DB.prepare(`
      SELECT "id", "text", "isCorrect"
      FROM "Option"
      WHERE "questionId" = ?
      ORDER BY rowid
    `).bind(questionId).all();
    if (!Array.isArray(optionsResult.results)) {
      throw new Error('Unexpected D1 result');
    }
    const correctShortAnswers = typeof question.correctShortAnswers === 'string'
      ? JSON.parse(question.correctShortAnswers)
      : question.correctShortAnswers;

    return jsonResponse({
      question: {
        ...question,
        correctShortAnswers,
        options: optionsResult.results.map(option => ({
          ...option,
          isCorrect: option.isCorrect === null ? null : Boolean(option.isCorrect),
        })),
      },
    });
  } catch (error) {
    return errorResponse(error, 'read');
  }
}

export async function deleteCourse(request, env, courseId) {
    if (request.method !== 'DELETE') {
      return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'DELETE' });
    }
    try {
      const user = await requireRole(request, env, 'instructor');
      const result = await env.DB.batch([
        env.DB.prepare(`
          DELETE FROM "QuestionAttempt"
          WHERE "id" IN (
            SELECT link."questionAttemptId"
            FROM "QuizQuestionAttempt" link
            JOIN "QuizAttempt" attempt ON attempt."id" = link."quizAttemptId"
            JOIN "Quiz" quiz ON quiz."id" = attempt."quizId"
            WHERE quiz."courseId" = ?
          )
            AND NOT EXISTS (
              SELECT 1
              FROM "QuizQuestionAttempt" otherLink
              JOIN "QuizAttempt" otherAttempt ON otherAttempt."id" = otherLink."quizAttemptId"
              JOIN "Quiz" otherQuiz ON otherQuiz."id" = otherAttempt."quizId"
              WHERE otherLink."questionAttemptId" = "QuestionAttempt"."id"
                AND otherQuiz."courseId" != ?
            )
            AND EXISTS (
              SELECT 1 FROM "CourseInstructor"
              WHERE "courseId" = ? AND "instructorId" = ?
            )
        `).bind(courseId, courseId, courseId, user.userId),
        env.DB.prepare(`
          DELETE FROM "ConceptConfidence"
          WHERE "id" IN (
            SELECT link."conceptConfidenceId"
            FROM "QuizConceptConfidence" link
            JOIN "QuizAttempt" attempt ON attempt."id" = link."quizAttemptId"
            JOIN "Quiz" quiz ON quiz."id" = attempt."quizId"
            WHERE quiz."courseId" = ?
          )
            AND NOT EXISTS (
              SELECT 1
              FROM "QuizConceptConfidence" otherLink
              JOIN "QuizAttempt" otherAttempt ON otherAttempt."id" = otherLink."quizAttemptId"
              JOIN "Quiz" otherQuiz ON otherQuiz."id" = otherAttempt."quizId"
              WHERE otherLink."conceptConfidenceId" = "ConceptConfidence"."id"
                AND otherQuiz."courseId" != ?
            )
            AND EXISTS (
              SELECT 1 FROM "CourseInstructor"
              WHERE "courseId" = ? AND "instructorId" = ?
            )
        `).bind(courseId, courseId, courseId, user.userId),
        env.DB.prepare(`
          DELETE FROM "Course"
          WHERE "id" = ? AND EXISTS (
            SELECT 1 FROM "CourseInstructor"
            WHERE "courseId" = ? AND "instructorId" = ?
          )
        `).bind(courseId, courseId, user.userId),
      ]);
      if (result[2]?.meta?.changes !== 1) throw new HttpError(404, 'course_not_found');
      return new Response(null, { status: 204 });
    } catch (error) {
      return errorResponse(error, 'write');
    }
  }

export async function deleteQuiz(request, env, quizId) {
    if (request.method !== 'DELETE') {
      return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'DELETE' });
    }
    try {
      const user = await requireRole(request, env, 'instructor');
      const result = await env.DB.batch([
        env.DB.prepare(`
          DELETE FROM "QuestionAttempt"
          WHERE "id" IN (
            SELECT link."questionAttemptId"
            FROM "QuizQuestionAttempt" link
            JOIN "QuizAttempt" attempt ON attempt."id" = link."quizAttemptId"
            WHERE attempt."quizId" = ?
          )
            AND NOT EXISTS (
              SELECT 1
              FROM "QuizQuestionAttempt" otherLink
              JOIN "QuizAttempt" otherAttempt ON otherAttempt."id" = otherLink."quizAttemptId"
              WHERE otherLink."questionAttemptId" = "QuestionAttempt"."id"
                AND otherAttempt."quizId" != ?
            )
            AND EXISTS (
              SELECT 1
              FROM "Quiz" quiz
              JOIN "CourseInstructor" ci ON ci."courseId" = quiz."courseId"
              WHERE quiz."id" = ? AND ci."instructorId" = ?
            )
        `).bind(quizId, quizId, quizId, user.userId),
        env.DB.prepare(`
          DELETE FROM "ConceptConfidence"
          WHERE "id" IN (
            SELECT link."conceptConfidenceId"
            FROM "QuizConceptConfidence" link
            JOIN "QuizAttempt" attempt ON attempt."id" = link."quizAttemptId"
            WHERE attempt."quizId" = ?
          )
            AND NOT EXISTS (
              SELECT 1
              FROM "QuizConceptConfidence" otherLink
              JOIN "QuizAttempt" otherAttempt ON otherAttempt."id" = otherLink."quizAttemptId"
              WHERE otherLink."conceptConfidenceId" = "ConceptConfidence"."id"
                AND otherAttempt."quizId" != ?
            )
            AND EXISTS (
              SELECT 1
              FROM "Quiz" quiz
              JOIN "CourseInstructor" ci ON ci."courseId" = quiz."courseId"
              WHERE quiz."id" = ? AND ci."instructorId" = ?
            )
        `).bind(quizId, quizId, quizId, user.userId),
        env.DB.prepare(`
          DELETE FROM "Quiz"
          WHERE "id" = ? AND EXISTS (
            SELECT 1 FROM "CourseInstructor"
            WHERE "courseId" = "Quiz"."courseId" AND "instructorId" = ?
          )
        `).bind(quizId, user.userId),
      ]);
      if (result[2]?.meta?.changes !== 1) throw new HttpError(404, 'quiz_not_found');
      return new Response(null, { status: 204 });
    } catch (error) {
      return errorResponse(error, 'write');
    }
  }

export async function deleteQuizQuestion(request, env, quizId, questionId) {
    if (request.method !== 'DELETE') {
      return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'DELETE' });
    }
    try {
      const user = await requireRole(request, env, 'instructor');
      const membership = await env.DB.prepare(`
        SELECT 1
        FROM "QuizQuestion" link
        JOIN "Quiz" quiz ON quiz."id" = link."quizId"
        JOIN "CourseInstructor" ci ON ci."courseId" = quiz."courseId"
        WHERE link."quizId" = ? AND link."questionId" = ? AND ci."instructorId" = ?
      `).bind(quizId, questionId, user.userId).first();
      if (!membership) throw new HttpError(404, 'question_not_found');

      await env.DB.batch([
        env.DB.prepare(`
          DELETE FROM "QuizQuestion"
          WHERE "quizId" = ? AND "questionId" = ? AND EXISTS (
            SELECT 1 FROM "Quiz" quiz
            JOIN "CourseInstructor" ci ON ci."courseId" = quiz."courseId"
            WHERE quiz."id" = ? AND ci."instructorId" = ?
          )
        `).bind(quizId, questionId, quizId, user.userId),
        env.DB.prepare(`
          DELETE FROM "Question"
          WHERE "id" = ?
            AND NOT EXISTS (SELECT 1 FROM "QuizQuestion" WHERE "questionId" = ?)
            AND NOT EXISTS (SELECT 1 FROM "QuestionAttempt" WHERE "questionId" = ?)
        `).bind(questionId, questionId, questionId),
      ]);
      return new Response(null, { status: 204 });
    } catch (error) {
      return errorResponse(error, 'write');
    }
  }

export async function importQuizQuestionJson(request, env, quizId) {
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'POST' });
    }
    try {
      const user = await requireRole(request, env, 'instructor');
      const body = await readJsonBody(request, 512 * 1024);
      if (!body || typeof body !== 'object' || Array.isArray(body)
        || Object.keys(body).length !== 1 || !Array.isArray(body.questions)
        || body.questions.length === 0 || body.questions.length > 20) {
        throw new HttpError(400, 'invalid_question_batch');
      }
      const questions = body.questions.map(question => {
        const importedFields = [
          'concept',
          'correctShortAnswers',
          'createdAt',
          'id',
          'options',
          'prompt',
          'type',
          'updatedAt',
        ];
        if (!question || typeof question !== 'object' || Array.isArray(question)
          || Object.keys(question).some(key => !importedFields.includes(key))
          || !Array.isArray(question.options)) {
          throw new HttpError(400, 'invalid_question');
        }
        const normalizedQuestion = {
          concept: question.concept,
          correctShortAnswers: question.correctShortAnswers,
          prompt: question.prompt,
          type: question.type,
          options: question.options.map(option => ({
            id: option?.id,
            text: option?.text,
            isCorrect: option?.isCorrect,
          })),
        };
        return parseQuestionInput(normalizedQuestion, false);
      });
      const optionCount = questions.reduce((count, question) => count + question.options.length, 0);
      if (questions.length * 2 + optionCount > 100) {
        throw new HttpError(413, 'question_batch_too_large');
      }
      const ownedQuiz = await env.DB.prepare(`
        SELECT 1
        FROM "Quiz" quiz
        JOIN "CourseInstructor" ci ON ci."courseId" = quiz."courseId"
        WHERE quiz."id" = ? AND ci."instructorId" = ?
      `).bind(quizId, user.userId).first();
      if (!ownedQuiz) throw new HttpError(404, 'quiz_not_found');

      const now = new Date().toISOString();
      const questionIds = [];
      const statements = [];
      for (const question of questions) {
        const questionId = crypto.randomUUID();
        questionIds.push(questionId);
        statements.push(env.DB.prepare(`
          INSERT INTO "Question"
            ("id", "prompt", "concept", "type", "correctShortAnswers", "createdAt", "updatedAt")
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          questionId,
          question.prompt,
          question.concept,
          question.type,
          JSON.stringify(question.correctShortAnswers),
          now,
          now,
        ));
        statements.push(env.DB.prepare(`
          INSERT INTO "QuizQuestion" ("quizId", "questionId") VALUES (?, ?)
        `).bind(quizId, questionId));
        for (const option of question.options) {
          statements.push(env.DB.prepare(`
            INSERT INTO "Option" ("id", "text", "isCorrect", "createdAt", "updatedAt", "questionId")
            VALUES (?, ?, ?, ?, ?, ?)
          `).bind(
            crypto.randomUUID(),
            option.text,
            option.isCorrect ? 1 : 0,
            now,
            now,
            questionId,
          ));
        }
      }
      await env.DB.batch(statements);
      return jsonResponse({ questionIds }, 201);
    } catch (error) {
      return errorResponse(error, 'write');
    }
  }

export async function updateQuiz(request, env, quizId) {
  if (request.method !== 'PATCH') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'PATCH' });
  }
  try {
    const user = await requireRole(request, env, 'instructor');
    const body = await readJsonBody(request);
    const allowedFields = {
      title: value => typeof value === 'string' && value.trim().length > 0 && value.length <= 200,
      type: value => value === 'GRADED' || value === 'PRACTICE',
    };
    const keys = body && typeof body === 'object' && !Array.isArray(body) ? Object.keys(body) : [];
    if (keys.length === 0 || keys.some(key => !Object.hasOwn(allowedFields, key))
      || keys.some(key => !allowedFields[key](body[key]))) {
      throw new HttpError(400, 'invalid_quiz_update');
    }

    const assignments = keys.map(key => `"${key}" = ?`);
    const values = keys.map(key => body[key]);
    values.push(new Date().toISOString(), quizId, user.userId);
    const result = await env.DB.prepare(`
      UPDATE "Quiz"
      SET ${assignments.join(', ')}, "updatedAt" = ?
      WHERE "id" = ?
        AND EXISTS (
          SELECT 1
          FROM "CourseInstructor" ci
          WHERE ci."courseId" = "Quiz"."courseId"
            AND ci."instructorId" = ?
        )
    `).bind(...values).run();

    if (result.meta.changes !== 1) {
      throw new HttpError(404, 'quiz_not_found');
    }
    return jsonResponse({ id: quizId });
  } catch (error) {
    return errorResponse(error, 'write');
  }
}

export async function updateCourse(request, env, courseId) {
  if (request.method !== 'PATCH') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'PATCH' });
  }

  try {
    const user = await requireRole(request, env, 'instructor');
    const body = await readJsonBody(request);
    const allowedFields = {
      title: value => typeof value === 'string' && value.trim().length > 0 && value.length <= 200,
      number: value => value === null || (typeof value === 'string' && value.length <= 200),
      lmsUrl: value => value === null || (typeof value === 'string' && value.length <= 2000),
      consentFormUrl: value => value === null || (typeof value === 'string' && value.length <= 2000),
    };
    const keys = body && typeof body === 'object' && !Array.isArray(body) ? Object.keys(body) : [];
    if (keys.length === 0 || keys.some(key => !Object.hasOwn(allowedFields, key))
      || keys.some(key => !allowedFields[key](body[key]))) {
      throw new HttpError(400, 'invalid_course_update');
    }

    const assignments = keys.map(key => `"${key}" = ?`);
    const values = keys.map(key => body[key]);
    values.push(new Date().toISOString(), courseId, courseId, user.userId);
    const result = await env.DB.prepare(`
      UPDATE "Course"
      SET ${assignments.join(', ')}, "updatedAt" = ?
      WHERE "id" = ?
        AND EXISTS (
          SELECT 1 FROM "CourseInstructor"
          WHERE "courseId" = ? AND "instructorId" = ?
        )
    `).bind(...values).run();

    if (result.meta.changes !== 1) {
      throw new HttpError(404, 'course_not_found');
    }
    return jsonResponse({ id: courseId });
  } catch (error) {
    return errorResponse(error, 'write');
  }
}

export async function updateCourseSurvey(request, env, courseId) {
  if (request.method !== 'PUT') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'PUT' });
  }

  try {
    const user = await requireRole(request, env, 'instructor');
    const body = await readJsonBody(request, 64 * 1024);
    const survey = body && typeof body === 'object' && !Array.isArray(body)
      ? body.survey
      : null;
    if (!body || typeof body !== 'object' || Array.isArray(body)
      || Object.keys(body).length !== 1 || !Object.hasOwn(body, 'survey')
      || !survey || typeof survey !== 'object' || Array.isArray(survey)
      || !Array.isArray(survey.questions) || survey.questions.length > 100
      || survey.questions.some(question => !question || typeof question !== 'object'
        || Array.isArray(question) || typeof question.prompt !== 'string'
        || question.prompt.trim().length === 0 || question.prompt.length > 2000
        || !Array.isArray(question.options) || question.options.length > 100
        || question.options.some(option => !option || typeof option !== 'object'
          || Array.isArray(option) || typeof option.text !== 'string'
          || option.text.trim().length === 0 || option.text.length > 1000))) {
      throw new HttpError(400, 'invalid_survey');
    }

    const result = await env.DB.prepare(`
      UPDATE "Course"
      SET "survey" = ?, "updatedAt" = ?
      WHERE "id" = ?
        AND EXISTS (
          SELECT 1 FROM "CourseInstructor"
          WHERE "courseId" = ? AND "instructorId" = ?
        )
    `).bind(JSON.stringify(survey), new Date().toISOString(), courseId, courseId, user.userId).run();

    if (result.meta.changes !== 1) {
      throw new HttpError(404, 'course_not_found');
    }
    return jsonResponse({ survey });
  } catch (error) {
    return errorResponse(error, 'write');
  }
}

export async function removeCourseInstructor(request, env, courseId) {
  if (request.method !== 'DELETE') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'DELETE' });
  }

  try {
    const user = await requireRole(request, env, 'instructor');
    const body = await readJsonBody(request);
    if (!body || typeof body !== 'object' || Array.isArray(body)
      || typeof body.email !== 'string' || body.email.length > 320
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
      throw new HttpError(400, 'invalid_email');
    }
    const email = body.email.trim().toLowerCase();

    const courseOwnership = await env.DB.prepare(`
      SELECT 1
      FROM "CourseInstructor"
      WHERE "courseId" = ? AND "instructorId" = ?
    `).bind(courseId, user.userId).first();
    if (!courseOwnership) {
      throw new HttpError(404, 'course_not_found');
    }

    const inviteResult = await env.DB.prepare(`
      DELETE FROM "PendingCourseInvite"
      WHERE "courseId" = ? AND lower("email") = ?
        AND EXISTS (
          SELECT 1 FROM "CourseInstructor"
          WHERE "courseId" = ? AND "instructorId" = ?
        )
    `).bind(courseId, email, courseId, user.userId).run();
    if (inviteResult.meta.changes > 0) {
      return jsonResponse({ message: 'Invite canceled' });
    }

    const instructor = await env.DB.prepare(`
      SELECT i."id"
      FROM "CourseInstructor" ci
      JOIN "Instructor" i ON i."id" = ci."instructorId"
      WHERE ci."courseId" = ? AND lower(i."email") = ?
      LIMIT 1
    `).bind(courseId, email).first();
    if (!instructor) {
      const stillOwnsCourse = await env.DB.prepare(`
        SELECT 1
        FROM "CourseInstructor"
        WHERE "courseId" = ? AND "instructorId" = ?
      `).bind(courseId, user.userId).first();
      if (!stillOwnsCourse) {
        throw new HttpError(404, 'course_not_found');
      }
      return jsonResponse({ message: 'Instructor was not in the course.' });
    }

    const countResult = await env.DB.prepare(`
      SELECT COUNT(*) AS "instructorCount"
      FROM "CourseInstructor"
      WHERE "courseId" = ? AND EXISTS (
        SELECT 1 FROM "CourseInstructor"
        WHERE "courseId" = ? AND "instructorId" = ?
      )
    `).bind(courseId, courseId, user.userId).first();
    if (!countResult || Number(countResult.instructorCount) <= 1) {
      return jsonResponse({
        message: `${email} is the only instructor in this course, and cannot be removed. To transfer ownership of a course, invite another instructor and have them remove you from the course.`,
      });
    }

    const result = await env.DB.prepare(`
      DELETE FROM "CourseInstructor"
      WHERE "courseId" = ? AND "instructorId" = ?
        AND EXISTS (
          SELECT 1 FROM "CourseInstructor"
          WHERE "courseId" = ? AND "instructorId" = ?
        )
        AND (SELECT COUNT(*) FROM "CourseInstructor" WHERE "courseId" = ?) > 1
    `).bind(courseId, instructor.id, courseId, user.userId, courseId).run();
    if (result.meta.changes === 1) {
      return jsonResponse({ message: 'Instructor removed' });
    }

    const remaining = await env.DB.prepare(`
      SELECT COUNT(*) AS "instructorCount"
      FROM "CourseInstructor"
      WHERE "courseId" = ? AND EXISTS (
        SELECT 1 FROM "CourseInstructor"
        WHERE "courseId" = ? AND "instructorId" = ?
      )
    `).bind(courseId, courseId, user.userId).first();
    if (remaining && Number(remaining.instructorCount) <= 1) {
      return jsonResponse({
        message: `${email} is the only instructor in this course, and cannot be removed. To transfer ownership of a course, invite another instructor and have them remove you from the course.`,
      });
    }
    return jsonResponse({ message: 'Instructor was not in the course.' });
  } catch (error) {
    return errorResponse(error, 'write');
  }
}
