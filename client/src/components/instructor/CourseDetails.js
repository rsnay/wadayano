import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';

import { LTI_LAUNCH_URL, QUIZ_TYPE_NAMES } from '../../constants';

import { withAuthCheck } from '../shared/AuthCheck';

import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';
import Modal from '../shared/Modal';
import LTISetupModal from './LTISetupModal';
import CourseInfoForm from './CourseInfoForm';

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
        if (response.toLowerCase() === 'absolutely') {
            await this.props.courseDelete({
                variables:{
                    id:course.id
                }
            });
            window.location.assign('/instructor/courses');
        } else {
            alert('Course will not be deleted.');
        }
    }

    // Shows the LTI setup modal dialog for a given quiz/dashboard/survey launch
    _showLTISetup(action, objectId) {
        this.setState({ displayLtiSetupAction: action, displayLtiSetupObjectId: objectId });
    }

  render() {

    if (this.props.courseQuery && this.props.courseQuery.loading) {
        return <LoadingBox />;
    }

    if (this.props.courseQuery && this.props.courseQuery.error) {
        return <ErrorBox>Couldn’t load courses</ErrorBox>;
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
                  <th style={{width: "19rem"}}>Actions</th>
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
                            <span>Edit/View</span>
                        </Link>
                        <button className="button is-light"
                            onClick={() => this._showLTISetup('quiz', quiz.id)}>
                            <span className="icon">
                            <i className="fas fa-link"></i>
                            </span>
                            <span>Add to LMS</span>
                        </button>
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
        <nav className="breadcrumb" aria-label="breadcrumbs">
            <ul>
                <li><Link to="/instructor/courses">Course List</Link></li>
                <li className="is-active"><Link to={"/instructor/course/"+course.id} aria-current="page">{course.title}</Link></li>
            </ul>
        </nav>

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
            <h4 className="title is-4">Delete Course</h4>
            <div className="is-flex-tablet">
                <span>Deleteing this course will permanently delete all quizzes, students’ quizzes attempts, survey data, and other information associated with this course. This cannot be undone.<br /></span>
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

export default withAuthCheck(compose(
    graphql(COURSE_QUERY, {
        name: 'courseQuery',
        options: (props) => {
            return { variables: { id:props.match.params.courseId } }
        }
    }),
    graphql(CREATE_QUIZ, {name:"createQuizMutation"}),
    graphql(COURSE_DELETE, {name:"courseDelete"}),
) (CourseDetails), { instructor: true});
