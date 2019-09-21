import React from 'react';
import { Link } from 'react-router-dom';

import withAuthCheck from '../shared/AuthCheck';
import QuizReview from './QuizReview';

const QuizReviewPage = ({
  match: {
    params: { quizAttemptId },
  },
  hideTitle = false,
  hideFooter = false,
}) => (
  <section className="section">
    <div className="container">
      <div>
        <QuizReview quizAttemptId={quizAttemptId} hideTitle={hideTitle} />

        {!hideFooter && (
          <>
            <hr />
            <p className="control">
              <Link to="/student" className="button is-medium">
                Return to Dashboard
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  </section>
);

export default withAuthCheck(QuizReviewPage, { student: true, instructor: true });
