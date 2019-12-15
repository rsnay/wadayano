import React from 'react';
import PropTypes from 'prop-types';
import { useParams, Link } from 'react-router-dom';

import withAuthCheck from '../shared/AuthCheck';
import QuizReview from './QuizReview';

const QuizReviewPage = ({ hideTitle = false, hideFooter = false }) => {
  const { quizAttemptId } = useParams();
  return (
    <section className="section">
      <div className="container">
        <QuizReview quizAttemptId={quizAttemptId} hideTitle={hideTitle} />

        {!hideFooter && (
          <>
            <hr />
            <Link to="/student/dashboard" className="button is-medium">
              Return to Dashboard
            </Link>
          </>
        )}
      </div>
    </section>
  );
};

QuizReviewPage.propTypes = {
  hideTitle: PropTypes.bool,
  hideFooter: PropTypes.bool,
};

export default withAuthCheck(QuizReviewPage, { student: true, instructor: true });
