import React, { Component } from 'react';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';
import PropTypes from 'prop-types';

import { withAuthCheck } from '../shared/AuthCheck';

import { formatScore } from '../../utils';
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
            if(quizAttempt.questionAttempts[i].isConfident){
                confidence += 1;
            }
            if(quizAttempt.questionAttempts[i].isCorrect){
                correct += 1;
            }
        }
        wadayano = confidence - correct;
        console.log(confidence);
        console.log(correct)
        console.log(wadayano);
        return wadayano;
    }

    overallScore(quizAttempt){
        var correct = 0;
        for(var i=0;i<quizAttempt.questionAttempts.length; i++){
            if(quizAttempt.questionAttempts[i].isCorrect){
                correct+=1;
            }
        }
        var numQuestion = quizAttempt.questionAttempts.length;
        var percent = correct/numQuestion*10;
        console.log("percent:"+percent+"%");
    }

    //go through each concept and calculate the confidence bias/error
    sortConcepts(quizAttempt){
        console.log("qa"+quizAttempt);
        var quizConcepts = quizAttempt.quiz.concepts;
        console.log("quiz"+quizConcepts);
        var conceptConfidences = [];
        for(var i=0;i<quizConcepts.length;i++){
            var confidence = 0;
            var correct = 0;
            conceptConfidences.push({
                concept:"",
                confidence:0,
                confidenceError:0.0,
                confidenceBias:0.0
            });
            conceptConfidences[i].concept = quizConcepts[i];
            for(var j=0; j<quizAttempt.questionAttempts.length; j++){
                conceptConfidences[i].id = i;
                var question = quizAttempt.questionAttempts[j].question;
                var correct = 0;
                if(question.concept === quizConcepts[i]){
                    conceptConfidences[i].confidence += 1;
                }
                if(question.isCorrect){
                    correct+=1;
                }
                conceptConfidences[i].confidenceError = Math.abs(conceptConfidences[i].confidence - correct);
                conceptConfidences[i].confidenceBias = (conceptConfidences[i].confidence - correct);
            }
        }
        console.log("conceptConfidence:")
        console.log(conceptConfidences);
        return conceptConfidences;
    }

  render() {

    
    console.log(this.props);
    
    if (this.props.quizAttemptQuery && this.props.quizAttemptQuery.loading) {
        return <LoadingBox />;
    }

    if (this.props.quizAttemptQuery && this.props.quizAttemptQuery.error) {
        return <ErrorBox>Couldn’t load quiz</ErrorBox>;
    }
    console.log(this.props.quizAttemptQuery);

    const quizAttempt = this.props.quizAttemptQuery.currentStudentQuizAttempt;
    
    console.log(quizAttempt.questionAttempts[0].question.title);

    this.wadayanoScore(quizAttempt);
    this.sortConcepts(quizAttempt);
    this.overallScore(quizAttempt);

    // Use conceptConfidences from the quizAttempt prop
    //const conceptConfidences = quizAttempt.conceptConfidences;
    const conceptConfidences = this.sortConcepts(quizAttempt);

    // Score format of 33.3%
    const formattedScore = formatScore(quizAttempt.score);

    // If postSucceeded is null, then it was not a graded attempt
    const isGraded = (quizAttempt.postSucceeded !== null);
    const gradePostMessage = isGraded && (quizAttempt.postSucceeded ?
            <span className="notification is-success is-pulled-right">Score was posted successfully.</span>
        :
            <span className="notification is-danger is-pulled-right">There was an error posting your score to your learning management system. Your instructor will be notified of your score and will enter it manually.</span>
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
                            {conceptConfidence.concept}
                        </p>
                        <p className="title">
                            {/*conceptConfidence.confidenceBias*/}
                        </p>
                        <div className="content">
                            <span className="icon"><i className="fas fa-thumbs-up"></i></span>&nbsp; Confidence: {conceptConfidence.confidence}
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
    quizAttempt: PropTypes.object.isRequired
};

const QUIZ_ATTEMPT_QUERY = gql`
  query quizAttemptQuery($id: ID!) {
    currentStudentQuizAttempt(id: $id) {
      id
      completed
      score
      postSucceeded
      quiz {
        id
        title
        concepts
        questions {
          id
          prompt
          options {
            id
            text
            isCorrect
          }
        }
      }
      questionAttempts {
        id
        question {
          id
          prompt
        }
        option {
          id
          text
        }
        correctOption {
          id
          text
        }
        isCorrect
        isConfident
      }
      conceptConfidences {
        id
        concept
        confidence
      }
    }
  }
`

/*export const QUIZ_ATTEMPT_QUERY = gql`
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
}) (QuizReview)*/

export default withAuthCheck(compose(
    graphql(QUIZ_ATTEMPT_QUERY, {
      name: 'quizAttemptQuery',
      options: (props) => {
        console.log(props);
        return { variables: { id: props.quizAttempt.id } }
      }
    }),
  )(QuizReview), { student: true });
