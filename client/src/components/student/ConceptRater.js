import React, { useState } from 'react';
import PropTypes from 'prop-types';
import ScrollIntoViewIfNeeded from 'react-scroll-into-view-if-needed';

import NumericRater from '../shared/NumericRater';
import { apiRequest } from '../../api';

/**
 * Component used in QuizTaker to have the student estimate # of questions they
 * will answer correctly for each concept. See PropTypes details at the end.
 */
const ConceptRater = ({ conceptQuestionCounts, quizAttemptId, onConceptsRated }) => {
  const [ratings, setRatings] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Called when one of the ratings changes for a concept
  const setRating = (concept, newConfidence) => {
    // Remove any previous rating for this concept
    const newRatings = ratings.filter(c => c.concept !== concept);
    // Add new rating
    newRatings.push({ concept, confidence: newConfidence });
    setRatings(newRatings);
  };

  // Sends the concept confidences/ratings to the server
  const submitConceptRatings = async () => {
    // Prevent re-submission while loading
    if (isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      await apiRequest(
        `/api/student/quiz-attempts/${encodeURIComponent(quizAttemptId)}/concept-confidences`,
        { method: 'POST', body: { conceptConfidences: ratings } },
      );
      // Tell QuizTaker to continue
      onConceptsRated();
    } catch (e) {
      let message = '';
      if (e.errors && e.errors.length > 0) {
        message = e.errors[0].message;
      }
      setError(
        `Error submitting answers. If this error continues, please reload the page and try again. ${message}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const conceptSliders = [];

  conceptQuestionCounts.forEach((questionCount, concept) => {
    conceptSliders.push(
      // Eslint thinks this is an array index, but it is actually a map key
      // eslint-disable-next-line react/no-array-index-key
      <div key={concept}>
        <h4 className="subtitle is-4">
          {concept}
          <span className="question-count">
            {questionCount === 1 ? '1 Question' : `${questionCount} Questions`}
          </span>
        </h4>
        <NumericRater
          minRating={0}
          maxRating={questionCount}
          onChange={newConfidence => setRating(concept, newConfidence)}
        />
        <br />
      </div>
    );
  });

  const submitButton = (
    <ScrollIntoViewIfNeeded>
      <hr />
      <button
        autoFocus
        className={`button is-primary${isSubmitting ? ' is-loading' : ''}`}
        onClick={() => submitConceptRatings()}
        type="submit"
        disabled={isSubmitting}
      >
        Start Quiz
      </button>
    </ScrollIntoViewIfNeeded>
  );

  return (
    <div>
      <p className="notification">
        This quiz includes the following topics. <br />
        For each topic, mark how many questions you expect to answer correctly.
      </p>
      {conceptSliders}
      {error && <p className="notification is-danger">{error}</p>}
      {ratings.length === conceptQuestionCounts.size && submitButton}
    </div>
  );
};

ConceptRater.propTypes = {
  // Required { key: conceptName --> value: questionCount} Map object
  // Implement custom checker to ensure this is a Map
  conceptQuestionCounts(props, propName, componentName) {
    if (!(props[propName] instanceof Map)) {
      return new Error(
        `Invalid prop \`${propName}\` supplied to` +
          ` \`${componentName}\`. Validation failed: must be a Map.`
      );
    }
    return null;
  },
  quizAttemptId: PropTypes.string.isRequired,
  onConceptsRated: PropTypes.func.isRequired,
};

export default ConceptRater;
