import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';
import PropTypes from 'prop-types';

import { withAuthCheck } from '../shared/AuthCheck';
import ButterToast, { ToastTemplate } from '../shared/Toast';

import { formatScore } from '../../utils';
import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';

import QuestionReview from './QuestionReview';
import Modal from '../shared/Modal';

import WadayanoScore from '../shared/WadayanoScore';

class QuizReview extends Component {

    constructor(props) {
        super(props);
    
        this.state = {
            concept:null,
            concepts: [],
            showReviewForConcept: null,
            conceptQuestions: [],
            savedScrollPosition: null,
            confidenceText:null,
            confidenceEmoji:null,
            wadayano:null,
            displayConceptReview:false,
            helpTextShow:false,
            displayhelpText:false,
        };
    
        // Pre-bind this function, to make adding it to input fields easier
        //this.saveQuiz = this.saveQuiz.bind(this);
        this.selectReview = this.selectReview.bind(this);
    }


    wadayanoScore(quizAttempt)
    {
        var i = 0;
        //var wadayano = 0;
        var questionNum = 0;
        var correctConfidence = 0;
        
        //console.log("confidence:"+quizAttempt.conceptConfidence);
        //console.log("correct:"+quizAttempt.correct);

        for(i; i < quizAttempt.questionAttempts.length; i++){
            questionNum += 1;
            if((quizAttempt.questionAttempts[i].isConfident && quizAttempt.questionAttempts[i].isCorrect) || 
              (!quizAttempt.questionAttempts[i].isConfident && !quizAttempt.questionAttempts[i].isCorrect) ){
                correctConfidence += 1;
            }
        }
        if(this.state.wadayano === null){
            var wadayano = parseFloat((correctConfidence / questionNum * 100)).toFixed(1);
            this.setState({wadayano});
            this.confidenceText(wadayano,quizAttempt);
        }
    }

