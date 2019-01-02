import React, { Component } from 'react';
import { Link } from 'react-router-dom';

import { withAuthCheck } from '../shared/AuthCheck';

import QuizReview from './QuizReview';

class QuizReviewPage extends Component {
  render() {

    const quizAttemptId = this.props.match.params.quizAttemptId;

    return (
      <section className="section">
        <div className="container">

          <div>

            <QuizReview quizAttemptId={quizAttemptId} />

            {!this.props.hideFooter &&
              <React.Fragment>
              <hr />
              <p className="control">
                    <Link to="/student" className="button is-medium">
                        Return to Dashboard
                    </Link>
              </p>
              </React.Fragment>
            }
          </div>

        </div>
      </section>
    );
  }
}

export default withAuthCheck(QuizReviewPage, { student: true, instructor: true });
