import { handleTrackingEvent } from './tracking.js';
import { handleLtiLaunch } from './lti.js';
import { createDemoStudentSession } from './demo.js';
import { inviteCourseInstructor, sendFeedback } from './communications.js';
import {
  instructorLogin, instructorSignup, requestInstructorPasswordReset, resetInstructorPassword,
  updateInstructorProfile,
} from './accounts.js';
import { getQuizReport } from './reports.js';
import {
  attemptStudentQuestion, completeStudentQuizAttempt, createCourse, createQuiz,
  createQuizQuestion, deleteCourse, deleteQuiz, deleteQuizQuestion, getCourse,
  getCourseConcepts, getCourseSurveyResults, getCurrentInstructor, getCurrentStudent, getQuiz,
  getQuizAttemptReview, getCourseScores, getQuizImportableQuestions, getQuizQuestion,
  getStudentCourseDashboard, getStudentCourseConsent, getStudentCourseSurvey,
  importQuizQuestionJson, importQuizQuestions, rateStudentQuizConcepts, removeCourseInstructor,
  startStudentQuizAttempt, updateQuizQuestion, submitStudentCourseConsent,
  submitStudentSurveyResult, updateCourse, updateCourseSurvey, updateQuiz,
} from './courses.js';
import { jsonResponse } from './http.js';

