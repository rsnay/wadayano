import React from 'react';
import { Link, useHistory, useParams } from 'react-router-dom';
import { useQuery } from 'react-apollo';
import gql from 'graphql-tag';
import TimeAgo from 'react-timeago';
import { useTracking } from 'react-tracking';

import { QUIZ_TYPE_NAMES } from '../../constants';

import PageTitle from '../shared/PageTitle';
import ErrorBox from '../shared/ErrorBox';
import Spinner from '../shared/Spinner';
import withAuthCheck from '../shared/AuthCheck';
import { formatScore, wadayanoScore, predictedScore } from '../../utils';

// Get the course information and info about practice quizzes
const COURSE_QUERY = gql`
  query courseQuery($id: ID!) {
    course(id: $id) {
      id
      title
      lmsUrl
      consentFormUrl
      quizzes(where: { type: PRACTICE }) {
        id
        title
        questions {
          id
        }
      }
    }
  }
`;

// Query all quiz attempts for the current student
const QUIZ_ATTEMPTS_QUERY = gql`
  query($courseId: ID!) {
    currentStudentQuizAttempts(orderBy: completed_DESC, courseId: $courseId) {
      id
      quiz {
        id
        title
        type
        questions {
          id
        }
      }
      createdAt
      completed
      questionAttempts {
        id
        isCorrect
        isConfident
      }
      score
      conceptConfidences {
        id
        concept
        confidence
      }
    }
  }
`;

/**
 * This page presents tables of unfinished quiz attempts, available practice quizzes,
 * and past quiz attempts for a given course. (Based on the student currently logged in).
 */
