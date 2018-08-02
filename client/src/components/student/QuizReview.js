import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';
import PropTypes from 'prop-types';

import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';

class QuizReview extends Component {

    wadayanoScore(quizAttempt)
    {
        var i = 0;
        var wadayano = 0;
        var confidence = 0;
        var correct = 0;
        console.log("confidence:"+quizAttempt.conceptConfidence);
        console.log("correct:"+quizAttempt.correct);

        for(i; i < quizAttempt.questionAttempts.length; i++){
            if(quizAttempt.questionAttempts[i].confidence){
                confidence += 1;
            }
            if(quizAttempt.questionAttempts[i].isCorrect){
                correct += 1;
            }
        }
        wadayano = confidence - correct;
        console.log(wadayano);
        return wadayano;
    }

  render() {

    /*if (this.props.query && this.props.query.loading) {
        return <LoadingBox />;
    }

    if (this.props.query && this.props.query.error) {
        return <ErrorBox><p>Couldn’t load the quiz review</p></ErrorBox>;
    }*/

    const quizAttempt = this.props.quizAttempt;
    console.log(quizAttempt);
    console.log(quizAttempt.questionAttempts[0].question.title);


    this.wadayanoScore(quizAttempt);

    // TOOD once concept confidences are stored on the server, use conceptConfidences from the quizAttempt prop
    //const conceptConfidences = quizAttempt.conceptConfidences
    const conceptConfidences = [
        {id: "cc1", concept: {id: "c1", title: "concept 1"}, confidenceError: 0.3, confidenceBias: 0.5},
        {id: "cc2", concept: {id: "c2", title: "concept 2 long"}, confidenceError: 0.3, confidenceBias: 0.5},
        {id: "cc3", concept: {id: "c3", title: "concept 3 long long"}, confidenceError: 0.3, confidenceBias: 0.5},
        {id: "cc4", concept: {id: "c4", title: "concept 4 long long long"}, confidenceError: 0.3, confidenceBias: 0.5},
        {id: "cc5", concept: {id: "c5", title: "concept 5 long long long long"}, confidenceError: 0.3, confidenceBias: 0.5},
    ];

    // Score format of 33.3%
    const formattedScore = `${Math.round(quizAttempt.score * 1000) / 10}%`;

    const gradePostMessage = this.props.isGraded && (this.props.gradePostSucceeded ?
            <span class="notification is-success is-pulled-right">Score posted successfully.</span>
        :
            <span className="notification is-danger is-pulled-right">There was an error posting your score to your learning management system.</span>
        );

    return (
        <div>
            <div className="columns">
                <div className="column">
                    <h2 className="subtitle is-2">Score: {formattedScore}</h2>
                </div>
                <div className="column">
                    {gradePostMessage}
                </div>
            </div>
            <div className="tile is-ancestor" style={{flexWrap: "wrap"}}>
            {conceptConfidences.map((conceptConfidence, index) => 
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
        </div>
    )
  }
}

QuizReview.propTypes = {
    quizAttempt: PropTypes.object.isRequired,
    isGraded: PropTypes.bool.isRequired,
    gradePostSucceeded: PropTypes.bool
};

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
