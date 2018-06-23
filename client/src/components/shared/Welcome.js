import React, { Component } from 'react';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

export default class Welcome extends Component {
  state = {
  }

  render() {
    return (
        <section class="section">
        <div class="container">
          <h1 class="title">Knowledge Monitoring Dashboard/Quizzes</h1>
          <h2 class="subtitle">Under Development</h2>
          <div class="content">
            <ul>
                <li>See <a href="https://bulma.io/documentation/">Bulma Documentation</a> for styling information</li>
                <li>Choose Instructors or Students in the navbar above</li>
            </ul>
          </div>
        </div>
      </section>
    )
  }

}