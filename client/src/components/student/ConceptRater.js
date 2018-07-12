import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

const MIN_RATING = 1;
const MAX_RATING = 5;

export default class ConceptRater extends Component {


  constructor(props) {
    super(props);
    this.state = {
        ratings: [],
        submitted: false,
    };
  }

  // Called when one of the ratings changes for a concept
  _setRating(conceptId, newValue) {
    // If there's a rating for this concept, update it
    let ratings = this.state.ratings;
    let exists = false;
    ratings.forEach(rating => {
        if (rating.conceptId === conceptId) {
            rating.value = newValue;
            exists = true;
        }
    });
    // Otherwise add a rating
    if (!exists) {
        ratings.push({ conceptId: conceptId, value: newValue });
    }
    this.setState({ ratings: ratings });
  }

  render() {

    let concepts = this.props.concepts.map((concept, index) =>
        <div className="" key={concept.id}>
            <h3 className="subtitle is-4">{concept.title}</h3>
            <NumericRater
                minRating={MIN_RATING}
                maxRating={MAX_RATING}
                onChange={(newValue) => this._setRating(concept.id, newValue)}
            />
            <br />
        </div>
    );

    let submitButton = (
        <button autoFocus className="button is-primary" onClick={() => {
            this.setState({ submitted: true });
            // TODO pass actual ratings
            this.props.onConceptsRated();
        }}>Start Quiz</button>
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
    onConceptsRated: PropTypes.func.isRequired,
    concepts: PropTypes.array.isRequired
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
                <span key={i.toString()}
                    className={"button " + (this.state.selectedValue === i ? "is-selected is-info" : "")}
                    onClick={this._buttonClickHandler(i)} >
                    {i}
                </span>
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
    onChange: (val) => alert(val)
};

NumericRater.propTypes = {
    minRating: PropTypes.number,
    maxRating: PropTypes.number,
    onChange: PropTypes.func
};