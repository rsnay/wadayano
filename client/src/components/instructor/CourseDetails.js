import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';

import { QUIZ_TYPE_NAMES } from '../../constants';

import { withAuthCheck } from '../shared/AuthCheck';

import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';
import Modal from '../shared/Modal';
import LTISetupModal from './LTISetupModal';
import CourseInfoForm from './CourseInfoForm';
import ButterToast, { ToastTemplate } from '../shared/Toast';
import Breadcrumbs from '../shared/Breadcrumbs';

export class CourseDetails extends Component {

    constructor(props) {
        super(props);
        this.state = {
            displayLtiSetupAction: null,
            displayLtiSetupObjectI: null,
            displayCourseInfoForm: false
        };
        this.courseTitleInput = React.createRef();
    }

    async createQuiz(){
        const result = await this.props.createQuizMutation({
            variables:{
                courseId: this.props.match.params.courseId
            }
        });
        this.props.history.push('/instructor/quiz/' + result.data.createQuiz.id);
    }

    async deleteCourse(course){
        let response = window.prompt('Are you certain that this course should be deleted? Type ‘absolutely’ to proceed.')
        if (response && (response.toLowerCase() === 'absolutely' || response.toLowerCase() === '\'absolutely\'')) {
            try {
                const result = await this.props.courseDelete({
                    variables:{
                        id:course.id
                    }
                });
                if (result.errors && result.errors.length > 0) {
                    throw result;
                }
                ButterToast.raise({
                    content: <ToastTemplate content={course.title + " was deleted."} className="is-info" />,
                });
                this.props.history.push('/instructor/courses');
            } catch (result) {
                ButterToast.raise({
                    content: <ToastTemplate content={"Error deleting course: " + result.errors[0].message} className="is-danger" />,
                });
            }
        } else {
            alert('Course will not be deleted.');
        }
    }

    // Shows the LTI setup modal dialog for a given quiz/dashboard/survey launch
    _showLTISetup(action, objectId) {
        this.setState({ displayLtiSetupAction: action, displayLtiSetupObjectId: objectId });
    }

    // Asks for the email address of an instructor to invite and sends to server
    async inviteInstructor(course) {
        let email = window.prompt('Enter the email address of the instructor whom you would like to invite to this course:');
        if (!email || email.trim() === '') {
          return;
        }
        // Send invite mutation
        const result = await this.props.inviteInstructorMutation({
          variables: {
            courseId: course.id,
            email: email.trim()
          }
        });
        // Show error, or success string from mutation
        if (result.errors && result.errors.length > 0) {
            ButterToast.raise({
                content: <ToastTemplate content={result.errors[0].message} className="is-danger" />,
                timeout: 12000
            });
        } else {
            ButterToast.raise({
                content: <ToastTemplate content={result.data.sendInstructorCourseInvite} className="is-success" />,
                sticky: true
            });
        }
        this.props.courseQuery.refetch();
    }

    // Removes the given instructor from the course
    async removeInstructor(course, email) {
        if (!window.confirm(`Are you sure you want to remove ${email} from this course?`)) { return; }
        // Send remove mutation
        const result = await this.props.removeInstructorMutation({
          variables: {
            courseId: course.id,
            email: email.trim()
          }
        });
        // Show error, or success string from mutation
        if (result.errors && result.errors.length > 0) {
            ButterToast.raise({
                content: <ToastTemplate content={result.errors[0].message} className="is-danger" />,
                timeout: 12000
            });
        } else {
            ButterToast.raise({
                content: <ToastTemplate content={result.data.removeInstructorFromCourse} className="is-success" />,
            });
        }
        this.props.courseQuery.refetch();
    }

