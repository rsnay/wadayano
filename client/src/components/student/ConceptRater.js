import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';
import ScrollIntoViewIfNeeded from 'react-scroll-into-view-if-needed';

const MIN_RATING = 1;
const MAX_RATING = 5;

class ConceptRater extends Component {

    constructor(props) {
        super(props);
        this.state = {
            ratings: [],
            isLoading: false
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
        this.setState({ isLoading: true });
        await this.props.rateConceptsMutation({
            variables: {
                quizAttemptId: this.props.quizAttemptId,
                conceptConfidences: this.state.ratings
            }
        });
        // TODO pass actual ratings
        this.props.onConceptsRated();
        this.props.onConceptsRated();
    }

    render() {

        let concepts = this.props.concepts.map((concept, index) =>
            <div className="" key={concept}>
                <h4 className="subtitle is-4">{concept}</h4>
                <NumericRater
                    autoFocus={index === 0}
                    minRating={MIN_RATING}
                    maxRating={MAX_RATING}
                    onChange={(newConfidence) => this._setRating(concept, newConfidence)}
                />
                <br />
            </div>
        );

        let submitButton = (
            <ScrollIntoViewIfNeeded>
                <button autoFocus className={"button is-primary" + (this.state.isLoading ? " is-loading" : "")} onClick={() => {
                    this._submitConceptRatings();
                }}>Start Quiz</button>
            </ScrollIntoViewIfNeeded>
        );

        return (
            <div>
                <p className="notification">This quiz includes the following topics.<br />How confident are you in your mastery of each? (1 = least confident; 5 = most confident)</p>
                {concepts}
                <br />
                {this.state.ratings.length === this.props.concepts.length && submitButton}
            </div>
        )
    }
}

ConceptRater.propTypes = {
    concepts: PropTypes.array.isRequired,
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