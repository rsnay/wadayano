import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';

import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';

class QuizReview extends Component {

  render() {

    /*if (this.props.query && this.props.query.loading) {
        return <LoadingBox />;
    }

    if (this.props.query && this.props.query.error) {
        return <ErrorBox><p>Couldn't load the quiz review</p></ErrorBox>;
    }*/

    //const quizReview = this.props.query.quizReview;

    const quizAttempt = {
        conceptConfidences: [
            {id: "cc1", concept: {id: "c1", title: "concept 1"}, confidenceError: 0.3, confidenceBias: 0.5},
            {id: "cc2", concept: {id: "c2", title: "concept 2 long"}, confidenceError: 0.3, confidenceBias: 0.5},
            {id: "cc3", concept: {id: "c3", title: "concept 3 long long"}, confidenceError: 0.3, confidenceBias: 0.5},
            {id: "cc4", concept: {id: "c4", title: "concept 4 long long long"}, confidenceError: 0.3, confidenceBias: 0.5},
            {id: "cc5", concept: {id: "c5", title: "concept 5 long long long long"}, confidenceError: 0.3, confidenceBias: 0.5},
        ],
        score: 0.8,
        questionAttempts: [],
    };

    return (
        <div className="tile is-ancestor" style={{flexWrap: "wrap"}}>
        {quizAttempt.conceptConfidences.map((conceptConfidence, index) => 
            <div className="tile is-4 is-parent" key={conceptConfidence.id}>
                <div className="tile is-child box">
                    <p className="title">
                        {conceptConfidence.concept.title}
                    </p>
                    <p className="title">
                        {conceptConfidence.confidenceBias}
                    </p>
                    <div className="content">
                        <span className="icon"><i className="fas fa-thumbs-up"></i></span>&nbsp; Confident
                    </div>
                    <footer className="">
                        <button className="button is-primary is-block" style={{width: "100%"}}>Add to Study Plan</button>
                    </footer>
                </div>
            </div>
        )}
        </div>
    )
  }
}

export const QUIZ_ATTEMPT_QUERY = gql`
    query {
        quizzes {
            id
            title
            questions {
                id
            }
        }
    }
`

export default graphql(QUIZ_ATTEMPT_QUERY, {
    name: 'query',
    options: (props) => {
        // Pass the quiz ID from the route into the query
        return { variables: { id: props.quizAttemptId } }
    }
}) (QuizReview)