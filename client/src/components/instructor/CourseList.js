import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

import AuthCheck from './AuthCheck';

export default class CourseList extends Component {
  state = {
  }

  render() {
    return (
        <section class="section">
        <AuthCheck />
        <div class="container">
          <h1 class="title">Courses</h1>
          <hr />
          <div class="tile is-ancestor">

            <div class="tile is-4 is-parent">
                <Link to="/instructor/course/1" className="tile is-child box">
                    <p class="title">
                        <span class="icon"><i class="fas fa-flask" aria-hidden="true"></i></span>
                        &nbsp;
                        Not a Real Course
                    </p>
                    <hr />
                    <div class="content">
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus nec iaculis mauris.
                        <br />
                        5 Quizzes
                    </div>
                </Link>
            </div>

            <div class="tile is-4 is-parent">
                <Link to="/instructor/course/1" className="tile is-child box">
                    <p class="title">
                        <span class="icon"><i class="fas fa-flask" aria-hidden="true"></i></span>
                        &nbsp;
                        Another Fake Course
                    </p>
                    <hr />
                    <div class="content">
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus nec iaculis mauris.
                        <br />
                        7 Quizzes
                    </div>
                </Link>
            </div>

        </div>

        </div>
      </section>
    )
  }

}