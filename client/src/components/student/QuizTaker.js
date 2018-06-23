import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

export default class QuizTaker extends Component {
  state = {
  }

  render() {
    return (
        <section class="section">
        <div class="container">
          <h1 class="title is-inline-block">Not a real quiz</h1>
          <hr />

          <p>This will contain the quiz-taking experience</p>

          <hr />

          <p class="control">
                <Link to="/student" className="button">
                    Return to Dashboard
                </Link>
          </p>

        </div>
      </section>
    )
  }
}