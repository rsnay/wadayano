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
        return <ErrorBox/>;
    }

    let courses = this.props.instructorQuery.instructor.courses;

    return (
        <section className="section">
        <div className="container">
          <h1 className="title">Courses</h1>
          <hr />
          <div className="tile is-ancestor" style={{flexWrap: "wrap"}}>

          <div className="tile is-4 is-parent">
                <span className="tile is-child box">
                    <p className="title">
                        <span className="icon"><i className="fas fa-plus-square" aria-hidden="true"></i></span>
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
                            <span className="icon"><i className="fas fa-flask" aria-hidden="true"></i></span>
                            &nbsp; &nbsp;
                            {course.title}
                        </p>
                        <hr />
                        <div className="content">
                            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus nec iaculis mauris.
                            <br />
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
    instructor{
        id
      courses{
          id
          title
          quizzes{
              id
          }
      }
    }
  }
`

export const COURSE_QUERY = gql`
query coursesQuery{
    courses{
        id
        title
        quizzes{
            id
        }
    }
}`


export default withAuthCheck(compose(
graphql(INSTRUCTOR_QUERY, {name:"instructorQuery"}),
graphql(COURSE_QUERY, {name:"coursesQuery"}),
) (CourseList), { instructor: true});
