import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

import AuthCheck from './AuthCheck';

export default class CourseDetails extends Component {
  state = {
  }

  render() {
    return (
        <section class="section">
        <AuthCheck />
        <div class="container">
        <nav class="breadcrumb" aria-label="breadcrumbs">
            <ul>
                <li><Link to="/instructor">Course List</Link></li>
                <li class="is-active"><Link to="/instructor/course/1" aria-current="page">Not a real course</Link></li>
            </ul>
        </nav>
          <h1 class="title is-inline-block">Not a real course</h1>
          &nbsp;&nbsp;
            <a class="button">
                <span class="icon is-small">
                <i class="fas fa-edit"></i>
                </span>
            </a>
          <hr />

          <table class="table is-striped is-hoverable is-fullwidth">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Quiz Name</th>
                    <th>Other Info</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>1</td>
                    <td>Not a real quiz</td>
                    <td>10 questions</td>
                    <td>
                    <Link to="/instructor/quiz/1" className="button is-outlined is-primary">
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