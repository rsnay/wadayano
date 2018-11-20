import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';
import ScrollIntoViewIfNeeded from 'react-scroll-into-view-if-needed';

class ConceptRater extends Component {

    constructor(props) {
        super(props);
        this.state = {
            ratings: [],
            isSubmitting: false
        };
    }

    // Called when one of the ratings changes for a concept
    _setRating(concept, newConfidence) {
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
    async _submitConceptRatings() {
        // Prevent re-submission while loading
        if (this.state.isSubmitting) { return; }
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
        console.log(this.props);

        let conceptSliders = [];

        this.props.conceptQuestionCounts.forEach((questionCount, concept) => {
            conceptSliders.push(
                <div className="" key={concept}>
                    <h4 className="subtitle is-4">
                        {concept}
                        <span className="question-count">
                            {questionCount === 1 ? '1 Question' : questionCount + ' Questions'}
                        </span>
                    </h4>
                    <NumericRater
                        minRating={0}
                        maxRating={questionCount}
                        onChange={(newConfidence) => this._setRating(concept, newConfidence)}
                        />
                    <br />
                </div>
            );
        });

        let submitButton = (
            <ScrollIntoViewIfNeeded>
                <button autoFocus className={"button is-primary" + (this.state.isSubmitting ? " is-loading" : "")} onClick={() => {
                    this._submitConceptRatings();
                }}>Start Quiz</button>
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
    // TODO implement custom checker to ensure this is a Map
    conceptQuestionCounts: PropTypes.object.isRequired,
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

export default graphql(RATE_CONCEPTS_MUTATION, { name: 'rateConceptsMutation' })(ConceptRater)

// Component to display the group of numeric rating buttons, and pass up the current value when the selection changes
class NumericRater extends Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedValue: null
        };
    }

    // Called when a button is clicked
    _buttonClickHandler(i) {
        return () => {
            this.setState({ selectedValue: i })
            this.props.onChange(i);
        };
    }

    render() {
        let ratingButtons = [];
        // Loop to make buttons
        for (var i = this.props.minRating; i <= this.props.maxRating; i++) {
            ratingButtons.push(
                <button key={i.toString()}
                    autoFocus={i === this.props.minRating && this.props.autoFocus /* Only autofocus first button */}
                    className={"button " + (this.state.selectedValue === i ? "is-selected is-info" : "")}
                    onClick={this._buttonClickHandler(i)} >
                    {i}
                </button>
            );
        }
        // Put buttons in a group
        return (
            <div className="buttons has-addons">
                {ratingButtons}
            </div>
        );
    }
}

NumericRater.defaultProps = {
    minRating: 1,
    maxRating: 5,
    onChange: (val) => alert(val),
    autoFocus: false
};

NumericRater.propTypes = {
    minRating: PropTypes.number,
    maxRating: PropTypes.number,
    onChange: PropTypes.func,
    autoFocus: PropTypes.bool
};