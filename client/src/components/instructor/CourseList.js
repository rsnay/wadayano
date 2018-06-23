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
          <table class="table is-striped is-hoverable is-fullwidth">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Course Name</th>
                    <th>Other Info</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>1</td>
                    <td>Not a real course</td>
                    <td>Something</td>
                    <td>
                    <Link to="/instructor/course/1" className="button is-outlined is-primary">
                        <span class="icon">
                        <i class="fas fa-edit"></i>
                        </span>
                        <span>Edit/View</span>
                    </Link>
                    </td>
                </tr>
            </tbody>
        </table>
        </div>
      </section>
    )
  }

}