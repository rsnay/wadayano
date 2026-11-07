import { requireRole } from './auth.js';
import { HttpError, jsonResponse } from './http.js';

function errorResponse(error) {
  if (error instanceof HttpError) {
    return jsonResponse({ error: error.code }, error.status);
  }
  console.error('Quiz report API failed');
  return jsonResponse({ error: 'database_unavailable' }, 503);
}

export async function getQuizReport(request, env, quizId) {
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'GET' });
  }

  try {
    const user = await requireRole(request, env, 'instructor');
    const quiz = await env.DB.prepare(`
      SELECT quiz."id", quiz."title", quiz."type",
        course."id" AS "courseId", course."title" AS "courseTitle"
      FROM "Quiz" quiz
      JOIN "Course" course ON course."id" = quiz."courseId"
      JOIN "CourseInstructor" ci ON ci."courseId" = course."id"
      WHERE quiz."id" = ? AND ci."instructorId" = ?
    `).bind(quizId, user.userId).first();
    if (!quiz) throw new HttpError(404, 'quiz_not_found');

    const [studentsResult, questionsResult, optionsResult, attemptsResult,
      questionAttemptsResult, confidencesResult] = await Promise.all([
      env.DB.prepare(`
        SELECT student."id", student."name"
        FROM "CourseStudent" enrollment
        JOIN "Student" student ON student."id" = enrollment."studentId"
        WHERE enrollment."courseId" = ?
        ORDER BY student."name", student."id"
      `).bind(quiz.courseId).all(),
      env.DB.prepare(`
        SELECT question."id", question."concept", question."prompt", question."type",
          question."correctShortAnswers"
        FROM "QuizQuestion" link
        JOIN "Question" question ON question."id" = link."questionId"
        WHERE link."quizId" = ?
        ORDER BY link.rowid
      `).bind(quizId).all(),
      env.DB.prepare(`
        SELECT option."id", option."questionId", option."text", option."isCorrect"
        FROM "Option" option
        JOIN "QuizQuestion" link ON link."questionId" = option."questionId"
        WHERE link."quizId" = ?
        ORDER BY link.rowid, option.rowid
      `).bind(quizId).all(),
      env.DB.prepare(`
        SELECT attempt."id", attempt."studentId", student."name" AS "studentName",
          attempt."createdAt", attempt."completed", attempt."score"
        FROM "QuizAttempt" attempt
        JOIN "Student" student ON student."id" = attempt."studentId"
        WHERE attempt."quizId" = ? AND attempt."completed" IS NOT NULL
        ORDER BY attempt."createdAt", attempt."id"
      `).bind(quizId).all(),
      env.DB.prepare(`
        SELECT link."quizAttemptId", answer."id", answer."isCorrect", answer."isConfident",
          answer."optionId", answer."shortAnswer", answer."correctShortAnswer",
          question."id" AS "questionId", question."concept"
        FROM "QuizQuestionAttempt" link
        JOIN "QuestionAttempt" answer ON answer."id" = link."questionAttemptId"
        JOIN "Question" question ON question."id" = answer."questionId"
        JOIN "QuizAttempt" attempt ON attempt."id" = link."quizAttemptId"
        WHERE attempt."quizId" = ? AND attempt."completed" IS NOT NULL
        ORDER BY attempt."createdAt", attempt."id", answer."createdAt", answer."id"
      `).bind(quizId).all(),
      env.DB.prepare(`
        SELECT link."quizAttemptId", confidence."id", confidence."concept",
          confidence."confidence"
        FROM "QuizConceptConfidence" link
        JOIN "ConceptConfidence" confidence ON confidence."id" = link."conceptConfidenceId"
        JOIN "QuizAttempt" attempt ON attempt."id" = link."quizAttemptId"
        WHERE attempt."quizId" = ? AND attempt."completed" IS NOT NULL
        ORDER BY attempt."createdAt", attempt."id", confidence."createdAt", confidence."id"
      `).bind(quizId).all(),
    ]);

    const results = [
      studentsResult,
      questionsResult,
      optionsResult,
      attemptsResult,
      questionAttemptsResult,
      confidencesResult,
    ];
    if (results.some(result => !Array.isArray(result.results))) {
      throw new Error('Unexpected D1 result');
    }

    const questionsById = new Map(questionsResult.results.map(question => {
      let correctShortAnswers = question.correctShortAnswers;
      if (typeof correctShortAnswers === 'string') {
        correctShortAnswers = JSON.parse(correctShortAnswers);
      }
      return [question.id, { ...question, correctShortAnswers, options: [] }];
    }));
    for (const option of optionsResult.results) {
      const question = questionsById.get(option.questionId);
      if (!question) throw new Error('Unexpected question option relation');
      question.options.push({
        id: option.id,
        text: option.text,
        isCorrect: option.isCorrect === null ? null : Boolean(option.isCorrect),
      });
    }

    const attemptsById = new Map(attemptsResult.results.map(attempt => [attempt.id, {
      id: attempt.id,
      student: { id: attempt.studentId, name: attempt.studentName },
      createdAt: attempt.createdAt,
      completed: attempt.completed,
      score: attempt.score,
      questionAttempts: [],
      conceptConfidences: [],
    }]));
    for (const answer of questionAttemptsResult.results) {
      const attempt = attemptsById.get(answer.quizAttemptId);
      if (!attempt) throw new Error('Unexpected quiz question attempt relation');
      attempt.questionAttempts.push({
        id: answer.id,
        isCorrect: Boolean(answer.isCorrect),
        isConfident: Boolean(answer.isConfident),
        question: { id: answer.questionId, concept: answer.concept },
        option: answer.optionId ? { id: answer.optionId } : null,
        shortAnswer: answer.shortAnswer,
        correctShortAnswer: answer.correctShortAnswer,
      });
    }
    for (const confidence of confidencesResult.results) {
      const attempt = attemptsById.get(confidence.quizAttemptId);
      if (!attempt) throw new Error('Unexpected quiz confidence relation');
      attempt.conceptConfidences.push({
        id: confidence.id,
        concept: confidence.concept,
        confidence: confidence.confidence,
      });
    }

    return jsonResponse({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        type: quiz.type,
        course: {
          id: quiz.courseId,
          title: quiz.courseTitle,
          students: studentsResult.results,
        },
        questions: [...questionsById.values()],
        quizAttempts: [...attemptsById.values()],
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
