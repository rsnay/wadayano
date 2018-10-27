import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';
import ScrollIntoViewIfNeeded from 'react-scroll-into-view-if-needed';

import { formatScore } from '../../utils';

const MIN_RATING = 1;
const MAX_RATING = 5;

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
                    <h4 className="subtitle is-4" style={{marginBottom: "0.5rem"}}>{concept} – {questionCount === 1 ? '1 Question' : questionCount + ' Questions'}</h4>
                    <ConceptRatingSlider
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
                    How confident are you in your mastery of each?<br />
                    <b>Updated copy here!</b>
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

class ConceptRatingSlider extends Component {
    constructor(props) {
        super(props);
        this.state = {
            currentValue: 0
        };
        this._handleSliderChange = this._handleSliderChange.bind(this);
    }

    _handleSliderChange(e) {
        console.log(e);
        this.setState({ currentValue: e.currentTarget.value })
        this.props.onChange(e.currentTarget.value);
    }

    render() {
        return (
            <div className="control">
                <input
                    autoFocus={this.props.autoFocus}
                    type="range"
                    className=""
                    style={{width: "100%", maxWidth: "250px"}}
                    min={this.props.minRating}
                    max={this.props.maxRating}
                    onChange={this._handleSliderChange}
                    />
                <label className="tag is-light" style={{marginLeft: "1rem"}}>{formatScore(this.state.currentValue / this.props.maxRating)}</label>
            </div>
        );
    }
}

ConceptRatingSlider.defaultProps = {
    minRating: 0,
    maxRating: 100,
    onChange: (val) => alert(val),
    autoFocus: false
};

ConceptRatingSlider.propTypes = {
    minRating: PropTypes.number,
    maxRating: PropTypes.number,
    onChange: PropTypes.func,
    autoFocus: PropTypes.bool
};

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