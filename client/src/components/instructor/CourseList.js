import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

import AuthCheck from './AuthCheck';
import CreateCourseForm from './CreateCourseForm';

export default class CourseList extends Component {
    constructor(props) {
        super(props);
        this.state = {
        };
    }

  render() {

    // TODO actually get data from API
    const courses = [
        {id: 'course1', title: 'Example Course 1', quizzes: [1,2,3]},
        {id: 'course2', title: 'Example Course 2', quizzes: [1]},
        {id: 'course3', title: 'Example Course 3', quizzes: [1,2,4,5,6,7]}
    ];

    return (
        <section class="section">
        <AuthCheck location={this.props.location} />
        <div class="container">
          <h1 class="title">Courses</h1>
          <hr />
          <div class="tile is-ancestor" style={{flexWrap: "wrap"}}>

          <div class="tile is-4 is-parent">
                <span className="tile is-child box">
                    <p class="title">
                        <span class="icon"><i class="fas fa-plus-square" aria-hidden="true"></i></span>
                        &nbsp;
                        Create Course
                    </p>
                    <div class="content">
                        <CreateCourseForm />
                    </div>
                </span>
            </div>

            {courses.map((course, index) => 
                <div class="tile is-4 is-parent">
                    <Link to={"/instructor/course/" + course.id} className="tile is-child box">
                        <p class="title">
                            <span class="icon"><i class="fas fa-flask" aria-hidden="true"></i></span>
                            &nbsp; &nbsp;
                            {course.title}
                        </p>
                        <hr />
                        <div class="content">
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