const Dashboard = () => {
  const history = useHistory();
  const { courseId } = useParams();
  const tracking = useTracking();

  const courseQuery = useQuery(COURSE_QUERY, { variables: { id: courseId } });
  const quizAttemptsQuery = useQuery(QUIZ_ATTEMPTS_QUERY, { variables: { courseId } });

  const reviewQuizAttempt = (attempt, e) => {
    if (e) {
      e.stopPropagation();
    }
    tracking.trackEvent({
      page: 'Dashboard',
      courseId,
      action: 'STUDENT_REVIEW_QUIZ_ATTEMPT',
      quizAttemptId: attempt.id,
      quizTitle: attempt.quiz.title,
      quizType: attempt.quiz.type,
      quizAttemptScore: attempt.score,
      quizAttemptWadayanoScore: wadayanoScore(attempt),
      quizAttemptPredictedScore: predictedScore(attempt),
    });
    history.push(`/student/quiz/review/${attempt.id}`);
  };

  if ((courseQuery && courseQuery.loading) || (quizAttemptsQuery && quizAttemptsQuery.loading)) {
    return <Spinner />;
  }

  if ((courseQuery && courseQuery.error) || (quizAttemptsQuery && quizAttemptsQuery.error)) {
    return (
      <ErrorBox>
        <p>Couldn’t load dashboard. Please try again later.</p>
      </ErrorBox>
    );
  }

  const { course } = courseQuery.data;
  // Quizzes in course are filtered in query to only practice quizzes
  const practiceQuizzes = course.quizzes;
  // Quiz attempts contains graded and practice quiz attempts
  const quizAttempts = quizAttemptsQuery.data.currentStudentQuizAttempts;
  const unfinishedAttempts = quizAttempts.filter(attempt => attempt.completed === null);
  const pastAttempts = quizAttempts.filter(attempt => attempt.completed !== null);

  const lmsUrlLink = actionText => {
    if (course.lmsUrl && course.lmsUrl !== '') {
      return (
        <a target="_blank" rel="noopener noreferrer" href={course.lmsUrl}>
          {actionText}
        </a>
      );
    }
    return actionText;
  };

  let practiceQuizzesTable;
  if (practiceQuizzes.length > 0) {
    practiceQuizzesTable = (
      <div className="table-wrapper">
        <table className="table is-striped is-hoverable is-fullwidth quiz-table responsive-table">
          <thead>
            <tr className="sticky-header">
              <th style={{ width: '99%' }}>Title</th>
              <th style={{ whiteSpace: 'nowrap' }}>
                <span className="is-hidden-touch">Questions</span>
                <span className="is-hidden-desktop">?s</span>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {practiceQuizzes.map(quiz => (
              <tr key={quiz.id}>
                <td data-title="Title">
                  <Link to={`/student/quiz/${quiz.id}`} className="has-text-black is-block">
                    {quiz.title}
                  </Link>
                </td>
                <td data-title="Questions">{quiz.questions.length}</td>
                <td data-title="Actions">
                  <Link to={`/student/quiz/${quiz.id}`} className="button is-primary is-outlined">
                    <span className="icon">
                      <i className="fas fa-rocket" />
                    </span>
                    <span>Practice Quiz</span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } else {
    practiceQuizzesTable = (
      <div className="notification has-text-centered">
        No practice quizzes are currently available for this course.
      </div>
    );
  }

  const unfinishedAttemptsTable = unfinishedAttempts.length > 0 && (
    <div style={{ overflowX: 'auto' }}>
      <table
        className="table is-striped is-hoverable is-fullwidth quiz-table responsive-table"
        style={{ border: 'solid #209cee 1px' }}
      >
        <thead>
          <tr>
            <th style={{ whiteSpace: 'nowrap' }}>Started</th>
            <th style={{ width: '99%' }}>Quiz</th>
            <th style={{ whiteSpace: 'nowrap' }}>
              <span className="is-hidden-touch">Questions</span>
              <span className="is-hidden-desktop">?s</span>
            </th>
            <th>Completion</th>
            <th>Resume</th>
          </tr>
        </thead>
        <tbody>
          {unfinishedAttempts.map(attempt => (
            <tr key={attempt.id}>
              <td data-title="Started" style={{ whiteSpace: 'nowrap' }}>
                <TimeAgo date={attempt.createdAt} />
              </td>
              <td data-title="Quiz">
                <Link to={`/student/quiz/${attempt.quiz.id}`} className="has-text-black is-block">
                  {attempt.quiz.title}
                </Link>
              </td>
              <td data-title="Questions">{attempt.quiz.questions.length}</td>
              <td data-title="Completion">
                {formatScore(attempt.questionAttempts.length / attempt.quiz.questions.length)}
              </td>
              <td data-title="Resume">
                <Link
                  to={`/student/quiz/${attempt.quiz.id}`}
                  className="button is-primary is-outlined"
                >
                  <span className="icon">
                    <i className="fas fa-rocket" />
                  </span>
                  <span>Resume</span>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  let pastAttemptsTable;
  if (pastAttempts.length > 0) {
    pastAttemptsTable = (
      <div className="table-wrapper">
        <table className="table is-striped is-hoverable is-fullwidth quiz-table responsive-table">
          <thead>
            <tr className="sticky-header">
              <th style={{ whiteSpace: 'nowrap' }}>Completed</th>
              <th style={{ width: '99%' }}>Quiz</th>
              <th style={{ whiteSpace: 'nowrap' }}>
                <span className="is-hidden-touch">Questions</span>
                <span className="is-hidden-desktop">?s</span>
              </th>
              <th>Type</th>
              <th>Score</th>
              <th style={{ whiteSpace: 'nowrap' }}>Predicted Score</th>
              <th style={{ whiteSpace: 'nowrap' }}>Wadayano Score</th>
              <th>Review</th>
            </tr>
          </thead>
          <tbody>
            {pastAttempts.map(attempt => (
              <tr key={attempt.id} onClick={e => reviewQuizAttempt(attempt, e)}>
                <td data-title="Completed" style={{ whiteSpace: 'nowrap' }}>
                  <TimeAgo date={attempt.completed} />
                </td>
                <td data-title="Quiz">{attempt.quiz.title}</td>
                <td data-title="Questions">{attempt.quiz.questions.length}</td>
                <td data-title="Type">{QUIZ_TYPE_NAMES[attempt.quiz.type]}</td>
                <td data-title="Score">{attempt.completed ? formatScore(attempt.score) : 'n/a'}</td>
                <td data-title="Predicted Score">
                  {attempt.completed ? formatScore(predictedScore(attempt)) : 'n/a'}
                </td>
                <td data-title="Wadayano Score">
                  {attempt.completed ? formatScore(wadayanoScore(attempt)) : 'n/a'}
                </td>
                <td data-title="Review">
                  <button
                    onClick={e => reviewQuizAttempt(attempt, e)}
                    className="button is-info is-outlined"
                    type="button"
                  >
                    <span className="icon">
                      <i className="fas fa-history" />
                    </span>
                    <span>Review</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } else {
    pastAttemptsTable = (
      <div className="notification has-text-centered">
        No quiz attempts yet. Choose a practice quiz from the list above, or{' '}
        {lmsUrlLink('launch a quiz from your learning management system')} to get started.
      </div>
    );
  }

  return (
    <section className="section">
      <PageTitle title={`wadayano | ${course.title}`} />
      <div className="container">
        <div className="is-flex-tablet">
          <h1 className="title is-3" style={{ flex: 1 }}>
            {course.title} Dashboard
          </h1>
          {course.consentFormUrl && (
            <Link
              to={`/student/consent/${course.id}`}
              className="button is-light"
              style={{ marginBottom: '1rem' }}
            >
              <span className="icon">
                <i className="fas fa-clipboard-check" />
              </span>
              <span>Review Consent Form</span>
            </Link>
          )}
        </div>
        <hr />

        {unfinishedAttempts.length > 0 && (
          <section className="message is-info">
            <div className="message-header">
              <h4 className="title is-4 has-text-white">Unfinished Quiz Attempts</h4>
            </div>
            {unfinishedAttemptsTable}
          </section>
        )}

        <section>
          <h4 className="title is-4">Practice Quizzes</h4>
          <p>
            <i>These quizzes do not affect your grade.</i> To take a quiz that is graded for this
            course, {lmsUrlLink('launch it from your course’s learning management system')} (i.e.
            Canvas or Learning Suite).
            <br />
            <br />
          </p>

          {practiceQuizzesTable}

          <hr />
        </section>

        <section>
          <h4 className="title is-4">Past Quiz Attempts</h4>

          {pastAttemptsTable}

          <hr />
        </section>
      </div>
    </section>
  );
};

export default withAuthCheck(Dashboard, { student: true });