    confidenceText(wadayano, quizAttempt){
        var quizConfidenceText;
        var quizConfidenceEmoji;
        var quizOverC = 0;
        var quizUnderC = 0;
        for(var i = 0; i < quizAttempt.questionAttempts.length; i++){
            var correct = 0;
            var confident = 0;
            var compare = 0;
            if(quizAttempt.questionAttempts[i].isConfident){
                confident = 1;
            }
            if(quizAttempt.questionAttempts[i].isCorrect){
                correct = 1;
            }
            compare = confident - correct;
            switch(compare){
                case -1:
                    quizUnderC += 1;
                    break;
                case 0:
                    break;
                case 1:
                quizOverC += 1;
                    break;
            } 
        }
        if(wadayano > 90){
            quizConfidenceText = "Accurate";
            quizConfidenceEmoji = "🧘";
        } else if(quizOverC === quizUnderC){
            quizConfidenceText = "Mixed";
            quizConfidenceEmoji = "🤷‍";
        } else if(quizOverC > quizUnderC){
            quizConfidenceText = "Overconfident";
            quizConfidenceEmoji = "🤦‍";
        } else {
            quizConfidenceText = "Underconfident";
            quizConfidenceEmoji = "🙍‍";
        }
        this.setState({confidenceText:quizConfidenceText});
        this.setState({confidenceEmoji:quizConfidenceEmoji});
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
            console.log(conceptConfidences[i].confidence)
            //conceptConfidences[i].confidenceScore = quizAttempt.conceptConfidence[i].confidenceScore;
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

    predictedScore(numQuestions, numPredict){
        console.log("number of Questions :" + numQuestions);
        console.log("number predicted :" + numPredict);
        var finalPercent;
        finalPercent = ((numPredict / numQuestions)*100).toFixed(1);
        return finalPercent;
    }

    selectReview(concept, quizAttempt){
        var conceptQuestions = [];
        var questionAttempt;
        for(var i = 0; i < quizAttempt.questionAttempts.length; i++){
            questionAttempt = quizAttempt.questionAttempts[i];
            if(questionAttempt.question.concept === concept){
                conceptQuestions.push(questionAttempt);
            }
        }
        this.setState({conceptQuestions: conceptQuestions, showReviewForConcept: concept, concept, displayConceptReview:true});
    }
    

  render() {

    console.log("here");
    console.log(this.props);
    
    if (this.props.quizAttemptQuery && this.props.quizAttemptQuery.loading) {
        return <LoadingBox />;
    }

    if (this.props.quizAttemptQuery && this.props.quizAttemptQuery.error) {
        return <ErrorBox><p>Couldn’t load quiz results. Please try again later.</p></ErrorBox>;
    }
    //console.log(this.props.quizAttemptQuery);

    const quizAttempt = this.props.quizAttemptQuery.quizAttempt;
    
    //console.log(quizAttempt.questionAttempts[0].question.title);

    this.wadayanoScore(quizAttempt);

    var predictedConcepts = 0;
    var x;
    for(x in quizAttempt.conceptConfidences){
        console.log("hey");
        console.log(quizAttempt.conceptConfidences[x].confidence);
        predictedConcepts += quizAttempt.conceptConfidences[x].confidence;
    }
    console.log(predictedConcepts + "sdhakjhfdalhd");
    
    //this.sortConcepts(quizAttempt);
    
    // Use conceptConfidences from the quizAttempt prop
    //const conceptConfidences = quizAttempt.conceptConfidences;
    let conceptConfidences;
    try {
        conceptConfidences = this.sortConcepts(quizAttempt);
    } catch (error) {
        console.error(error);
        ButterToast.raise({
            content: <ToastTemplate content="There was an error generating the report for this quiz. Please contact us if this problem persists." className="is-danger" />
        });
        return (
            <p className="control">
                <Link to="/student" className="button is-medium">
                    Return to Dashboard
                </Link>
            </p>);
    }

    // Score format of 33.3%
    const formattedScore = formatScore(quizAttempt.score);

    // If postSucceeded is null, then it was not a graded attempt
    const isGraded = (quizAttempt.postSucceeded !== null);

    return (
        <div className="quiz-review-container">
            <div className="columns">
                <div className="column is-6">
                <h2 className="subtitle is-2">{quizAttempt.quiz.title}</h2>
                    <h2 className="subtitle is-2">Score: {formattedScore} <span className="has-text-weight-light">({this.predictedScore(quizAttempt.quiz.questions.length,predictedConcepts)}% Predicted)</span></h2>
                    <WadayanoScore wadayano={this.state.wadayano} confidenceText={this.state.confidenceText}/>
                </div>
            </div>
            <div className="tile is-ancestor" style={{flexWrap: "wrap"}}>
            {conceptConfidences.map((conceptConfidence, index) => 
                <div className="tile is-6 is-parent" key={conceptConfidence.id}>
                    <div className="tile is-child box">
                        <p className="title">
                            <span>{conceptConfidence.concept}</span>
                            <span className="question-count">{conceptConfidence.questionCnt === 1 ? '1 Question' : conceptConfidence.questionCnt + ' Questions'}</span>
                        </p>
                        <p className="title">
                            Score: {conceptConfidence.conceptScore}% <span className="has-text-weight-light">({this.predictedScore(conceptConfidence.questionCnt,conceptConfidence.confidence)}% Predicted)</span>
                        </p>
                        <WadayanoScore wadayano={conceptConfidence.wadayano} confidenceText={conceptConfidence.confidenceText}/>
                        <div id={conceptConfidence.concept+ "review"}></div>
                        <footer className="">
                            <button className="button is-primary is-block" style={{width: "100%"}} onClick = {this.selectReview.bind(null,conceptConfidence.concept, quizAttempt)}>View Details</button>
                        </footer>
                    </div>
                </div>
            )}
            </div>
            <Modal
                modalState={this.state.displayConceptReview}
                closeModal={() => this.setState({ displayConceptReview: false })}
                title={"Concept Review: " + this.state.concept}>
                <span className="concept-questions-list" id={"questionReview"+this.state.concept}>
                    {this.state.conceptQuestions.map(conceptQuestion => (
                        <div className="question-review" key={conceptQuestion.id}>
                        <QuestionReview id={conceptQuestion.id} questionAttempt={conceptQuestion} question={conceptQuestion.question} />
                        <hr />
                        </div>
                    ))}
                    <br/>
                </span>
            </Modal>
        </div>)
  }
}

QuizReview.propTypes = {
    quizAttempt: PropTypes.object.isRequired
};

const QUIZ_ATTEMPT_QUERY = gql`
  query quizAttemptQuery($id: ID!) {
    quizAttempt(id: $id) {
      id
      completed
      score
      postSucceeded
      quiz {
        id
        title
        questions {
          id
          prompt
          concept
          options {
            id
            text
          }
        }
      }
      questionAttempts {
        id
        question {
          id
          prompt
          concept
          options{
              id
              text
          }
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

export default withAuthCheck(compose(
    graphql(QUIZ_ATTEMPT_QUERY, {
      name: 'quizAttemptQuery',
      options: (props) => {
        console.log(props);
        return { variables: { id: props.quizAttemptId } }
      }
    }),
  )(QuizReview), { student: true, instructor: true });
