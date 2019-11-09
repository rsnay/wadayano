import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from 'react-apollo';
import gql from 'graphql-tag';
import ReactTooltip from 'react-tooltip';

import { QUIZ_TYPE_NAMES } from '../../constants';

import withAuthCheck from '../shared/AuthCheck';

import PageTitle from '../shared/PageTitle';
import ErrorBox from '../shared/ErrorBox';
import Spinner from '../shared/Spinner';
import Modal from '../shared/Modal';
import LTISetupModal from './LTISetupModal';
import CourseInfoForm from './CourseInfoForm';
import ButterToast, { ToastTemplate } from '../shared/Toast';
import Breadcrumbs from '../shared/Breadcrumbs';
import { formatScore } from '../../utils';
import CourseInstructors from './CourseInstructors';
import useCourseScores from './useCourseScores';

// Get course details
const COURSE_QUERY = gql`
  query courseDetailsQuery($id: ID!) {
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

const CourseDetails = ({
  history,
  match: {
    params: { courseId },
  },
}) => {
  const [displayLtiSetupAction, setDisplayLtiSetupAction] = useState(null);
  const [displayLtiSetupObjectId, setDisplayLtiSetupObjectId] = useState(null);
  const [displayCourseInfoForm, setDisplayCourseInfoForm] = useState(false);

  const courseScores = useCourseScores(courseId);

  const { error, data, refetch } = useQuery(COURSE_QUERY, {
    fetchPolicy: 'cache-and-network',
    variables: { id: courseId },
  });

  const [createQuizMutation] = useMutation(CREATE_QUIZ);

  const createQuiz = async () => {
    try {
      const result = await createQuizMutation({ variables: { courseId } });
      history.push(`/instructor/quiz/${result.data.createQuiz.id}`);
    } catch (err) {
      ButterToast.raise({
        content: <ToastTemplate content="Error creating quiz." className="is-danger" />,
        timeout: 3000,
      });
    }
  };

  // Shows the LTI setup modal dialog for a given quiz/dashboard/survey launch
  const showLTISetup = (action, objectId) => {
    // Hide tooltip from quiz actions menu so it doesn't show over modal overlay
    document.getElementById('quiz-actions-tooltip').style.left = '-1000px';
    setDisplayLtiSetupAction(action);
    setDisplayLtiSetupObjectId(objectId);
  };

  if (!data || (data && !data.course)) {
    return <Spinner />;
  }

  if (error) {
    return (
      <ErrorBox>
        <p>Couldn’t load this course.</p>
      </ErrorBox>
    );
  }

  const { course } = data;

  let quizzesTable = (
    <div className="notification has-text-centered">
      No quizzes in this course. Create a quiz to get started! <br />
      <br />
      <button className="button is-primary" onClick={createQuiz} type="button">
        New Quiz
      </button>
    </div>
  );
  // Create table of quizzes, if any exist for the course
  if (course.quizzes.length > 0) {
    // Check if aggregated quiz scores are loaded (these come in async through useCourseScores hook)
    const scoresLoaded = courseScores !== null;
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
                  if (scoresLoaded && courseScores.get(quiz.id).studentCount > 0) {
                    history.push(`/instructor/quiz/${quiz.id}/scores`);
                  } else {
                    history.push(`/instructor/quiz/${quiz.id}`);
                  }
                }}
              >
                <td data-title="Title">{quiz.title}</td>
                <td data-title="Type">{QUIZ_TYPE_NAMES[quiz.type]}</td>
                {scoresLoaded && courseScores.get(quiz.id) ? (
                  courseScores.get(quiz.id).studentCount > 0 ? (
                    <>
                      <td>
                        {courseScores.get(quiz.id).studentCount} / {course.students.length}
                      </td>
                      <td>{formatScore(courseScores.get(quiz.id).averageScore, 0)}</td>
                      <td>{formatScore(courseScores.get(quiz.id).averagePredictedScore, 0)}</td>
                      <td>{formatScore(courseScores.get(quiz.id).averageWadayanoScore, 0)}</td>
                    </>
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
        <>
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
              showLTISetup('quiz', dataTip);
              e.preventDefault();
            }}
          >
            <span className="icon">
              <i className="fas fa-link" />
            </span>
            <span>Add to LMS</span>
          </a>
        </>
      )}
    />
  );

  return (
    <section className="section">
      <div className="container">
        <Breadcrumbs
          links={[
            { to: '/instructor/courses', title: 'Courses' },
            { to: `/instructor/course/${course.id}`, title: course.title, active: true },
          ]}
        />

        <section>
          <h4 className="title is-4">{course.title}</h4>
          <PageTitle title={`wadayano | ${course.title}`} />
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
              onClick={() => setDisplayCourseInfoForm(true)}
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
        <button className="button is-primary is-pulled-right" onClick={createQuiz} type="button">
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
              onClick={() => showLTISetup('dashboard', course.id)}
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
              Set up a non-graded survey with multiple-choice questions for students to participate
              in. Place an LTI link in your LMS, and view the survey results here.
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
                onClick={() => showLTISetup('survey', course.id)}
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
      {displayLtiSetupAction && (
        <LTISetupModal
          action={displayLtiSetupAction}
          objectId={displayLtiSetupObjectId}
          consumerKey={course.id}
          sharedSecret={course.ltiSecret}
          closeModal={() => setDisplayLtiSetupAction(null)}
          modalState
        />
      )}
      <Modal
        modalState={displayCourseInfoForm}
        closeModal={() => setDisplayCourseInfoForm(false)}
        title="Edit Course Info"
      >
        <CourseInfoForm
          course={course}
          onCancel={() => setDisplayCourseInfoForm(false)}
          onSave={() => {
            setDisplayCourseInfoForm(false);
            ButterToast.raise({
              content: <ToastTemplate content="Course info saved." className="is-success" />,
            });
            refetch();
          }}
        />
      </Modal>
    </section>
  );
};

export default withAuthCheck(CourseDetails, { instructor: true });
