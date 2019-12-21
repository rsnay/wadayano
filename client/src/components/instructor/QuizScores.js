import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from 'react-apollo';

import ButterToast, { ToastTemplate } from '../shared/Toast';
import ErrorBox from '../shared/ErrorBox';
import Spinner from '../shared/Spinner';
import Modal from '../shared/Modal';
import Breadcrumbs from '../shared/Breadcrumbs';

import { formatScore, predictedScore, wadayanoScore, confidenceAnalysis } from '../../utils';
import { QUIZ_TYPE_NAMES } from '../../constants';
import QuizReview from '../student/QuizReview';

import AggregatedQuizReview, { QUIZ_QUERY } from './AggregatedQuizReview';
import { sortFunctions } from '../../sort-utils';

// If new columns are added here, corresponding sort functions should be added in `../../sort-utils'
const columns = [
  { title: 'Student Name', columnId: 'name', sortable: true },
  { title: 'Attempts', columnId: 'attempts', sortable: true },
  { title: 'First Attempt', columnId: 'highestScore', sortable: true },
  { title: 'Predicted Score', columnId: 'predictedScore', sortable: true },
  { title: 'Wadayano Score', columnId: 'wadayanoScore', sortable: true },
  { title: 'Confidence Analysis', columnId: 'confidenceAnalysis', sortable: true },
  { title: 'View Report', columnId: 'viewReport', sortable: false },
];

/**
 * Displays an <AggregatedQuizReview /> component and a table of all students in the course,
 * with the scores of their *first* attempt of this quiz.
 */
