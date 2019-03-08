import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';
import ScrollIntoViewIfNeeded from 'react-scroll-into-view-if-needed';

import NumericRater from '../shared/NumericRater';

/**
 * Component used in QuizTaker to have the student estimate # of questions they
 * will answer correctly for each concept. See PropTypes details at the end.
 */
class ConceptRater extends Component {

    constructor(props) {
        super(props);
        this.state = {
            ratings: [],
            isSubmitting: false
        };
    }

    // Called when one of the ratings changes for a concept
    setRating(concept, newConfidence) {
        // If there's a rating for this concept, update it
        let ratings = this.state.ratings;
        let exists = false;
        ratings.forEach(rating => {
            if (rating.concept === concept) {
                rating.confidence = newConfidence;
                exists = true;
            }
        });
        // Otherwise add a rating
        if (!exists) {
            ratings.push({ concept: concept, confidence: newConfidence });
        }
        this.setState({ ratings: ratings });
    }

    // Sends the concept confidences/ratings to the server
    async submitConceptRatings() {
        // Prevent re-submission while loading
        if (this.state.isSubmitting) {
            return;
        }
        this.setState({ isSubmitting: true });

        await this.props.rateConceptsMutation({
            variables: {
                quizAttemptId: this.props.quizAttemptId,
                conceptConfidences: this.state.ratings
            }
        });
        // Tell QuizTaker to continue
        this.props.onConceptsRated();
    }

    render() {
        let conceptSliders = [];

        this.props.conceptQuestionCounts.forEach((questionCount, concept) => {
            conceptSliders.push(
                <div key={concept}>
                    <h4 className="subtitle is-4">
                        {concept}
                        <span className="question-count">
                            {questionCount === 1 ? '1 Question' : questionCount + ' Questions'}
                        </span>
                    </h4>
                    <NumericRater
                        minRating={0}
                        maxRating={questionCount}
                        onChange={(newConfidence) => this.setRating(concept, newConfidence)}
                    />
                    <br />
                </div>
            );
        });

        let submitButton = (
            <ScrollIntoViewIfNeeded>
                <button
                    autoFocus
                    className={"button is-primary" + (this.state.isSubmitting ? " is-loading" : "")}
                    onClick={() => this.submitConceptRatings() }
                >
                    Start Quiz
                </button>
            </ScrollIntoViewIfNeeded>
        );

        return (
            <div>
                <p className="notification">
                    This quiz includes the following topics.<br />
                    For each topic, mark how many questions you expect to answer correctly.<br />
                </p>
                {conceptSliders}
                <br />
                {this.state.ratings.length === this.props.conceptQuestionCounts.size && submitButton}
            </div>
        )
    }
}

ConceptRater.propTypes = {
    // Required { key: conceptName --> value: questionCount} Map object
    // Implement custom checker to ensure this is a Map
    conceptQuestionCounts: function(props, propName, componentName) {
        if (!(props[propName] instanceof Map)) {
            return new Error(
              'Invalid prop `' + propName + '` supplied to' +
              ' `' + componentName + '`. Validation failed: must be a Map.'
            );
        }
    },
    quizAttemptId: PropTypes.string.isRequired,
    onConceptsRated: PropTypes.func.isRequired
};

const RATE_CONCEPTS_MUTATION = gql`
  mutation RateConcepts($quizAttemptId: ID!, $conceptConfidences: [ConceptConfidenceCreateInput!]!) {
    rateConcepts(quizAttemptId: $quizAttemptId, conceptConfidences: $conceptConfidences) {
      id
    }
  }
`;

export default graphql(RATE_CONCEPTS_MUTATION, { name: 'rateConceptsMutation' })(ConceptRater);