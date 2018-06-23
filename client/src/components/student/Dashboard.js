import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

export default class Dashboard extends Component {
  state = {
  }

  render() {
    return (
        <section class="section">
        <div class="container">
          <h1 class="title is-inline-block">Student Dashboard</h1>
          <hr />
          <p>For now, take any quiz</p>

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
                    <Link to="/student/quiz/1" className="button is-outlined is-primary">
                        <span class="icon">
                        <i class="fas fa-rocket"></i>
                        </span>
                        <span>Take Quiz</span>
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