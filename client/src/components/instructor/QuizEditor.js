import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

import AuthCheck from './AuthCheck';

export default class QuizEditor extends Component {
  state = {
  }

  render() {
    return (
        <section class="section">
        <AuthCheck location={this.props.location} />
        <div class="container">
          <h1 class="title is-inline-block">Not a real quiz</h1>
          &nbsp;&nbsp;
            <a class="button">
                <span class="icon is-small">
                <i class="fas fa-edit"></i>
                </span>
            </a>

        <div class="panel">
            <p class="panel-heading">
                Question 1
                <a class="is-pulled-right button is-small">
                    <span class="icon ">
                        <i class="fas fa-trash"></i>
                    </span>
                </a>
            </p>
            <div class="panel-block">
                <textarea class="textarea is-medium" type="text" placeholder="Not a real question"></textarea>
            </div>
            <p class="panel-block">
                concept selector
            </p>
            <p class="panel-block">
                Editable answers
            </p>
            <p class="panel-block">
                So forth
            </p>
            </div>

            <div class="field is-grouped">
                <p class="control">
                    <a class="button is-danger">
                    Delete Quiz
                    </a>
                </p>
                <p class="control">
                    <a class="button">
                    Discard Changes
                    </a>
                </p>
                <p class="control">
                    <a class="button is-link">
                    Save Quiz
                    </a>
                </p>
            </div>
        </div>
      </section>
    )
  }

}