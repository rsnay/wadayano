import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';

import { withAuthCheck } from '../shared/AuthCheck';

import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';
import QuizReview from './QuizReview';

class QuizReviewPage extends Component {
  render() {

    if (this.props.quizAttemptQuery && this.props.quizAttemptQuery.loading) {
      return <LoadingBox />;
    }

    if (this.props.quizAttemptQuery && this.props.quizAttemptQuery.error) {
      return <ErrorBox><p>Couldn’t load quiz results. Please try again later.</p></ErrorBox>;
    }

    console.log(this.props);
    const quizAttempt = this.props.quizAttemptQuery.currentStudentQuizAttempt;

    return (
      <section className="section">
        <div className="container">

          <div>

            <QuizReview quizAttempt={quizAttempt} />

            <hr />
            <p className="control">
                  <Link to="/student" className="button is-medium">
                      Return to Dashboard
                  </Link>
            </p>
          </div>

        </div>
      </section>
    );
  }
}

// Get the quiz attemp information
// TODO what is retrieved here is duplicated from QuizTaker.js and should be extracted into an Apollo fragment to reduce duplication
const QUIZ_ATTEMPT_QUERY = gql`
  query quizAttemptQuery($id: ID!) {
    currentStudentQuizAttempt(id: $id) {
      id
      completed
      score
      postSucceeded
      quiz {
        id
        title
        questions {
          id
          prompt
          options {
            id
            text
            isCorrect
          }
        }
      }
      questionAttempts {
        id
        question {
          id
          prompt
        }
        option {
          id
          text
        }
        correctOption {
          id
          text
        }
        isCorrect
        isConfident
      }
      conceptConfidences {
        id
        concept
        confidence
      }
    }
  }
`

export default withAuthCheck(compose(
  graphql(QUIZ_ATTEMPT_QUERY, {
    name: 'quizAttemptQuery',
    options: (props) => {
      console.log(props);
      return { variables: { id: props.match.params.quizAttemptId } }
    }
  }),
)(QuizReviewPage), { student: true });