const QuizScores = () => {
  const { quizId } = useParams();

  const [sortColumn, setSortColumn] = useState('name');
  const [sortAscending, setSortAscending] = useState(true);
  // Will hold data for student score rows
  const [studentScores, setStudentScores] = useState(null);
  // State for viewing a student’s attempts
  const [currentStudentReview, setCurrentStudentReview] = useState(null);
  const [currentQuizAttempts, setCurrentQuizAttempts] = useState(null);
  const [chosenAttempt, setChosenAttempt] = useState(null);

  // QUIZ_QUERY is imported from AggregatedQuizReview, since that query fetches everything
  // (and more) that this component needs. If both use the same query, Apollo can cache the
  // result for quicker initial display. This does lead to increased component coupling, though.
  const { error, data } = useQuery(QUIZ_QUERY, {
    fetchPolicy: 'cache-and-network',
    variables: { id: quizId },
  });

  // Processes all the quiz attempt data. Wrapped in this function for easier error catching from query-triggered effect
  const processData = quiz => {
    // Prepare data for the sortable table
    const { course } = quiz;

    const newStudentScores = course.students.map(student => {
      // Determine if student took this quiz
      let attempt = null;
      const studentAttempts = quiz.quizAttempts.filter(
        a => a.student.id === student.id && a.completed
      );
      // Base calculations on first attempt
      if (studentAttempts.length > 0) {
        [attempt] = studentAttempts;
      }
      // Output score for each student, if quiz was taken
      if (attempt !== null) {
        const attemptPredictedScore = predictedScore(attempt);
        const attemptWadayanoScore = wadayanoScore(attempt);
        const attemptConfidenceAnalysis = confidenceAnalysis(attempt);
        return {
          id: student.id,
          name: student.name,
          attempts: studentAttempts.length,
          highestScore: attempt.score,
          chosenAttempt: attempt,
          predictedScore: attemptPredictedScore,
          wadayanoScore: attemptWadayanoScore,
          confidenceAnalysis: attemptConfidenceAnalysis,
        };
      }
      return {
        id: student.id,
        name: student.name,
        attempts: 0,
        highestScore: '',
        chosenAttempt: null,
        wadayanoScore: '',
        confidenceAnalysis: { text: '0' },
      };
    });

    // Sort by name by default
    newStudentScores.sort(sortFunctions.name);

    setStudentScores(newStudentScores);
  };

  // When the query data gets updated, process it
  useEffect(() => {
    // Rather than check if query is ‘loading,’ check if it doesn’t have data, since
    // the cache-and-network fetch policy is used, which returns data from cache but
    // still sets loading=true while it re-fetches
    if (!error && data && data.quiz) {
      try {
        processData(data.quiz);
      } catch (err) {
        console.error(err);
        ButterToast.raise({
          content: (
            <ToastTemplate
              content="There was an error generating the aggregated report for this quiz. Please contact us if this problem persists."
              className="is-danger"
            />
          ),
        });
      }
    }
  }, [error, data]);

  const sortByColumn = e => {
    // Get data-column prop from header that was clicked
    const newSortColumn = e.target.dataset.column;
    let newSortAscending = sortAscending;

    // Check if we're toggling sort direction
    if (sortColumn === newSortColumn) {
      newSortAscending = !sortAscending;
    }

    // Sort data
    const newStudentScores = [...studentScores];
    newStudentScores.sort(sortFunctions[newSortColumn]);
    if (!newSortAscending) {
      newStudentScores.reverse();
    }

    // Update state
    setSortAscending(newSortAscending);
    setSortColumn(newSortColumn);
    setStudentScores(newStudentScores);
  };

  const showStudentAttempts = student => {
    const attempts = data.quiz.quizAttempts.filter(a => a.student.id === student.id && a.completed);
    setCurrentStudentReview(student);
    setCurrentQuizAttempts(attempts);
    setChosenAttempt(student.chosenAttempt);
  };

  // If scores query had an error
  if (error) {
    return (
      <ErrorBox>
        <p>Couldn’t load quiz scores.</p>
      </ErrorBox>
    );
  }

  // If data not yet loaded or processed
  if (!studentScores) {
    return <Spinner />;
  }

  const { quiz } = data;
  const { course } = quiz;

  let scoresTable;
  if (studentScores.length === 0) {
    scoresTable = (
      <p className="notification is-light">
        There are no students enrolled in this course. When a student launches a quiz from the
        course’s LMS, he/she will be automatically enrolled.
      </p>
    );
  } else {
    const scoreRows = studentScores.map(student => {
      // Output score for each student, if quiz was taken
      return (
        <tr
          key={student.id}
          className="has-cursor-pointer"
          onClick={student.attempts > 0 ? () => showStudentAttempts(student) : () => {}}
        >
          <td style={{ whiteSpace: 'nowrap' }}>{student.name}</td>
          {student.attempts > 0 ? (
            <>
              <td>{student.attempts}</td>
              <td>{formatScore(student.highestScore)}</td>
              <td>{formatScore(student.predictedScore)}</td>
              <td>{formatScore(student.wadayanoScore)}</td>
              <td>
                <span className={`confidence-emoji is-medium ${student.confidenceAnalysis.key}`} />
                &nbsp;{student.confidenceAnalysis.text}
              </td>
              <td>
                <button
                  className="button is-light"
                  onClick={() => showStudentAttempts(student)}
                  type="button"
                >
                  <span className="icon">
                    <i className="fas fa-history" />
                  </span>
                  <span>View Report</span>
                </button>
              </td>
            </>
          ) : (
            <td colSpan="6">
              <i>Quiz not taken</i>
            </td>
          )}
        </tr>
      );
    });

    scoresTable = (
      <div className="table-wrapper">
        <table className="table is-striped is-hoverable is-fullwidth is-vcentered survey-results-table">
          <thead>
            <tr className="sticky-header sortable-header">
              {columns.map(col => (
                <th
                  key={col.columnId}
                  className={sortColumn === col.columnId ? 'has-background-light' : ''}
                  data-column={col.columnId}
                  onClick={col.sortable ? sortByColumn : () => {}}
                >
                  {col.title}
                  {sortColumn === col.columnId && (
                    <span className="icon" style={{ width: 0, float: 'right' }}>
                      <i className="fas fa-sort" />
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{scoreRows}</tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      <section className="section">
        <div className="container">
          <Breadcrumbs
            links={[
              { to: '/instructor/courses', title: 'Courses' },
              { to: `/instructor/course/${course.id}`, title: course.title },
              {
                to: `/instructor/quiz/${quiz.id}/score`,
                title: 'View Scores',
                active: true,
              },
            ]}
          />

          <h3 className="title is-3">{quiz.title}</h3>
          <h4 className="subtitle is-4">{QUIZ_TYPE_NAMES[quiz.type]} Quiz</h4>
        </div>
      </section>

      <div className="content" style={{ margin: '0 5% 2rem 5%' }}>
        {/* Cards with score and confidence distributions, and aggregate concept scores */}
        <AggregatedQuizReview quizId={quiz.id} />

        {/* Table of all students’ individual first-attempt scores */}
        <h3 className="title">Students</h3>
        {scoresTable}

        {currentStudentReview && (
          <Modal
            modalState
            closeModal={() => {
              setCurrentStudentReview(null);
              setCurrentQuizAttempts(null);
            }}
            title={`Attempts from ${currentStudentReview.name}`}
            cardClassName="quiz-scores-report-modal"
          >
            <div className="tabs quiz-attempt-selector">
              <ul>
                {currentQuizAttempts.map((attempt, index) => (
                  <li
                    className={chosenAttempt.id === attempt.id ? 'is-active' : ''}
                    key={attempt.id}
                  >
                    <a
                      href={`#${attempt.id}`}
                      onClick={e => {
                        setChosenAttempt(attempt);
                        e.preventDefault();
                      }}
                    >
                      Attempt {index + 1} ({formatScore(attempt.score, 0)})
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <QuizReview hideTitle quizAttemptId={chosenAttempt.id} />
          </Modal>
        )}

        <hr />
        <Link className="button" to={`/instructor/course/${course.id}`}>
          Return to Course
        </Link>
      </div>
      <br />
    </div>
  );
};

// Get the quiz and attempts

export default QuizScores;
