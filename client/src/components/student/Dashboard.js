import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';
import { withAuthCheck } from '../shared/AuthCheck';

class Dashboard extends Component {

  render() {

    if (this.props.quizzesQuery && this.props.quizzesQuery.loading) {
        return <LoadingBox />;
    }

    if (this.props.quizzesQuery && this.props.quizzesQuery.error) {
        return <ErrorBox>Couldn’t load quizzes</ErrorBox>;
    }

    const quizzes = this.props.quizzesQuery.quizzes;

    return (
        <section className="section">
        <div className="container">
          <h1 className="title">My Dashboard</h1>
          <h3 className="subtitle">Course Title</h3>
          <p>Take a practice quiz below. To take a quiz that is graded for this course, please launch it from your learning management system (i.e. Canvas or Learning Suite)</p>
          <hr />

          <div style={{overflowX: "auto"}}>
            <table className="table is-striped is-hoverable is-fullwidth">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Quiz Name</th>
                        <th># of Questions</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {quizzes.map((quiz, index) => 
                        <tr key={quiz.id}>
                            <td>{quiz.id}</td>
                            <td>{quiz.title}</td>
                            <td>{quiz.questions.length}</td>
                            <td>
                            <Link to={"/student/quiz/" + quiz.id}
                            className="button is-outlined is-primary">
                                <span className="icon">
                                <i className="fas fa-rocket"></i>
                                </span>
                                <span>Practice Quiz</span>
                            </Link>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
        </div>
      </section>
    )
  }
}

export const QUIZZES_QUERY = gql`
    query {
        quizzes {
            id
            title
            questions {
                id
            }
        }
    }
`

export default withAuthCheck(graphql(QUIZZES_QUERY, {name: 'quizzesQuery'}) (Dashboard), { student: true });