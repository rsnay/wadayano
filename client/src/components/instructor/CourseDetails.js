import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';

import { LTI_LAUNCH_URL } from '../../constants';

import AuthCheck from './AuthCheck';

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

<<<<<<< Updated upstream
<<<<<<< HEAD
  deleteCourse(course){
      console.log(course)
    this.props.courseDelete({
        variables:{
            id:course.id
        }
    });
    window.location.href = "javascript:history.back()";
}
=======
  _showLTISetup(action, id) {
      console.log(LTI_LAUNCH_URL + action + '/' + id);
    this.setState({ displayLtiSetupUrl: LTI_LAUNCH_URL + action + '/' + id });
  }
>>>>>>> 82804f71c0980d9eaa41b1d9f22e20e9cbfd8c34

=======
>>>>>>> Stashed changes
  render() {

    if (this.props.courseQuery && this.props.courseQuery.loading) {
        return <LoadingBox />;
    }

    if (this.props.courseQuery && this.props.courseQuery.error) {
        return <ErrorBox>Couldn't load courses</ErrorBox>;
    }
    console.log(this.props);
    let course = this.props.courseQuery.course;

    return (
        <section className="section">
        <AuthCheck instructor location={this.props.location} />
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

          <div style={{overflowX: "auto"}}>
          <table className="table is-striped is-hoverable is-fullwidth">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Quiz Name</th>
                    <th>Other Info</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {course.quizzes.map((quiz, index)=>
                <tr key={quiz.id}>
                    <td>{quiz.id}</td>
                    <td>{quiz.title}</td>
                    <td>{quiz.questions.length}</td>
                    <td>
                    <Link to={"/instructor/quiz/" + quiz.id}
                      className="button is-outlined is-primary">
                        <span className="icon">
                        <i className="fas fa-edit"></i>
                        </span>
                        <span>Edit/View</span>
                    </Link>
                    &nbsp;
                    <button className="button is-outlined is-primary"
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
<<<<<<< HEAD
        <button onClick = {() => this.addQuiz()}>Add Quiz</button>  
        <button id={course.id} onClick={() => this.deleteCourse(course)}>Delete Course</button>
=======
        <button className="button is-primary" onClick = {() => this.addQuiz()}>
            <span className="icon">
            <i className="fas fa-plus"></i>
            </span>
            <span>Add Quiz</span>
        </button>
>>>>>>> 82804f71c0980d9eaa41b1d9f22e20e9cbfd8c34
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
            questions{
                prompt
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

<<<<<<< Updated upstream
export const COURSE_DELETE = gql`
mutation courseDelete($id:ID!) {
    deleteCourse(id:$id){
        id
    }
}`

=======
>>>>>>> Stashed changes
export default compose(
graphql(COURSE_QUERY, {
  name: 'courseQuery',
  options: (props) => {
    console.log(props.match.params.courseId);
    return { variables: { id:props.match.params.courseId } }
  }
}),
graphql(ADD_QUIZ, {name:"addQuizMutation"}),
<<<<<<< Updated upstream
graphql(COURSE_UPDATE, {name:"courseUpdate"}),
graphql(COURSE_DELETE, {name:"courseDelete"}),
=======
graphql(COURSE_UPDATE, {name:"courseUpdate"})
>>>>>>> Stashed changes
) (CourseDetails)