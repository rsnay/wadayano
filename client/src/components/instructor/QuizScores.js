import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql } from 'react-apollo';

import compose from '../../compose';
import withAuthCheck from '../shared/AuthCheck';

import ErrorBox from '../shared/ErrorBox';
import Spinner from '../shared/Spinner';
import Modal from '../shared/Modal';
import Breadcrumbs from '../shared/Breadcrumbs';

import {
  formatScore,
  predictedScore,
  wadayanoScore,
  confidenceAnalysis,
  stringCompare,
} from '../../utils';
import { QUIZ_TYPE_NAMES } from '../../constants';
import QuizReview from '../student/QuizReview';

import AggregatedQuizReview, { QUIZ_QUERY } from './AggregatedQuizReview';
import { sortFunctions } from '../../sort-utils';

/**
 * Displays an <AggregatedQuizReview /> component and a table of all students in the course,
 * with the scores of their *first* attempt of this quiz.
 */
class QuizScores extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      sortColumn: 'name',
      sortAscending: true,
      studentScores: [],
      currentStudentReview: null,
    };
    this.sortByColumn = this.sortByColumn.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    // Workaround for no callback after apollo query finishes loading.
    // Rather than check if query is ‘loading,’ check if it doesn’t have data, since
    // the cache-and-network fetch policy is used, which returns data from cache but
    // still sets loading=true while it re-fetches
    if (nextProps.quizQuery && !nextProps.quizQuery.error && nextProps.quizQuery.quiz) {
      // Prepare data for the sortable table
      const { quiz } = nextProps.quizQuery;
      const { course } = quiz;

      const studentScores = course.students.map(student => {
        // Determine if student took this quiz
        let chosenAttempt = null;
        const studentAttempts = quiz.quizAttempts.filter(
          a => a.student.id === student.id && a.completed
        );
        // Base calculations on first attempt
        if (studentAttempts.length > 0) {
          chosenAttempt = studentAttempts[0];
        }
        // Output score for each student, if quiz was taken
        if (chosenAttempt !== null) {
          const attemptPredictedScore = predictedScore(chosenAttempt);
          const attemptWadayanoScore = wadayanoScore(chosenAttempt);
          const attemptConfidenceAnalysis = confidenceAnalysis(chosenAttempt);
          return {
            id: student.id,
            name: student.name,
            attempts: studentAttempts.length,
            highestScore: chosenAttempt.score,
            chosenAttempt,
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

      // Sort scores according to selected column
      studentScores.sort(sortFunctions.name);

      this.setState({ isLoading: false, studentScores });
    }
  }

  sortByColumn(e) {
    // Get data-column prop from header that was clicked
    const newSortColumn = e.target.dataset.column;
    let { sortAscending, studentScores } = this.state;

    // Check if we're toggling sort direction
    if (this.state.sortColumn === newSortColumn) {
      sortAscending = !sortAscending;
    }

    // Sort data
    studentScores = studentScores.sort(sortFunctions[newSortColumn]);
    if (!sortAscending) {
      studentScores.reverse();
    }

    // Update state
    this.setState({ sortColumn: newSortColumn, sortAscending, studentScores });
  }

  showStudentAttempts(student) {
    const { quiz } = this.props.quizQuery;
    const attempts = quiz.quizAttempts.filter(a => a.student.id === student.id && a.completed);
    this.setState({
      currentStudentReview: student,
      currentQuizAttempts: attempts,
      chosenAttempt: student.chosenAttempt,
    });
  }

  render() {
    if (this.props.quizQuery && this.props.quizQuery.error) {
      return (
        <ErrorBox>
          <p>Couldn’t load quiz scores.</p>
        </ErrorBox>
      );
    }

    if (this.state.isLoading || (this.props.quizQuery && !this.props.quizQuery.quiz)) {
      return <Spinner />;
    }

    const { quiz } = this.props.quizQuery;
    const { course } = quiz;

    let scoresTable;
    if (this.state.studentScores.length === 0) {
      scoresTable = (
        <p className="notification is-light">
          There are no students enrolled in this course. When a student launches a quiz from the
          course’s LMS, he/she will be automatically enrolled.
        </p>
      );
    } else {
      const columns = [
        { title: 'Student Name', columnId: 'name', sortable: true },
        { title: 'Attempts', columnId: 'attempts', sortable: true },
        { title: 'First Attempt', columnId: 'highestScore', sortable: true },
        { title: 'Predicted Score', columnId: 'predictedScore', sortable: true },
        { title: 'Wadayano Score', columnId: 'wadayanoScore', sortable: true },
        { title: 'Confidence Analysis', columnId: 'confidenceAnalysis', sortable: true },
        { title: 'View Report', columnId: 'viewReport', sortable: false },
      ];

      const scoreRows = this.state.studentScores.map(student => {
        // Output score for each student, if quiz was taken
        return (
          <tr
            key={student.id}
            className="has-cursor-pointer"
            onClick={student.attempts > 0 ? () => this.showStudentAttempts(student) : () => {}}
          >
            <td style={{ whiteSpace: 'nowrap' }}>{student.name}</td>
            {student.attempts > 0 ? (
              <>
                <td>{student.attempts}</td>
                <td>{formatScore(student.highestScore)}</td>
                <td>{formatScore(student.predictedScore)}</td>
                <td>{formatScore(student.wadayanoScore)}</td>
                <td>
                  <span
                    className={`confidence-emoji is-medium ${student.confidenceAnalysis.key}`}
                  />
                  &nbsp;{student.confidenceAnalysis.text}
                </td>
                <td>
                  <button
                    className="button is-light"
                    onClick={() => this.showStudentAttempts(student)}
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
                    className={this.state.sortColumn === col.columnId ? 'has-background-light' : ''}
                    data-column={col.columnId}
                    onClick={col.sortable ? this.sortByColumn : () => {}}
                  >
                    {col.title}
                    {this.state.sortColumn === col.columnId && (
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
                // { to: "/instructor/quiz/" + quiz.id, title: quiz.title },
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

          {this.state.currentStudentReview && (
            <Modal
              modalState
              closeModal={() =>
                this.setState({ currentStudentReview: null, currentQuizAttempts: null })
              }
              title={`Attempts from ${this.state.currentStudentReview.name}`}
              cardClassName="quiz-scores-report-modal"
            >
              <div className="tabs quiz-attempt-selector">
                <ul>
                  {this.state.currentQuizAttempts.map((attempt, index) => (
                    <li
                      className={this.state.chosenAttempt.id === attempt.id ? 'is-active' : ''}
                      key={attempt.id}
                    >
                      <a
                        href={`#${attempt.id}`}
                        onClick={e => {
                          this.setState({ chosenAttempt: attempt });
                          e.preventDefault();
                        }}
                      >
                        Attempt {index + 1} ({formatScore(attempt.score, 0)})
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <QuizReview hideTitle quizAttemptId={this.state.chosenAttempt.id} />
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
  }
}

// Get the quiz and attempts
// QUIZ_QUERY is imported from AggregatedQuizReview, since that query fetches everything
// (and more) that this component needs. If both use the same query, Apollo can cache the
// result for quicker initial display. This does lead to increased component coupling, though.

export default withAuthCheck(
  compose(
    graphql(QUIZ_QUERY, {
      name: 'quizQuery',
      options: props => {
        return { fetchPolicy: 'cache-and-network', variables: { id: props.match.params.quizId } };
      },
    })
  )(QuizScores),
  { instructor: true }
);
