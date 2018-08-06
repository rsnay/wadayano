import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';
import TimeAgo from 'react-timeago';

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
    const quizAttempts = this.props.quizAttemptsQuery.currentStudentQuizAttempts;

    console.log(quizAttempts);


    let practiceQuizzesTable = <div class="notification has-text-centered">No practice quizzes are currently available for this course.</div>;
    if (quizzes.length > 0) {
        practiceQuizzesTable = (
        <div style={{overflowX: "auto"}}>
            <table className="table is-striped is-hoverable is-fullwidth quiz-table">
                <thead>
                    <tr>
                        <th style={{width:"99%"}}>Title</th>
                        <th style={{whiteSpace: "nowrap"}}>Questions</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {quizzes.map((quiz, index) => 
                        <tr key={quiz.id}>
                            <td>
                                <Link className="has-text-black is-block" to={"/student/quiz/" + quiz.id}>
                                {quiz.title}</Link>
                            </td>
                            <td>{quiz.questions.length}</td>
                            <td>
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


    let quizAttemptsTable = <div class="notification has-text-centered">No quiz attempts yet. Choose a practice quiz from the list above, or launch a quiz from your learning management system to get started.</div>;
    if (quizAttempts.length > 0) {
        quizAttemptsTable = (
        <div style={{overflowX: "auto"}}>
            <table className="table is-striped is-hoverable is-fullwidth quiz-table">
                <thead>
                    <tr>
                        <th style={{whiteSpace: "nowrap"}}>Started</th>
                        <th style={{width:"99%"}}>Quiz</th>
                        <th style={{whiteSpace: "nowrap"}}>Questions</th>
                        <th>Score</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {quizAttempts.map((attempt, index) => 
                        <tr key={attempt.id}>
                            <td style={{whiteSpace: "nowrap"}}><TimeAgo date={attempt.createdAt} /></td>
                            <td>
                                {attempt.completed ?
                                    <Link className="has-text-black is-block" to={"/student/quiz/review/" + attempt.id}>
                                    {attempt.quiz.title}</Link>
                                :
                                    <Link className="has-text-black is-block" to={"/student/quiz/"+ attempt.quiz.id}>
                                    {attempt.quiz.title}</Link>
                                }
                            </td>
                            <td>{attempt.quiz.questions.length}</td>
                            <td>{attempt.completed ? formatScore(attempt.score) : "n/a"}</td>
                            <td>
                                {attempt.completed ?
                                    <Link to={"/student/quiz/review/" + attempt.id}
                                    className="button is-info is-outlined">
                                        <span className="icon"><i className="fas fa-history"></i></span>
                                        <span>Review</span>
                                    </Link>
                                :
                                    <Link to={"/student/quiz/" + attempt.quiz.id}
                                    className="button is-primary is-outlined">
                                        <span className="icon"><i className="fas fa-rocket"></i></span>
                                        <span>Resume</span>
                                    </Link>

                                }
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


          <section>
            <h4 className="title is-4">Practice Quizzes</h4>
            <p>Take a practice quiz below. To take a quiz that is graded for this course, please launch it from your learning management system (i.e. Canvas or Learning Suite).<br /><br /></p>

            {practiceQuizzesTable}

            <hr />
          </section>

          <section>
            <h4 className="title is-4">Quiz Attempts</h4>
            <p>Review previous quiz attempts, or resume an in-progress attempt.<br /><br /></p>

            {quizAttemptsTable}

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
        quizzes {
            id
            title
            questions {
                id
            }
        }
    }
  }
`

const QUIZ_ATTEMPTS_QUERY = gql`
    query($courseId: ID!) {
        currentStudentQuizAttempts(orderBy: createdAt_DESC, courseId: $courseId) {
            id
            quiz {
                id
                title
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