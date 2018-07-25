import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';

class Dashboard extends Component {

  render() {

    if (this.props.quizzesQuery && this.props.quizzesQuery.loading) {
        return <LoadingBox />;
    }

    if (this.props.quizzesQuery && this.props.quizzesQuery.error) {
        return <ErrorBox>Couldn't load quizzes</ErrorBox>;
    }

    const quizzes = this.props.quizzesQuery.quizzes;

    return (
        <section className="section">
        <div className="container">
          <h1 className="title is-inline-block">Student Dashboard</h1>
          <p>To take a quiz, you will need to log in as a Student via LTI.</p>
          <p><button className="button" onClick={() => {localStorage.setItem("authRole", "student"); localStorage.setItem("authToken","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjampvZml0M3Roc2VzMGIzN3d4aGx0eGh3IiwiaXNJbnN0cnVjdG9yIjpmYWxzZSwiaWF0IjoxNTMyNDY3NDgzfQ.IF0UO4QG_Gl-9eA3R_Jy68j-ptxc9LIVN3XHdQvOKOc"); window.location.reload();}}>
          <span className="icon">
            <i className="fas fa-user-graduate"></i>
          </span>
           &nbsp; Or perform a fake login</button></p>
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
                                <span>Take Quiz</span>
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

export default graphql(QUIZZES_QUERY, {name: 'quizzesQuery'}) (Dashboard)