  render() {

    if (this.props.courseQuery && this.props.courseQuery.loading) {
        return <LoadingBox />;
    }

    if (this.props.courseQuery && this.props.courseQuery.error) {
        return <ErrorBox><p>Couldn’t load course.</p></ErrorBox>;
    }
    let course = this.props.courseQuery.course;


    let quizzesTable = (<div className="notification has-text-centered">
        No quizzes in this course. Create a quiz to get started! <br /><br />
        <button className="button is-primary" onClick = {() => this.createQuiz()}>New Quiz</button>
    </div>);
    // Create table of quizzes, if any exist for the course
    if (course.quizzes.length > 0) {
        quizzesTable = (<div className="table-wrapper">
        <table className="table is-striped is-hoverable is-fullwidth quiz-table responsive-table">
          <thead>
              <tr className="sticky-header">
                  <th>Title</th>
                  <th>Type</th>
                  <th style={{whiteSpace: "nowrap"}}>
                      <span className="is-hidden-touch">Questions</span>
                      <span className="is-hidden-desktop">?s</span>
                  </th>
                  <th style={{width: "24rem"}}>Actions</th>
              </tr>
          </thead>
          <tbody>
              {course.quizzes.map((quiz, index)=>
              <tr key={quiz.id}>
                  <td data-title="Title"><Link className="has-text-black is-block" to={"/instructor/quiz/" + quiz.id}>{quiz.title}</Link></td>
                  <td data-title="Type">{QUIZ_TYPE_NAMES[quiz.type]}</td>
                  <td data-title="Questions">{quiz.questions.length}</td>
                  <td data-title="Actions">
                    <span className="buttons">
                        <Link to={"/instructor/quiz/" + quiz.id}
                            className="button is-light">
                            <span className="icon">
                            <i className="fas fa-edit"></i>
                            </span>
                            <span>Edit</span>
                        </Link>
                        <button className="button is-light"
                            onClick={() => this._showLTISetup('quiz', quiz.id)}>
                            <span className="icon">
                            <i className="fas fa-link"></i>
                            </span>
                            <span>Add to LMS</span>
                        </button>
                        <Link to={"/instructor/quiz/" + quiz.id + "/scores"}
                            className="button is-light">
                            <span className="icon">
                            <i className="fas fa-chart-bar"></i>
                            </span>
                            <span>Scores</span>
                        </Link>
                    </span>
                  </td>
              </tr>
          )}
          </tbody>
      </table>

      </div>);
    }

    return (
        <section className="section">
        <div className="container">

          <Breadcrumbs links={[
            { to: "/instructor/courses", title: "Course List" },
            { to: "/instructor/course/"+course.id, title: course.title, active: true },
          ]} />

          <section>
            <h4 className="title is-4">Course Info</h4>
            <div className="is-flex-tablet">
                <span style={{flex: 1}}>
                    <label className="label">Title: {course.title}</label>
                    <label className="label">Number: {course.number}</label>
                    <label className="label">LMS URL: <a target="_blank" rel="noopener noreferrer" href={course.lmsUrl}>{course.lmsUrl}</a></label>
                </span>
                <button style={{marginLeft: "1rem"}} className="button is-light"
                    onClick={() => this.setState({ displayCourseInfoForm: true })}>
                    <span className="icon">
                        <i className="fas fa-edit"></i>
                    </span>
                    <span>Edit Course Info</span>
                </button>
            </div>
            <hr />
          </section>

          <section>
            <h4 className="title is-4">Student Dashboard</h4>
            <div className="is-flex-tablet">
                <span>Students in your course can access the Student Dashboard to practice quizzes and review past quiz performance. Simply place an LTI link on a content page or somewhere accessible in your LMS.<br /></span>
                <button style={{marginLeft: "1rem"}} className="button is-light"
                    onClick={() => this._showLTISetup('dashboard', course.id)}>
                    <span className="icon">
                    <i className="fas fa-rocket"></i>
                    </span>
                    <span>Add Dashboard Link to LMS</span>
                </button>
            </div>
            <hr />
          </section>

          <section>
            <h4 className="title is-4">Course Survey</h4>
            <div className="is-flex-tablet">
                <span>Set up a non-graded survey with multiple-choice questions for students to participate in. Place an LTI link in your LMS, and view the survey results here.<br /></span>
                <span className="is-flex-desktop" style={{marginLeft: "0.5rem"}}>
                    <Link style={{marginLeft: "0.5rem", marginBottom: "0.5rem"}} className="button is-light"
                        to={'/instructor/survey/edit/' + course.id}>
                        <span className="icon">
                        <i className="fas fa-edit"></i>
                        </span>
                        <span>Edit Survey</span>
                    </Link>
                    <br />
                    <button style={{marginLeft: "0.5rem", marginBottom: "0.5rem"}} className="button is-light"
                        onClick={() => this._showLTISetup('survey', course.id)}>
                        <span className="icon">
                        <i className="fas fa-clipboard-list"></i>
                        </span>
                        <span>Add Survey Link to LMS</span>
                    </button>
                    <br />
                    <Link style={{marginLeft: "0.5rem"}}
                        className="button is-light"
                        to={'/instructor/survey/results/' + course.id}>
                        <span className="icon">
                        <i className="fas fa-chart-bar"></i>
                        </span>
                        <span>View Survey Results</span>
                    </Link>
                </span>
            </div>
            <hr />
          </section>

          <section>
            <h4 className="title is-4">Course Scores</h4>
            <div className="is-flex-tablet">
                <span style={{flex: 1}}>View scores for students in the class, aggregated by quiz. (To view individual student scores for a quiz, click “Scores” on a quiz below.)<br /></span>
                    <Link style={{marginLeft: "1rem"}}
                        className="button is-light"
                        to={'/instructor/course/' + course.id + '/scores'}>
                        <span className="icon">
                        <i className="fas fa-chart-bar"></i>
                        </span>
                        <span>View Course Scores</span>
                    </Link>
            </div>
            <hr />
          </section>

            <h4 className="title is-4 is-inline-block">Quizzes</h4>
            <button className="button is-primary is-pulled-right" onClick = {() => this.createQuiz()}>
                <span className="icon">
                <i className="fas fa-plus"></i>
                </span>
                <span>New Quiz</span>
            </button>
            {quizzesTable}

        <hr />

        <section>
            <h4 className="title is-4">Course Instructors</h4>
            <div className="is-flex-tablet">
                <span>Invite other instructors to join this course. Other instructors will have all course permissions, including managing quizzes, deleting the course, and inviting/removing any instructors.<br /><br /></span>
                <button style={{marginLeft: "1rem"}} className="button is-light"
                    onClick={() => this.inviteInstructor(course)}>
                    <span className="icon">
                    <i className="fas fa-user-plus"></i>
                    </span>
                    <span>Invite an Instructor</span>
                </button>
            </div>
            {course.instructors.map(instructor => 
                <span className="tag is-light is-large" style={{margin: ".25rem"}} key={instructor.email}>
                    {instructor.email}&nbsp;
                    <button className="delete is-small" onClick={() => this.removeInstructor(course, instructor.email)} title="Remove Instructor"></button>
                </span>
            )}
            <br />
            {course.pendingCourseInvites.map(invite => 
                <span className="tag is-warning is-large" style={{margin: ".25rem"}} key={invite.email}>
                    {invite.email} (pending)&nbsp;
                    <button className="delete is-small" onClick={() => this.removeInstructor(course, invite.email)} title="Cancel Invite"></button>
                </span>
            )}
            <hr />
        </section>

        <section>
            <h4 className="title is-4">Delete Course</h4>
            <div className="is-flex-tablet">
                <span>Deleting this course will permanently delete all quizzes, students’ quizzes attempts, survey data, and other information associated with this course. This cannot be undone.<br /></span>
                <button style={{marginLeft: "1rem"}} className="button is-danger is-outlined"
                    onClick={() => this.deleteCourse(course)}>
                    <span className="icon">
                    <i className="fas fa-trash-alt"></i>
                    </span>
                    <span>Delete Course</span>
                </button>
            </div>
            <hr />
        </section>

        </div>
        {this.state.displayLtiSetupAction &&
            <LTISetupModal
                action={this.state.displayLtiSetupAction}
                objectId={this.state.displayLtiSetupObjectId}
                consumerKey={course.id}
                sharedSecret={course.ltiSecret}
                closeModal={() => this.setState({ displayLtiSetupAction: null })}
                modalState={true}
            />
        }
        <Modal
            modalState={this.state.displayCourseInfoForm}
            closeModal={() => this.setState({ displayCourseInfoForm: false })}
            title="Edit Course Info">
            <CourseInfoForm
                course={course}
                onCancel={() => this.setState({ displayCourseInfoForm: false })}
                onSave={() => {
                    this.setState({ displayCourseInfoForm: false });
                    ButterToast.raise({
                        content: <ToastTemplate content="Course info saved." className="is-success" />
                    });
                    this.props.courseQuery.refetch();
                }}
            />
        </Modal>
      </section>

    )
  }

}

