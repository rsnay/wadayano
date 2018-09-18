import React, { Component } from 'react';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';
import PropTypes from 'prop-types';

import { withAuthCheck } from '../shared/AuthCheck';

import { formatScore } from '../../utils';
import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';

import Logo from '../../logo_standalone.svg';

import QuestionReview from './QuestionReview';

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
            wadayano:null,

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
            if(quizAttempt.questionAttempts[i].isConfident && quizAttempt.questionAttempts[i].isCorrect){
                correctConfidence += 1;
            }
        }
        if(this.state.wadayano === null){
            this.setState({wadayano : parseFloat((correctConfidence / questionNum * 100)).toFixed(1)});
            this.confidenceText(this.state.wadayano,quizAttempt);
        }
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
        //console.log("percent:"+percent+"%");
    }

    confidenceText(wadayano, quizAttempt){
        var quizConfidenceText;
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
            quizConfidenceText = "🧘 accurate";
        } else if(quizOverC === quizUnderC){
            quizConfidenceText = "🤷‍ mixed";
        } else if(quizOverC > quizUnderC){
            quizConfidenceText = "🤦‍ overConfident";
        } else {
            quizConfidenceText = "🙍‍ underConfidence";
        }
        this.setState({confidenceText:quizConfidenceText});
    }
    //go through each concept and calculate the confidence bias/error
    sortConcepts(quizAttempt){
        console.log("WHY!!!!!");
        //console.log("qa")
        //console.log(quizAttempt);
        var quizConcepts = quizAttempt.quiz.concepts;
        //console.log("quiz")
        //console.log(quizConcepts);
        var conceptConfidences = [];
        for(var i=0;i<quizConcepts.length;i++){
            
            //var confidence = 0;
            var correct = 0;
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
                underCQuestions:0

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
                
                //console.log(question.concept);
                //console.log(quizConcepts[i]);
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
            var conceptCorrectPercent;
            conceptCorrectPercent = (conceptConfidences[i].correctQuestions/conceptConfidences[i].questionCnt)*100;
            console.log(conceptConfidences[i].correctQuestions);
            console.log(conceptConfidences[i].questionCnt);
            console.log(conceptCorrectPercent);
            if(conceptCorrectPercent > 90){
                conceptConfidences[i].confidenceText = "accurate";
                conceptConfidences[i].confidenceEmoji = "🧘";
            } else if(conceptConfidences[i].overCQuestions === conceptConfidences[i].underCQuestions){
                conceptConfidences[i].confidenceText = "mixed";
                conceptConfidences[i].confidenceEmoji = "🤷‍";
            } else if(conceptConfidences[i].overCQuestions > conceptConfidences[i].underCQuestions){
                conceptConfidences[i].confidenceText = "overConfident";
                conceptConfidences[i].confidenceEmoji = "🤦‍";
            } else {
                conceptConfidences[i].confidenceText = "underConfidence";
                conceptConfidences[i].confidenceEmoji = "🙍‍";
            }
            console.log(conceptConfidences[i].confidenceText);
        }
        console.log("conceptConfidence:")
        console.log(conceptConfidences);
        return conceptConfidences;
    }

    selectReview(concept, quizAttempt){
        var modal = document.getElementById("modal");
        
        if(this.state.concept !== concept){
            this.setState({concept: concept});
            var conceptQuestions = [];
            var questionAttempt;
            //console.log("this");
            //console.log(quizAttempt);
            for(var i = 0; i < quizAttempt.questionAttempts.length; i++){
                questionAttempt = quizAttempt.questionAttempts[i];
                if(questionAttempt.question.concept === concept){
                    conceptQuestions.push(questionAttempt);
                }
            }
            this.setState({conceptQuestions: conceptQuestions, showReviewForConcept: concept});
        } else {
            this.setState({concept:null,conceptQuestions: [],showReviewForConcept: null});
        }
        modal.style.display = "block"; 
        window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
        //conceptQuestions: [],
    }

    

  render() {

    console.log("here");
    console.log(this.props);
    
    if (this.props.quizAttemptQuery && this.props.quizAttemptQuery.loading) {
        return <LoadingBox />;
    }

    if (this.props.quizAttemptQuery && this.props.quizAttemptQuery.error) {
        return <ErrorBox>Couldn’t load quiz</ErrorBox>;
    }
    //console.log(this.props.quizAttemptQuery);

    const quizAttempt = this.props.quizAttemptQuery.currentStudentQuizAttempt;
    
    //console.log(quizAttempt.questionAttempts[0].question.title);

    this.wadayanoScore(quizAttempt);

    //this.sortConcepts(quizAttempt);
    //this.overallScore(quizAttempt);
    
    // Use conceptConfidences from the quizAttempt prop
    //const conceptConfidences = quizAttempt.conceptConfidences;
    const conceptConfidences = this.sortConcepts(quizAttempt);

    // Score format of 33.3%
    const formattedScore = formatScore(quizAttempt.score);

    // If postSucceeded is null, then it was not a graded attempt
    const isGraded = (quizAttempt.postSucceeded !== null);
    const gradePostMessage = isGraded && (quizAttempt.postSucceeded ?
            <span className="notification is-success is-inline-block">Score was posted successfully.</span>
        :
            <span className="notification is-danger is-inline-block">There was an error posting your score to your learning management system. Your instructor will be notified of your score and will enter it manually.</span>
        );

    return (
        <div>
            <div className="columns">
                <div className="column">
                <h2 className="subtitle is-2">{quizAttempt.quiz.title}</h2>
                    <h2 className="subtitle is-2">Score: {formattedScore}</h2>
                    <div className="wadayano_line">
                        <img id="wadayano_list" src={Logo} alt="wadayano" style={{maxHeight: "3rem", height: "3rem", margin: "10px"}} />&nbsp;
                        <h2 className="subtitle is-2" id="wadayano_list">wadayano score&#8482;: {this.state.wadayano}%</h2>&nbsp;
                        <span id="emoji">{this.state.confidenceEmoji}</span>{this.state.confidenceText}
                    </div>
                </div>
            </div>
            {gradePostMessage}
            <div className="tile is-ancestor" style={{flexWrap: "wrap"}}>
            {conceptConfidences.map((conceptConfidence, index) => 
                <div className="tile is-4 is-parent" key={conceptConfidence.id}>
                    <div className="tile is-child box">
                        <p className="title">
                            {conceptConfidence.concept} <span id="questionNum" >{conceptConfidence.questionCnt} Questions</span>
                        </p>
                        <p className="title">
                            Score: {conceptConfidence.conceptScore}%
                        </p>
                        <div className="content">
                            <span className="icon"><i className="fas fa-thumbs-up"></i> <i className="fas fa-thumbs-down"></i></span>&nbsp; Confidence: {conceptConfidence.confidence}/5
                            <br/><span id="emoji">{conceptConfidence.confidenceEmoji}</span>({conceptConfidence.confidenceText})
                        </div>
                        <div id={conceptConfidence.concept+ "review"}></div>
                        <footer className="">
                            <button className="button is-primary is-block" style={{width: "100%"}} onClick = {this.selectReview.bind(null,conceptConfidence.concept, quizAttempt)}>View Details</button>
                        </footer>
                    </div>
                </div>
            )}
            </div>
            <div id = "modal">
                <div className = "modal-content">
                    {(this.state.showReviewForConcept === this.state.concept && this.state.conceptQuestions.length > 0) &&
                        <span className="concept-questions-list" id={"questionReview"+this.state.concept}>
                        &nbsp; Questions about {this.state.concept}: &nbsp;
                        {this.state.conceptQuestions.map(conceptQuestion => (
                            <QuestionReview className = "question-review" id={conceptQuestion.id} questionAttempt={conceptQuestion} question={conceptQuestion.question} />
                        ))}
                        <br/>
                        </span>
                    }
                </div>
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