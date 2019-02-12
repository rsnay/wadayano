import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';
import ReactTooltip from 'react-tooltip';

import ErrorBox from '../shared/ErrorBox';
import ConfidenceSelector from '../student/ConfidenceSelector';
import { ALPHABET, MULTIPLE_CHOICE } from '../../constants';
import LoadingBox from '../shared/LoadingBox';
import { formatScore } from '../../utils';

const SHORT_ANSWERS_TO_DISPLAY = 5;

// This is a stripped-down version of the QuestionReview component, to be used in the instructor’s aggregated quiz review report
class AggregatedQuestionReview extends Component {
    constructor(props) {
        super(props);
        this.state = {
            showAllAnswers: false
        };
    }

  render() {

    const promptView = (
        <div className="notification question-prompt" dangerouslySetInnerHTML={{__html: this.props.question.prompt}}></div>
    );

    const query = this.props.courseQuery || null;

    if (query && query.error) {
        return <ErrorBox><p>Couldn’t load question report.</p></ErrorBox>;
    }

    if (query && query.loading) {
        return (<React.Fragment>
            {promptView}
            <LoadingBox style={{maxWidth: "100%"}} />
            <hr />
        </React.Fragment>);
    }

    const questionOptions = this.props.question.options.filter(option => option.text.trim() !== '');
    const { correctShortAnswers } = this.props.question;
    const isMultipleChoice = (this.props.question.type === MULTIPLE_CHOICE);
    const studentCount = query.course.students.length;

    if (isMultipleChoice && questionOptions.length === 0) {
        return <ErrorBox><p>There are no options for this question. Please contact your instructor.</p></ErrorBox>;
    }

    let answerCounts = new Map();
    let confidentCount = 0;

    // Ensure correct options/shortAnswers have initial counts
    if (isMultipleChoice) {
        questionOptions.forEach(option => { answerCounts.set(option.id, 0)});
    } else {
        correctShortAnswers.forEach(answer => { answerCounts.set(answer, 0)});
    }

    query.course.students.forEach(student => {
        try {
            let questionAttempt = student.quizAttempts[0].questionAttempts[0];
            let answer;
            if (isMultipleChoice) {
                answer = questionAttempt.option.id;
            } else {
                // Get the correct short answer that the student’s answer matched, to avoid duplicates (with differences in capitalization or spacing) in the display
                if (questionAttempt.isCorrect) {
                    answer = questionAttempt.correctShortAnswer;
                } else {
                    answer = questionAttempt.shortAnswer;
                }
            }
            if (!answerCounts.has(answer)) {
                answerCounts.set(answer, 1);
            } else {
                answerCounts.set(answer, answerCounts.get(answer) + 1);
            }
            if (questionAttempt.isConfident) {
                confidentCount++;
            }
        // Just swallow errors, with invalid attempt simply being ommitted from the stats
        } catch (error) { console.error(error); }
    });

    // Sort the map by answerCount, descending
    answerCounts = new Map([...answerCounts.entries()].sort((a, b) => b[1] - a[1]));
    console.log(answerCounts);

    // If showing short-answer questions, only show the most popular 5 answers by default
    let showAllButton = null;
    if (!isMultipleChoice && !this.state.showAllAnswers && answerCounts.size > SHORT_ANSWERS_TO_DISPLAY) {
        answerCounts = new Map([...answerCounts.entries()].slice(0, SHORT_ANSWERS_TO_DISPLAY));
        showAllButton = (<button style={{marginTop: "-0.5rem"}} className="button has-text-link is-text is-fullwidth" onClick = {() => this.setState({ showAllAnswers: true })}>
            <span className="icon"><i className="fas fa-angle-down"></i></span>
            <span>View All Responses</span>
        </button>);
    }
    
    const correctIcon = <span className="icon"><i className="fas fa-check"></i></span>;
    let incorrectIcon = <span className="icon"><i className="fas fa-times"></i></span>;

    const optionListing = (id, containerClass, iconClass, icon, html, text, answerCount) => {
        return (<div className={"columns is-mobile question-option-container is-review " + containerClass} key={id} data-tip={answerCount + (answerCount === 1 ? ' student' : ' students') + ' (' + formatScore(answerCount / studentCount) + ')'}>
            <ReactTooltip />
            <span className={"column is-1 question-option-letter level-left is-rounded button " + iconClass} >
                <span>{icon}</span>
            </span>
            {/* Only use dangerouslySetInnerHTML if necessary, otherwise just show text (for short answers) */}
            {text ?
                <span className="column question-option-text level-left is-aggregated"  style={{background:`linear-gradient(90deg, #92cdf7 0%, #92cdf7 ${answerCount / studentCount * 100}%, rgba(9,9,121,0) ${answerCount / studentCount * 100}%)`}}>{text}</span>
            :
                <span className="column question-option-text level-left is-aggregated" dangerouslySetInnerHTML={{__html: html}}  style={{background:`linear-gradient(90deg, #92cdf7 0%, #92cdf7 ${answerCount / studentCount * 100}%, rgba(9,9,121,0) ${answerCount / studentCount * 100}%)`}}></span>
            }
        </div>)
    };

    let optionsView;
    if (isMultipleChoice) {
        // Display all options, show number of students who chose each, and indicate which is correct
        optionsView = questionOptions.filter(option => option.text.trim() !== '').map((option, index) => {
            const correct = option.isCorrect;
            const icon = correct ? correctIcon : ALPHABET[index];
            const iconClass = correct ? "has-text-success" : "";
            const answerCount = answerCounts.get(option.id);

            return optionListing(option.id, '', iconClass, icon, option.text, null, answerCount);
        });
    } else {
        optionsView = [];
        answerCounts.forEach((count, answer) => {
            const correct = correctShortAnswers.indexOf(answer) >= 0;
            const icon = correct ? correctIcon : incorrectIcon;
            const iconClass = correct ? "has-text-success" : "has-text-danger";

            optionsView.push(optionListing(answer, '', iconClass, icon, null, answer, count));
        });
    }

    const confidence = confidentCount / studentCount;
    let confidenceSelector = <ConfidenceSelector disabled title={`${Math.round(confidence * 100)}% of students were confident:`} confident={confidence >= 0.5} />;

    let feedbackView = <p className="question-option-text"></p>;

    return (
        <div>
            {promptView}
            <br />
            {optionsView}
            {showAllButton}
            {confidenceSelector}
            {feedbackView}
            <hr />
        </div>
    );
  }
}

AggregatedQuestionReview.propTypes = {
    // Question must include id, prompt, and options[] with id, isCorrect, and text of each option
    question: PropTypes.object.isRequired,
    // Needed to find relevant quiz attempts
    courseId: PropTypes.string.isRequired,
    quizId: PropTypes.string.isRequired
};

// Get the students’ answers for this question from their first attempt for the parent quiz
const COURSE_QUERY = gql`
  query courseQuery($courseId: ID!, $quizId: ID!, $questionId: ID!) {
    course(id:$courseId) {
    id
    students(where:{quizAttempts_some:{quiz:{id:$quizId}}}) {
      name
      quizAttempts(where:{quiz:{id:$quizId}}, first:1) {
        id
        score
        questionAttempts(where:{question:{id:$questionId}}) {
          id
          option {
            id
          }
          shortAnswer
          isCorrect
          correctShortAnswer
          isConfident
        }
      }
    }
  }
}`;

export default graphql(COURSE_QUERY, {
      name: 'courseQuery',
      options: (props) => {
        return { variables: {
            courseId: props.courseId,
            quizId: props.quizId, 
            questionId: props.question.id
        } }
      }
    }) (AggregatedQuestionReview);