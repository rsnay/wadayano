import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';
import TimeAgo from 'react-timeago';

import { QUIZ_TYPE_NAMES } from '../../constants';

import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';
import { withAuthCheck } from '../shared/AuthCheck';
import { formatScore } from '../../utils';

class Dashboard extends Component {

  render() {

    if ((this.props.courseQuery && this.props.courseQuery.loading) || (this.props.quizAttemptsQuery && this.props.quizAttemptsQuery.loading)) {
        return <LoadingBox />;
    }

    if ((this.props.courseQuery && this.props.courseQuery.error) || (this.props.quizAttemptsQuery && this.props.quizAttemptsQuery.error)) {
        return <ErrorBox><p>Couldn’t load dashboard. Please try again later.</p></ErrorBox>;
    }

    const course = this.props.courseQuery.course;
    const quizzes = course.quizzes;
    const practiceQuizzes = quizzes.filter(quiz => quiz.type === 'PRACTICE');
    const quizAttempts = this.props.quizAttemptsQuery.currentStudentQuizAttempts;
    const unfinishedAttempts = quizAttempts.filter(attempt => attempt.completed === null);
    const pastAttempts = quizAttempts.filter(attempt => attempt.completed !== null);

    const lmsUrlLink = (actionText) => (course.lmsUrl !== '') ? <a target="_blank" rel="noopener noreferrer" href={course.lmsUrl}>click here to {actionText}</a> : actionText;

    let practiceQuizzesTable = <div className="notification has-text-centered">No practice quizzes are currently available for this course.</div>;
    if (practiceQuizzes.length > 0) {
        practiceQuizzesTable = (
        <div className="table-wrapper">
            <table className="table is-striped is-hoverable is-fullwidth quiz-table responsive-table">
                <thead>
                    <tr className="sticky-header">
                        <th style={{width:"99%"}}>Title</th>
                        <th style={{whiteSpace: "nowrap"}}>
                            <span className="is-hidden-touch">Questions</span>
                            <span className="is-hidden-desktop">?s</span>
                        </th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {practiceQuizzes.filter(quiz => quiz.type === 'PRACTICE').map((quiz, index) => 
                        <tr key={quiz.id}>
                            <td data-title="Title">
                                <Link className="has-text-black is-block" to={"/student/quiz/" + quiz.id}>
                                {quiz.title}</Link>
                            </td>
                            <td data-title="Questions">{quiz.questions.length}</td>
                            <td data-title="Actions">
                                <Link to={"/student/quiz/" + quiz.id}
                                className="button is-primary is-outlined">
                                    <span className="icon"><i className="fas fa-rocket"></i></span>
                                    <span>Practice Quiz</span>
                                </Link>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
        );
    }

    let unfinishedAttemptsTable = unfinishedAttempts.length > 0 && (
        <div style={{overflowX: "auto"}}>
            <table className="table is-striped is-hoverable is-fullwidth quiz-table responsive-table" style={{border: "solid #209cee 1px"}}>
                <thead>
                    <tr>
                        <th style={{whiteSpace: "nowrap"}}>Started</th>
                        <th style={{width:"99%"}}>Quiz</th>
                        <th style={{whiteSpace: "nowrap"}}>
                            <span className="is-hidden-touch">Questions</span>
                            <span className="is-hidden-desktop">?s</span>
                        </th>
                        <th>Completion</th>
                        <th>Resume</th>
                    </tr>
                </thead>
                <tbody>
                    {unfinishedAttempts.map((attempt, index) => 
                        <tr key={attempt.id}>
                            <td data-title="Started" style={{whiteSpace: "nowrap"}}><TimeAgo date={attempt.createdAt} /></td>
                            <td data-title="Quiz">
                                <Link className="has-text-black is-block" to={"/student/quiz/"+ attempt.quiz.id}>
                                {attempt.quiz.title}</Link>
                            </td>
                            <td data-title="Questions">{attempt.quiz.questions.length}</td>
                            <td data-title="Completion">{formatScore(attempt.questionAttempts.length / attempt.quiz.questions.length)}</td>
                            <td data-title="Resume">
                                <Link to={"/student/quiz/" + attempt.quiz.id}
                                className="button is-primary is-outlined">
                                    <span className="icon"><i className="fas fa-rocket"></i></span>
                                    <span>Resume</span>
                                </Link>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>

    );

    let pastAttemptsTable = <div className="notification has-text-centered">No quiz attempts yet. Choose a practice quiz from the list above, or {lmsUrlLink('launch a quiz from your learning management system')} to get started.</div>;
    if (pastAttempts.length > 0) {
        pastAttemptsTable = (
        <div className="table-wrapper">
            <table className="table is-striped is-hoverable is-fullwidth quiz-table responsive-table">
                <thead>
                    <tr className="sticky-header">
                        <th style={{whiteSpace: "nowrap"}}>Completed</th>
                        <th style={{width:"99%"}}>Quiz</th>
                        <th style={{whiteSpace: "nowrap"}}>
                            <span className="is-hidden-touch">Questions</span>
                            <span className="is-hidden-desktop">?s</span>
                        </th>
                        <th>Type</th>
                        <th>Score</th>
                        <th>Review</th>
                    </tr>
                </thead>
                <tbody>
                    {pastAttempts.map((attempt, index) => 
                        <tr key={attempt.id}>
                            <td data-title="Completed" style={{whiteSpace: "nowrap"}}><TimeAgo date={attempt.completed} /></td>
                            <td data-title="Quiz">
                                <Link className="has-text-black is-block" to={"/student/quiz/review/" + attempt.id}>
                                {attempt.quiz.title}</Link>
                            </td>
                            <td data-title="Questions">{attempt.quiz.questions.length}</td>
                            <td data-title="Type">{QUIZ_TYPE_NAMES[attempt.quiz.type]}</td>
                            <td data-title="Score">{attempt.completed ? formatScore(attempt.score) : "n/a"}</td>
                            <td data-title="Review">
                                <Link to={"/student/quiz/review/" + attempt.id}
                                className="button is-info is-outlined">
                                    <span className="icon"><i className="fas fa-history"></i></span>
                                    <span>Review</span>
                                </Link>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
        );
    }

    return (
        <section className="section">
        <div className="container">
          <h3 className="title is-3">{course.title} Dashboard</h3>
          <hr />


          {unfinishedAttempts.length > 0 && <section className="message is-info">
            <div className="message-header">
                <h4 className="title is-4 has-text-white">Unfinished Quiz Attempts</h4>
            </div>
            <div className="message-body">
                <p>Need to pause during a quiz? Simply close the quiz, and resume it here.</p>

            </div>
                {unfinishedAttemptsTable}
          </section>}

          <section>
            <h4 className="title is-4">Practice Quizzes</h4>
            <p>Take a practice quiz below. To take a quiz that is graded for this course, please {lmsUrlLink('launch it from your course’s learning management system')} (i.e. Canvas or Learning Suite).<br /><br /></p>

            {practiceQuizzesTable}

            <hr />
          </section>

          <section>
            <h4 className="title is-4">Past Quiz Attempts</h4>
            <p>Review previous quiz attempts, and see where you’ve improved.<br /><br /></p>

            {pastAttemptsTable}

            <hr />
          </section>

        </div>
      </section>
    )
  }
}
// Get the course information
const COURSE_QUERY = gql`
  query courseQuery($id: ID!) {
    course(id:$id){
        id
        title
        survey
        lmsUrl
        quizzes {
            id
            title
            type
            questions {
                id
            }
        }
    }
  }
`

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
            }
            score
        }
    }
`

export default withAuthCheck(compose(
    graphql(COURSE_QUERY, {
        name: 'courseQuery',
        options: (props) => {
            return { variables: { id: props.match.params.courseId } }
        }
    }),
    graphql(QUIZ_ATTEMPTS_QUERY, {
        name: 'quizAttemptsQuery',
        options: (props) => {
            return { variables: { courseId: props.match.params.courseId } }
        }
    }),
)(Dashboard), { student: true });