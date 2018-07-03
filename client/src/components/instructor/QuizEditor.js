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
        <section className="section">
        <AuthCheck location={this.props.location} />
        <div className="container">
          <h1 className="title is-inline-block">Not a real quiz</h1>
          &nbsp;&nbsp;
            <a className="button">
                <span className="icon is-small">
                <i className="fas fa-edit"></i>
                </span>
            </a>

        <div className="panel">
            <p className="panel-heading">
                Question 1
                <a className="is-pulled-right button is-small">
                    <span className="icon ">
                        <i className="fas fa-trash"></i>
                    </span>
                </a>
            </p>
            <div className="panel-block">
                <textarea className="textarea is-medium" type="text" placeholder="Not a real question"></textarea>
            </div>
            <p className="panel-block">
                concept selector
            </p>
            <p className="panel-block">
                Editable answers
            </p>
            <p className="panel-block">
                So forth
            </p>
            </div>

            <div className="field is-grouped">
                <p className="control">
                    <a className="button is-danger">
                    Delete Quiz
                    </a>
                </p>
                <p className="control">
                    <a className="button">
                    Discard Changes
                    </a>
                </p>
                <p className="control">
                    <a className="button is-link">
                    Save Quiz
                    </a>
                </p>
            </div>
        </div>
      </section>
    )
  }

}