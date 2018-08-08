import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';

import { LTI_LAUNCH_URL, QUIZ_TYPE_NAMES } from '../../constants';

import { withAuthCheck } from '../shared/AuthCheck';

import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';
import LTISetupModal from './LTISetupModal';

export class CourseDetails extends Component {

    constructor(props) {
        super(props);
        this.state = {
            displayLtiSetupUrl: null
        };
    }

  addQuiz(){
    //console.log(this.props.match.params.courseId)
    this.props.addQuizMutation({
        variables:{
            id:this.props.match.params.courseId
        }
    });
    window.location.reload(true);
  }

  updateCourse(){
    //console.log(this.props.match.params.courseId)
    this.props.courseUpdate({
        variables:{
            id:this.props.match.params.courseId,
            title:document.getElementById(this.props.match.params.courseId).value
        }
    });
    window.location.reload(true);
  }

  deleteCourse(course){
      console.log(course)
    this.props.courseDelete({
        variables:{
            id:course.id
        }
    });
    window.history.back();
  }

  // Shows the LTI setup modal dialog for a given quiz/dashboard/survey launch
  _showLTISetup(action, id) {
    this.setState({ displayLtiSetupUrl: LTI_LAUNCH_URL + action + '/' + id });
  }

  render() {

    if (this.props.courseQuery && this.props.courseQuery.loading) {
        return <LoadingBox />;
    }

    if (this.props.courseQuery && this.props.courseQuery.error) {
        return <ErrorBox>Couldn’t load courses</ErrorBox>;
    }
    console.log(this.props);
    let course = this.props.courseQuery.course;

    return (
        <section className="section">
        <div className="container">
        <nav className="breadcrumb" aria-label="breadcrumbs">
            <ul>
                <li><Link to="/instructor">Course List</Link></li>
                <li className="is-active"><Link to={"/instructor/course/"+course.id} aria-current="page">{course.title}</Link></li>
            </ul>
        </nav>
          <textarea type="input" id={course.id} className="title is-inline-block">{course.title}</textarea>
          &nbsp;&nbsp;
            <a className="button">
                <span className="icon is-small" onClick = {() => this.updateCourse()}>
                <i className="fas fa-edit"></i>
                </span>
            </a>
          <hr />

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
                    <button style={{marginLeft: "0.5rem", marginBottom: "0.5rem"}} className="button is-light"
                        onClick={() => this.props.history.push('/instructor/survey/edit/' + course.id)}>
                        <span className="icon">
                        <i className="fas fa-edit"></i>
                        </span>
                        <span>Edit Survey</span>
                    </button>
                    <br />
                    <button style={{marginLeft: "0.5rem", marginBottom: "0.5rem"}} className="button is-light"
                        onClick={() => this._showLTISetup('survey', course.id)}>
                        <span className="icon">
                        <i className="fas fa-clipboard-list"></i>
                        </span>
                        <span>Add Survey Link to LMS</span>
                    </button>
                    <br />
                    <button style={{marginLeft: "0.5rem"}} className="button is-light"
                        onClick={() => this.props.history.push('/instructor/survey/results/' + course.id)}>
                        <span className="icon">
                        <i className="fas fa-chart-bar"></i>
                        </span>
                        <span>View Survey Results</span>
                    </button>
                </span>
            </div>
            <hr />
          </section>

            <h4 className="title is-4 is-inline-block">Quizzes</h4>
            <button className="button is-primary is-pulled-right" onClick = {() => this.addQuiz()}>
                <span className="icon">
                <i className="fas fa-plus"></i>
                </span>
                <span>New Quiz</span>
            </button>
          <div style={{overflowX: "auto"}}>
          <table className="table is-striped is-hoverable is-fullwidth quiz-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th style={{width:"99%"}}>Title</th>
                    <th>Type</th>
                    <th style={{whiteSpace: "nowrap"}}>Questions</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {course.quizzes.map((quiz, index)=>
                <tr key={quiz.id}>
                    <td>{quiz.id}</td>
                    <td>{quiz.title}</td>
                    <td>{QUIZ_TYPE_NAMES[quiz.type]}</td>
                    <td>{quiz.questions.length}</td>
                    <td className="buttons">
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
                    </td>
                </tr>
            )}
            </tbody>
        </table>

        <button className="button is-primary" onClick = {() => this.deleteCourse(course)}>
            <span className="icon">
            <i className="fas fa-trash-alt"></i>
            </span>
            <span>Delete Course</span>
        </button>
        </div>
        </div>
        {this.state.displayLtiSetupUrl &&
            <LTISetupModal
                launchUrl={this.state.displayLtiSetupUrl}
                consumerKey={course.id}
                sharedSecret={course.ltiSecret}
                closeModal={() => this.setState({ displayLtiSetupUrl: null })}
                modalState={true}
            />
        }
      </section>
    )
  }

}

//all courses for user of id
//TODO change from hardcoded userId
export const COURSE_QUERY = gql`
  query courseQuery($id:ID!) {
    course(
        id:$id
    ){
        id
        title
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

export const ADD_QUIZ = gql`
mutation addQuizMutation($id:ID!)
    {
        addQuiz(
            id:$id
        ){
            title
        }
    }`

export const COURSE_UPDATE = gql`
mutation courseUpdate($id:ID!, $title:String!) {
    updateCourse(id:$id, title:$title){
        id
        title
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
    console.log(props.match.params.courseId);
    return { variables: { id:props.match.params.courseId } }
  }
}),
graphql(ADD_QUIZ, {name:"addQuizMutation"}),
graphql(COURSE_UPDATE, {name:"courseUpdate"}),
graphql(COURSE_DELETE, {name:"courseDelete"}),
) (CourseDetails), { instructor: true});
