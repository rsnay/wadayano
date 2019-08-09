import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';
import ReactTooltip from 'react-tooltip';

import { QUIZ_TYPE_NAMES } from '../../constants';
import compose from '../../compose';

import withAuthCheck from '../shared/AuthCheck';

import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';
import Modal from '../shared/Modal';
import LTISetupModal from './LTISetupModal';
import CourseInfoForm from './CourseInfoForm';
import ButterToast, { ToastTemplate } from '../shared/Toast';
import Breadcrumbs from '../shared/Breadcrumbs';
import withCourseScores from './CourseScoresProvider';
import { formatScore } from '../../utils';
import CourseInstructors from './CourseInstructors';

export class CourseDetails extends Component {
  constructor(props) {
    super(props);
    this.state = {
      displayLtiSetupAction: null,
      displayLtiSetupObjectId: null,
      displayCourseInfoForm: false,
    };
  }

  async createQuiz() {
    const result = await this.props.createQuizMutation({
      variables: {
        courseId: this.props.match.params.courseId,
      },
    });
    this.props.history.push(`/instructor/quiz/${result.data.createQuiz.id}`);
  }

  // Shows the LTI setup modal dialog for a given quiz/dashboard/survey launch
  showLTISetup(action, objectId) {
    // Hide tooltip from quiz actions menu so it doesn't show over modal overlay
    document.getElementById('quiz-actions-tooltip').style.left = '-1000px';
    this.setState({ displayLtiSetupAction: action, displayLtiSetupObjectId: objectId });
  }