function isPathOrDescendant(pathname, path) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (isPathOrDescendant(pathname, '/api')) {
      if (pathname === '/api/health') {
        if (request.method !== 'GET') {
          return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'GET' });
        }

        try {
          await env.DB.prepare('SELECT 1').first();
          return jsonResponse({ status: 'ok', database: 'ok' });
        } catch (error) {
          console.error('D1 health check failed', error);
          return jsonResponse({ error: 'database_unavailable' }, 503);
        }
      }

      if (pathname === '/api/tracking/events') {
        return handleTrackingEvent(request, env);
      }

      if (pathname === '/api/feedback') {
        return sendFeedback(request, env);
      }

      if (pathname === '/api/demo/student-session') {
        return createDemoStudentSession(request, env);
      }

      if (pathname === '/api/instructor') {
        return getCurrentInstructor(request, env);
      }

      if (pathname === '/api/auth/login') {
        return instructorLogin(request, env);
      }

      if (pathname === '/api/auth/signup') {
        return instructorSignup(request, env);
      }

      if (pathname === '/api/auth/password-reset-requests') {
        return requestInstructorPasswordReset(request, env);
      }

      if (pathname === '/api/auth/password-resets') {
        return resetInstructorPassword(request, env);
      }

      if (pathname === '/api/instructor/profile') {
        return updateInstructorProfile(request, env);
      }

      if (pathname === '/api/student') {
        return getCurrentStudent(request, env);
      }

      if (pathname === '/api/courses') {
        return createCourse(request, env);
      }

      const quizImportQuestionsMatch =
        /^\/api\/quizzes\/([^/]+)\/questions\/import$/.exec(pathname);
      if (quizImportQuestionsMatch) {
        return importQuizQuestions(request, env, quizImportQuestionsMatch[1]);
      }

      const quizImportJsonMatch =
        /^\/api\/quizzes\/([^/]+)\/questions\/import-json$/.exec(pathname);
      if (quizImportJsonMatch) {
        return importQuizQuestionJson(request, env, quizImportJsonMatch[1]);
      }

      const quizQuestionsMatch = /^\/api\/quizzes\/([^/]+)\/questions$/.exec(pathname);
      if (quizQuestionsMatch) {
        return createQuizQuestion(request, env, quizQuestionsMatch[1]);
      }

      const quizQuestionMatch = /^\/api\/quizzes\/([^/]+)\/questions\/([^/]+)$/.exec(pathname);
      if (quizQuestionMatch) {
        if (request.method === 'DELETE') {
          return deleteQuizQuestion(request, env, quizQuestionMatch[1], quizQuestionMatch[2]);
        }
        if (request.method === 'PUT') {
          return updateQuizQuestion(
            request,
            env,
            quizQuestionMatch[1],
            quizQuestionMatch[2],
          );
        }
        return getQuizQuestion(request, env, quizQuestionMatch[1], quizQuestionMatch[2]);
      }

      const quizAttemptReviewMatch = /^\/api\/quiz-attempts\/([^/]+)\/review$/.exec(pathname);
      if (quizAttemptReviewMatch) {
        return getQuizAttemptReview(request, env, quizAttemptReviewMatch[1]);
      }

      const quizReportMatch = /^\/api\/quizzes\/([^/]+)\/report$/.exec(pathname);
      if (quizReportMatch) {
        return getQuizReport(request, env, quizReportMatch[1]);
      }

      const quizImportableQuestionsMatch =
        /^\/api\/quizzes\/([^/]+)\/importable-questions$/.exec(pathname);
      if (quizImportableQuestionsMatch) {
        return getQuizImportableQuestions(request, env, quizImportableQuestionsMatch[1]);
      }

      const quizMatch = /^\/api\/quizzes\/([^/]+)$/.exec(pathname);
      if (quizMatch) {
        if (request.method === 'GET') {
          return getQuiz(request, env, quizMatch[1]);
        }
        if (request.method === 'DELETE') {
          return deleteQuiz(request, env, quizMatch[1]);
        }
        return updateQuiz(request, env, quizMatch[1]);
      }

      const quizzesMatch = /^\/api\/courses\/([^/]+)\/quizzes$/.exec(pathname);
      if (quizzesMatch) {
        return createQuiz(request, env, quizzesMatch[1]);
      }

      const surveyMatch = /^\/api\/courses\/([^/]+)\/survey$/.exec(pathname);
      if (surveyMatch) {
        return updateCourseSurvey(request, env, surveyMatch[1]);
      }

      const courseScoresMatch = /^\/api\/courses\/([^/]+)\/scores$/.exec(pathname);
      if (courseScoresMatch) {
        return getCourseScores(request, env, courseScoresMatch[1]);
      }

      const conceptsMatch = /^\/api\/courses\/([^/]+)\/concepts$/.exec(pathname);
      if (conceptsMatch) {
        return getCourseConcepts(request, env, conceptsMatch[1]);
      }

      const surveyResultsMatch = /^\/api\/courses\/([^/]+)\/survey-results$/.exec(pathname);
      if (surveyResultsMatch) {
        return getCourseSurveyResults(request, env, surveyResultsMatch[1]);
      }

      const studentSurveyMatch = /^\/api\/student\/courses\/([^/]+)\/survey$/.exec(pathname);
      if (studentSurveyMatch) {
        return getStudentCourseSurvey(request, env, studentSurveyMatch[1]);
      }

      const studentConsentMatch = /^\/api\/student\/courses\/([^/]+)\/consent$/.exec(pathname);
      if (studentConsentMatch) {
        if (request.method === 'GET') {
          return getStudentCourseConsent(request, env, studentConsentMatch[1]);
        }
        return submitStudentCourseConsent(request, env, studentConsentMatch[1]);
      }

      const studentDashboardMatch =
        /^\/api\/student\/courses\/([^/]+)\/dashboard$/.exec(pathname);
      if (studentDashboardMatch) {
        return getStudentCourseDashboard(request, env, studentDashboardMatch[1]);
      }

      const studentSurveyResultMatch =
        /^\/api\/student\/courses\/([^/]+)\/survey-results$/.exec(pathname);
      if (studentSurveyResultMatch) {
        return submitStudentSurveyResult(request, env, studentSurveyResultMatch[1]);
      }

      const studentQuizAttemptMatch = /^\/api\/student\/quizzes\/([^/]+)\/attempt$/.exec(pathname);
      if (studentQuizAttemptMatch) {
        return startStudentQuizAttempt(request, env, studentQuizAttemptMatch[1]);
      }

      const studentQuestionAttemptMatch =
        /^\/api\/student\/quiz-attempts\/([^/]+)\/questions$/.exec(pathname);
      if (studentQuestionAttemptMatch) {
        return attemptStudentQuestion(request, env, studentQuestionAttemptMatch[1]);
      }

      const studentCompleteAttemptMatch =
        /^\/api\/student\/quiz-attempts\/([^/]+)\/complete$/.exec(pathname);
      if (studentCompleteAttemptMatch) {
        return completeStudentQuizAttempt(request, env, studentCompleteAttemptMatch[1]);
      }

      const studentConceptRatingsMatch =
        /^\/api\/student\/quiz-attempts\/([^/]+)\/concept-confidences$/.exec(pathname);
      if (studentConceptRatingsMatch) {
        return rateStudentQuizConcepts(request, env, studentConceptRatingsMatch[1]);
      }

      const instructorsMatch = /^\/api\/courses\/([^/]+)\/instructors$/.exec(pathname);
      if (instructorsMatch) {
        if (request.method === 'POST') {
          return inviteCourseInstructor(request, env, instructorsMatch[1]);
        }
        return removeCourseInstructor(request, env, instructorsMatch[1]);
      }

      const courseMatch = /^\/api\/courses\/([^/]+)$/.exec(pathname);
      if (courseMatch) {
        if (request.method === 'GET') {
          return getCourse(request, env, courseMatch[1]);
        }
        if (request.method === 'DELETE') {
          return deleteCourse(request, env, courseMatch[1]);
        }
        return updateCourse(request, env, courseMatch[1]);
      }

      return jsonResponse({ error: 'not_found' }, 404);
    }

    if (isPathOrDescendant(pathname, '/lti')) {
      return handleLtiLaunch(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
