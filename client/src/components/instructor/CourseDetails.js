import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

import AuthCheck from './AuthCheck';

import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';

export class CourseDetails extends Component {
  state = {
  }

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
          <h1 className="title is-inline-block">{course.id}</h1>
          &nbsp;&nbsp;
            <a className="button">
                <span className="icon is-small">
                <i className="fas fa-edit"></i>
                </span>
            </a>
          <hr />

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
                    <Link to={"/instructor/quiz/" + quiz.id} className="button is-outlined is-primary">
                        <span className="icon">
                        <i className="fas fa-edit"></i>
                        </span>
                        <span>Edit/View</span>
                    </Link>
                    </td>
                </tr>
            )}
            </tbody>
        </table>
        </div>
      </section>
    )
  }

}

//all courses for user of id
//TODO change from hardcoded userId
export const COURSE_QUERY = gql`
  query courseQuery($id: ID!) {
    course(
        id:$id
    ){
        id
        title
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

export default graphql(COURSE_QUERY, {
  name: 'courseQuery',
  options: (props) => {
    console.log(props.match.params.courseId);
    return { variables: { id:props.match.params.courseId } }
  }
}) (CourseDetails)