  render() {
    if (this.props.courseQuery && !this.props.courseQuery.course) {
      return <LoadingBox />;
    }

    if (this.props.courseQuery && this.props.courseQuery.error) {
      return (
        <ErrorBox>
          <p>Couldn’t load this course.</p>
        </ErrorBox>
      );
    }
    const { course } = this.props.courseQuery;

    let quizzesTable = (
      <div className="notification has-text-centered">
        No quizzes in this course. Create a quiz to get started! <br />
        <br />
        <button className="button is-primary" onClick={() => this.createQuiz()} type="button">
          New Quiz
        </button>
      </div>
    );
    // Create table of quizzes, if any exist for the course
    if (course.quizzes.length > 0) {
      // Check if aggregated quiz scores are loaded (these come in async through withCourseScores HOC)
      const scoresLoaded = this.props.courseScores !== null;
      const scores = this.props.courseScores;
      quizzesTable = (
        <div className="table-wrapper">
          <table className="table is-hoverable is-fullwidth quiz-table responsive-table">
            <thead>
              <tr className="sticky-header">
                <th>Quiz</th>
                <th>Type</th>
                <th>Completion</th>
                <th>Avg. Score</th>
                <th>Avg. Predicted Score</th>
                <th>Avg. Wadayano Score</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {course.quizzes.map(quiz => (
                <tr
                  key={quiz.id}
                  onClick={() => {
                    if (scoresLoaded && scores.get(quiz.id).studentCount > 0) {
                      this.props.history.push(`/instructor/quiz/${quiz.id}/scores`);
                    } else {
                      this.props.history.push(`/instructor/quiz/${quiz.id}`);
                    }
                  }}
                >
                  <td data-title="Title">{quiz.title}</td>
                  <td data-title="Type">{QUIZ_TYPE_NAMES[quiz.type]}</td>
                  {scoresLoaded && scores.get(quiz.id) ? (
                    scores.get(quiz.id).studentCount > 0 ? (
                      <React.Fragment>
                        <td>
                          {scores.get(quiz.id).studentCount} / {course.students.length}
                        </td>
                        <td>{formatScore(scores.get(quiz.id).averageScore, 0)}</td>
                        <td>{formatScore(scores.get(quiz.id).averagePredictedScore, 0)}</td>
                        <td>{formatScore(scores.get(quiz.id).averageWadayanoScore, 0)}</td>
                      </React.Fragment>
                    ) : (
                      <td colSpan="4">
                        <i>Quiz not taken</i>
                      </td>
                    )
                  ) : (
                    <td colSpan="4">
                      <i>Loading</i>
                    </td>
                  )}
                  <td data-title="Actions">
                    <button
                      className="button is-light"
                      data-tip={quiz.id}
                      data-for="quiz-actions-tooltip"
                      data-event="click"
                      type="button"
                    >
                      {' ••• '}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    const quizActionsTooltip = (
      <ReactTooltip
        id="quiz-actions-tooltip"
        type="light"
        place="bottom"
        effect="solid"
        event="no-event"
        globalEventOff="click"
        border
        class="quiz-options-menu"
        getContent={dataTip => (
          <React.Fragment>
            <Link to={`/instructor/quiz/${dataTip}/scores`} className="navbar-item">
              <span className="icon">
                <i className="fas fa-chart-bar" />
              </span>
              <span>View Scores</span>
            </Link>
            <Link to={`/instructor/quiz/${dataTip}`} className="navbar-item">
              <span className="icon">
                <i className="fas fa-edit" />
              </span>
              <span>Edit Quiz</span>
            </Link>
            <a
              className="navbar-item"
              role="menuitem"
              href="#lti"
              onClick={e => {
                this.showLTISetup('quiz', dataTip);
                e.preventDefault();
              }}
            >
              <span className="icon">
                <i className="fas fa-link" />
              </span>
              <span>Add to LMS</span>
            </a>
          </React.Fragment>
        )}
      />
    );

    return (
      <section className="section">
        <div className="container">
          <Breadcrumbs
            links={[
              { to: '/instructor/courses', title: 'Course List' },
              { to: `/instructor/course/${course.id}`, title: course.title, active: true },
            ]}
          />

          <section>
            <h4 className="title is-4">{course.title}</h4>
            <div className="is-flex-tablet">
              <span style={{ flex: 1 }}>
                <label className="label">Title: {course.title}</label>
                <label className="label">Number: {course.number}</label>
                <label className="label">
                  LMS URL:{' '}
                  <a target="_blank" rel="noopener noreferrer" href={course.lmsUrl}>
                    {course.lmsUrl}
                  </a>
                </label>
              </span>
              <button
                style={{ marginLeft: '1rem' }}
                className="button is-light"
                onClick={() => this.setState({ displayCourseInfoForm: true })}
                type="button"
              >
                <span className="icon">
                  <i className="fas fa-edit" />
                </span>
                <span>Edit Course Info</span>
              </button>
            </div>
            <hr />
          </section>

          <h4 className="title is-4 is-inline-block">Quizzes</h4>
          <button
            className="button is-primary is-pulled-right"
            onClick={() => this.createQuiz()}
            type="button"
          >
            <span className="icon">
              <i className="fas fa-plus" />
            </span>
            <span>New Quiz</span>
          </button>
          {quizzesTable}
          {quizActionsTooltip}

          <hr />

          <section>
            <h4 className="title is-4">Course Instructors</h4>
            <CourseInstructors courseId={course.id} />
            <hr />
          </section>

          <section>
            <h4 className="title is-4">Student Dashboard</h4>
            <div className="is-flex-tablet">
              <span>
                Students in your course can access the Student Dashboard to practice quizzes and
                review past quiz performance. Simply place an LTI link on a content page or
                student-accessible location in your LMS.
                <br />
              </span>
              <button
                style={{ marginLeft: '1rem' }}
                className="button is-light"
                onClick={() => this.showLTISetup('dashboard', course.id)}
                type="button"
              >
                <span className="icon">
                  <i className="fas fa-rocket" />
                </span>
                <span>Add Dashboard Link to LMS</span>
              </button>
            </div>
            <hr />
          </section>

          <section>
            <h4 className="title is-4">Course Survey</h4>
            <div className="is-flex-tablet">
              <span>
                Set up a non-graded survey with multiple-choice questions for students to
                participate in. Place an LTI link in your LMS, and view the survey results here.
                <br />
              </span>
              <span className="is-flex-desktop" style={{ marginLeft: '0.5rem' }}>
                <Link
                  style={{ marginLeft: '0.5rem', marginBottom: '0.5rem' }}
                  className="button is-light"
                  to={`/instructor/survey/edit/${course.id}`}
                >
                  <span className="icon">
                    <i className="fas fa-edit" />
                  </span>
                  <span>Edit Survey</span>
                </Link>
                <br />
                <button
                  style={{ marginLeft: '0.5rem', marginBottom: '0.5rem' }}
                  className="button is-light"
                  onClick={() => this.showLTISetup('survey', course.id)}
                  type="button"
                >
                  <span className="icon">
                    <i className="fas fa-clipboard-list" />
                  </span>
                  <span>Add Survey Link to LMS</span>
                </button>
                <br />
                <Link
                  style={{ marginLeft: '0.5rem' }}
                  className="button is-light"
                  to={`/instructor/survey/results/${course.id}`}
                >
                  <span className="icon">
                    <i className="fas fa-chart-bar" />
                  </span>
                  <span>View Survey Results</span>
                </Link>
              </span>
            </div>
            <hr />
          </section>
        </div>
        {this.state.displayLtiSetupAction && (
          <LTISetupModal
            action={this.state.displayLtiSetupAction}
            objectId={this.state.displayLtiSetupObjectId}
            consumerKey={course.id}
            sharedSecret={course.ltiSecret}
            closeModal={() => this.setState({ displayLtiSetupAction: null })}
            modalState
          />
        )}
        <Modal
          modalState={this.state.displayCourseInfoForm}
          closeModal={() => this.setState({ displayCourseInfoForm: false })}
          title="Edit Course Info"
        >
          <CourseInfoForm
            course={course}
            onCancel={() => this.setState({ displayCourseInfoForm: false })}
            onSave={() => {
              this.setState({ displayCourseInfoForm: false });
              ButterToast.raise({
                content: <ToastTemplate content="Course info saved." className="is-success" />,
              });
              this.props.courseQuery.refetch();
            }}
          />
        </Modal>
      </section>
    );
  }
}

// Get course details
export const COURSE_QUERY = gql`
  query courseQuery($id: ID!) {
    course(id: $id) {
      id
      title
      number
      lmsUrl
      consentFormUrl
      ltiSecret
      students {
        id
      }
      quizzes {
        id
        title
        type
      }
    }
  }
`;

export const CREATE_QUIZ = gql`
  mutation createQuizMutation($courseId: ID!) {
    createQuiz(courseId: $courseId) {
      id
    }
  }
`;

export default withAuthCheck(
  withCourseScores(
    compose(
      graphql(COURSE_QUERY, {
        name: 'courseQuery',
        options: props => {
          return {
            fetchPolicy: 'cache-and-network',
            variables: { id: props.match.params.courseId },
          };
        },
      }),
      graphql(CREATE_QUIZ, { name: 'createQuizMutation' })
    )(CourseDetails)
  ),
  { instructor: true }
);