// Get course details
export const COURSE_QUERY = gql`
  query courseQuery($id:ID!) {
    course(
        id:$id
    ){
        id
        title
        number
        lmsUrl
        ltiSecret
        quizzes{
            id
            title
            type
            questions{
                id
            }
        }
        instructors {
            id
            email
        }
        pendingCourseInvites {
            id
            createdAt
            email
        }
    }
  }
`

export const CREATE_QUIZ = gql`
mutation createQuizMutation($courseId: ID!) {
    createQuiz(
        courseId:$courseId,
    ){
        id
    }
}`

export const COURSE_DELETE = gql`
mutation courseDelete($id:ID!) {
    deleteCourse(id:$id){
        id
    }
}`

export const INVITE_INSTRUCTOR = gql`
mutation inviteInstructor($email: String!, $courseId: ID!) {
    sendInstructorCourseInvite(email: $email, courseId: $courseId)
} `

export const REMOVE_INSTRUCTOR = gql`
mutation removeInstructor($email: String!, $courseId: ID!) {
    removeInstructorFromCourse(email: $email, courseId: $courseId)
} `

export default withAuthCheck(compose(
    graphql(COURSE_QUERY, {
        name: 'courseQuery',
        options: (props) => {
            return { variables: { id:props.match.params.courseId } }
        }
    }),
    graphql(CREATE_QUIZ, {name:"createQuizMutation"}),
    graphql(COURSE_DELETE, {name:"courseDelete"}),
    graphql(INVITE_INSTRUCTOR, {name:"inviteInstructorMutation"}),
    graphql(REMOVE_INSTRUCTOR, {name:"removeInstructorMutation"}),
) (CourseDetails), { instructor: true});
