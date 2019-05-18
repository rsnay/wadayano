import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';

import { withAuthCheck } from '../shared/AuthCheck';
import CreateCourseForm from './CreateCourseForm';

import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';

export class CourseList extends Component {

  render() {

    if (this.props.instructorQuery && !this.props.instructorQuery.currentInstructor) {
        return <LoadingBox />;
    }

    if (this.props.instructorQuery && this.props.instructorQuery.error) {
        return <ErrorBox><p>Couldn’t load courses.</p></ErrorBox>;
    }

    let courses = this.props.instructorQuery.currentInstructor.courses;

    return (
        <section className="section">
        <div className="container">
          <h1 className="title">Courses</h1>
          <hr />
          <div className="tile is-ancestor" style={{flexWrap: "wrap"}}>

            {courses.map((course, index) => 
                <div className="tile is-4 is-parent" key={course.id}>
                    <Link to={"/instructor/course/" + course.id} className="tile is-child box">
                        <p className="title">
                            {course.title}
                        </p>
                        <hr />
                        <div className="content">
                            <span><span className="icon"><i className="fas fa-user-graduate" aria-hidden="true"></i></span>&nbsp;
                            <span style={{marginBottom: "5px"}}>{course.students.length === 1 ? '1 Student' : course.students.length + ' Students'}</span></span>
                            <br />
                            <span><span className="icon"><i className="fas fa-list-ul" aria-hidden="true"></i></span>&nbsp;
                            <span style={{marginBottom: "5px"}}>{course.quizzes.length === 1 ? '1 Quiz' : course.quizzes.length + ' Quizzes'}</span></span>
                        </div>
                    </Link>
                </div>
            )}

            <div className="tile is-4 is-parent">
                <span className="tile is-child box">
                    <p className="title">
                        <span style={{verticalAlign: "-10%"}} className="icon"><i className="fas fa-plus-square" aria-hidden="true"></i></span>
                        &nbsp;
                        Create Course
                    </p>
                    <div className="content">
                        <CreateCourseForm />
                    </div>
                </span>
            </div>

        </div>

        </div>
      </section>
    )
  }

}

// Get all courses for current instructor
export const INSTRUCTOR_QUERY = gql`
  query instructorQuery {
    currentInstructor{
        id
      courses{
          id
          title
          quizzes{
              id
          }
          students {
              id
          }
      }
    }
  }
`

export default withAuthCheck(compose(
    graphql(INSTRUCTOR_QUERY, {
        name: 'instructorQuery',
        options: { fetchPolicy: 'cache-and-network' }
    }),
) (CourseList), { instructor: true });
