import React, { Component } from 'react';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';
import PropTypes from 'prop-types';

import { withAuthCheck } from '../shared/AuthCheck';

import { formatScore } from '../../utils';
import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';

import Logo from '../../logo_boxed.svg';

import QuestionReview from '../student/QuestionReview';
import Modal from '../shared/Modal';

import WadayanoScore from '../shared/WadayanoScore';

class AggregatedQuizReview extends Component {

    constructor(props) {
        super(props);
    
        this.state = {
        };
    
        // Pre-bind this function, to make adding it to input fields easier
    }

    //go through each concept and calculate the confidence bias/error
    sortConcepts(quizAttempt){
        // Get concepts from all questions in the quiz
        var quizConcepts = quizAttempt.quiz.questions.map(q => q.concept);
        // Remove duplicate concepts
        quizConcepts = Array.from(new Set(quizConcepts));

        var conceptConfidences = [];
        for(var i=0;i<quizConcepts.length;i++){
            
            //var confidence = 0;
            conceptConfidences.push({
                concept:"",
                confidence:0,
                confidenceError:0.0,
                confidenceBias:0.0,
                questionCnt:0,
                confidenceText:"",
                confidenceEmoji:"",
                conceptScore:0,
                correctQuestions:0,
                overCQuestions:0,
                underCQuestions:0,
                wadayano:0

            });
            conceptConfidences[i].concept = quizConcepts[i];
            conceptConfidences[i].confidence = quizAttempt.conceptConfidences[i].confidence;
            var confNum = 0;
            var corNum = 0;
            var correct = 0;
            for(var j=0; j<quizAttempt.questionAttempts.length; j++){
                conceptConfidences[i].id = i;
                var question = quizAttempt.questionAttempts[j].question;
                var questionAttempt = quizAttempt.questionAttempts[j];
                
                if(question.concept === quizConcepts[i]){
                    conceptConfidences[i].questionCnt +=1;
                    if(quizAttempt.questionAttempts[j].confidence){
                        conceptConfidences[i].confidence += 1;
                    }
    
                    if(questionAttempt.isCorrect){
                        correct+=1;
                    }
                    
                    if(questionAttempt.isConfident){
                        confNum = 1;
                    } else {
                        confNum = 0;
                    }
                    if(questionAttempt.isCorrect){
                        corNum = 1;
                    } else {
                        corNum = 0;
                    }
                    var compare = confNum - corNum; //get over/under/accurate confidence for single concept
                    console.log(compare);
                    switch(compare){
                        case -1:
                            console.log("A?");
                            conceptConfidences[i].underCQuestions += 1;
                            break;
                        case 0:
                            console.log("B?");
                            conceptConfidences[i].correctQuestions += 1;
                            break;
                        case 1:
                            console.log("C?");
                            conceptConfidences[i].overCQuestions += 1;
                            break;
                    }  
                }
            }
            //
            conceptConfidences[i].conceptScore = parseFloat((correct/conceptConfidences[i].questionCnt)*100).toFixed(1); //individual concept score
            conceptConfidences[i].confidenceError = Math.abs(conceptConfidences[i].confidence - correct);
            conceptConfidences[i].confidenceBias = (conceptConfidences[i].confidence - correct);
            conceptConfidences[i].wadayano = ((conceptConfidences[i].correctQuestions/conceptConfidences[i].questionCnt)*100).toFixed(1);
            console.log(conceptConfidences[i].correctQuestions);
            console.log(conceptConfidences[i].questionCnt);
            console.log(conceptConfidences[i].wadayano);
            if(conceptConfidences[i].wadayano > 90){
                conceptConfidences[i].confidenceText = "Accurate";
                conceptConfidences[i].confidenceEmoji = "🧘";
            } else if(conceptConfidences[i].overCQuestions === conceptConfidences[i].underCQuestions){
                conceptConfidences[i].confidenceText = "Mixed";
                conceptConfidences[i].confidenceEmoji = "🤷‍";
            } else if(conceptConfidences[i].overCQuestions > conceptConfidences[i].underCQuestions){
                conceptConfidences[i].confidenceText = "Overconfident";
                conceptConfidences[i].confidenceEmoji = "🤦‍";
            } else {
                conceptConfidences[i].confidenceText = "Underconfident";
                conceptConfidences[i].confidenceEmoji = "🙍‍";
            }
            console.log(conceptConfidences[i].confidenceText);
        }
        return conceptConfidences;
    }

  render() {

    if (this.props.quizQuery && this.props.quizQuery.error) {
        return <ErrorBox>Couldn’t load quiz</ErrorBox>;
    }

    if (this.props.quizQuery && this.props.quizQuery.loading) {
        return <LoadingBox />;
    }

    // Contains some quiz metadata, as well as precomputed average score and average wadayano score
    const quizInfo = this.props.quizInfo;
    // Quiz object from database
    const quiz = this.props.quizQuery.quiz;

    console.log(quiz);

    // Get all unique concepts in the quiz
    const concepts = Array.from(new Set(quiz.questions.map(q => q.concept)));
    console.log(concepts);

    return (
        <div>
            <div className="columns">
                <div className="column">
                    <h2 className="subtitle is-2">Average Score: {formatScore(quizInfo.averageScore)}</h2>
                    <WadayanoScore wadayano={Math.round(quizInfo.averageWadayanoScore * 100)} confidenceText="Mixed" />
                </div>
            </div>

            <div className="tile is-ancestor" style={{flexWrap: "wrap"}}>
                {concepts.map(concept => {
                    const questionCount = quiz.questions.filter(q => q.concept === concept).length;
                    return (
                        <div className="tile is-6 is-parent" key={concept}>
                            <div className="tile is-child box">
                                <p className="title">
                                    <span>{concept}</span>
                                    <span className="question-count">{questionCount === 1 ? '1 Question' : questionCount + ' Questions'}</span>
                                </p>
                                <p className="title">
                                    Score: {formatScore(Math.random())}
                                </p>
                                <WadayanoScore wadayano={Math.round(Math.random() * 100)} confidenceText={"Mixed"}/>
                                <footer className="">
                                    <button className="button is-primary is-block" style={{width: "100%"}} onClick={() => alert('Not yet implemented')}>View Details</button>
                                </footer>
                            </div>
                        </div>
                    )
                })}
            </div>

        </div>)
  }
}

AggregatedQuizReview.propTypes = {
    quizInfo: PropTypes.object.isRequired
};

// Get the quiz and attempts
export const QUIZ_QUERY = gql`
  query quizQuery($id: ID!) {
    quiz(id:$id){
        id
        title
        type
        course{
            id
            title
            students {
                id
                name
            }
        }
        questions {
            id
            concept
            prompt
        }
        quizAttempts {
            id
            student {
                id
                name
            }
            createdAt
            completed
            score
            questionAttempts {
                id
                isCorrect
                isConfident
            }
        }
    }
  }
`

export default withAuthCheck(compose(
    graphql(QUIZ_QUERY, {
      name: 'quizQuery',
      options: (props) => {
        console.log(props);
        return { variables: { id: props.quizInfo.id } }
      }
    }),
  )(AggregatedQuizReview), { instructor: true });