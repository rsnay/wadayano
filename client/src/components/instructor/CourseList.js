import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';

import { withAuthCheck } from '../shared/AuthCheck';
import CreateCourseForm from './CreateCourseForm';

import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';

export class CourseList extends Component {
    constructor(props) {
        super(props);
        this.state = {
        };
    }

    

  render() {

    if (this.props.instructorQuery && this.props.instructorQuery.loading) {
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

            {courses.map((course, index) => 
                <div className="tile is-4 is-parent" key={course.id}>
                    <Link to={"/instructor/course/" + course.id} className="tile is-child box">
                        <p className="title">
                            <span style={{verticalAlign: "middle"}} className="icon"><i className="fas fa-chalkboard-teacher" aria-hidden="true"></i></span>
                            &nbsp; &nbsp;
                            {course.title}
                        </p>
                        <hr />
                        <div className="content">
                            <span className="icon"><i className="fas fa-user-graduate" aria-hidden="true"></i></span>&nbsp;
                            {course.students.length === 1 ? '1 Student' : course.students.length + ' Students'}
                            <br />
                            <span className="icon"><i className="fas fa-list-ul" aria-hidden="true"></i></span>&nbsp;
                            {course.quizzes.length === 1 ? '1 Quiz' : course.quizzes.length + ' Quizzes'}
                        </div>
                    </Link>
                </div>
            )}

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
    graphql(INSTRUCTOR_QUERY, {name:"instructorQuery"}),
) (CourseList), { instructor: true});
