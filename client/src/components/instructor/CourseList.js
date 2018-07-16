import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

import AuthCheck from './AuthCheck';
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

    // TODO actually get data from API
    /*const courses = [
        {id: 'course1', title: 'Example Course 1', quizzes: [1,2,3]},
        {id: 'course2', title: 'Example Course 2', quizzes: [1]},
        {id: 'course3', title: 'Example Course 3', quizzes: [1,2,4,5,6,7]}
    ];*/

    if (this.props.instructorQuery && this.props.instructorQuery.loading) {
        return <LoadingBox />;
    }

    if (this.props.instructorQuery && this.props.instructorQuery.error) {
        return <ErrorBox>Couldn't load courses</ErrorBox>;
    }
    console.log(this.props);
    let courses = this.props.instructorQuery.instructor.courses;

    return (
        <section className="section">
        <AuthCheck location={this.props.location} />
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

//all courses for instructor of id
//TODO change from hardcoded instructorId
export const INSTRUCTOR_QUERY = gql`
  query instructorQuery($id: ID!) {
    instructor(
      id: $id
    )
    {
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

export const ADD_COURSE = gql`
mutation addCourseMutation($id:ID!, $title:String!)
    {
        addCourse(
            id:$id
            title:$title
        ){
            title
        }
    }`

export default graphql(INSTRUCTOR_QUERY, {
  name: 'instructorQuery',
  options: (props) => {
    //console.log(props.match.params.instructorId);
    // Pass the instructor ID from the route into the query //temporarily hardcoded instructor id
    return { variables: { id:"cjjej0vhi0w5f0b370p49q85c" } }
  }
}) (CourseList)