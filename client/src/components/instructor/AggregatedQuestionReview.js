import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';
import ReactTooltip from 'react-tooltip';

import ErrorBox from '../shared/ErrorBox';
import ConfidenceSelector from '../student/ConfidenceSelector';
import { ALPHABET, MULTIPLE_CHOICE } from '../../constants';
import Spinner from '../shared/Spinner';
import { formatScore } from '../../utils';

const SHORT_ANSWERS_TO_DISPLAY = 5;

// Modified version of the QuestionReview component that displays aggregated stats, to be used in the instructor’s aggregated quiz review report
class AggregatedQuestionReview extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showAllAnswers: false,
    };
  }

  render() {
    const promptView = (
      <div
        className="notification question-prompt"
        dangerouslySetInnerHTML={{ __html: this.props.question.prompt }}
      />
    );

    const query = this.props.courseQuery || null;

    if (query && query.error) {
      return (
        <ErrorBox>
          <p>Couldn’t load question report.</p>
        </ErrorBox>
      );
    }

    if (query && !query.course) {
      return (
        <>
          {promptView}
          <Spinner style={{ maxWidth: '100%' }} />
          <hr />
        </>
      );
    }

    const questionOptions = this.props.question.options.filter(option => option.text.trim() !== '');
    const { correctShortAnswers } = this.props.question;
    const isMultipleChoice = this.props.question.type === MULTIPLE_CHOICE;

    if (isMultipleChoice && questionOptions.length === 0) {
      return (
        <ErrorBox>
          <p>There are no options for this question. Add options in the quiz editor.</p>
        </ErrorBox>
      );
    }

    let totalAnswerCount = 0;
    let answerCounts = new Map();
    let confidentCount = 0;

    // Ensure correct options/shortAnswers have initial answer counts so that they always display, even if not chosen
    if (isMultipleChoice) {
      questionOptions.forEach(option => {
        answerCounts.set(option.id, 0);
      });
    } else {
      correctShortAnswers.forEach(answer => {
        answerCounts.set(answer, 0);
      });
    }

    query.course.students.forEach(student => {
      try {
        // QuestionAttempts within the QuizAttempt are already filtered to only this question
        const questionAttempt = student.quizAttempts[0].questionAttempts[0];
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
        // Add this to the total answer count (in case of errors, or not all students answering this question, the percents will still add up to 100%)
        totalAnswerCount++;
        // Just swallow errors, with invalid attempt simply being ommitted from the stats
      } catch (error) {
        console.error(error);
      }
    });

    // Sort the map by answerCount, descending. a[i] is the value in the key-value pair
    answerCounts = new Map([...answerCounts.entries()].sort((a, b) => b[1] - a[1]));
    console.log(answerCounts);

    // If showing short-answer questions, only show the most popular 5 answers by default
    let showAllButton = null;
    if (
      !isMultipleChoice &&
      !this.state.showAllAnswers &&
      answerCounts.size > SHORT_ANSWERS_TO_DISPLAY
    ) {
      answerCounts = new Map([...answerCounts.entries()].slice(0, SHORT_ANSWERS_TO_DISPLAY));
      showAllButton = (
        <button
          style={{ marginTop: '-0.5rem' }}
          className="button has-text-link is-text is-fullwidth is-rounded"
          onClick={() => this.setState({ showAllAnswers: true })}
          type="button"
        >
          <span className="icon">
            <i className="fas fa-angle-down" />
          </span>
          <span>View All Responses</span>
        </button>
      );
    }

    const correctIcon = (
      <span className="icon">
        <i className="fas fa-check" />
      </span>
    );
    const incorrectIcon = (
      <span className="icon">
        <i className="fas fa-times" />
      </span>
    );
    const progressGradient = (answerCount, totalAnswerCount) =>
      `linear-gradient(90deg, #92cdf7 0%, #92cdf7 ${(answerCount / totalAnswerCount) *
        100}%, rgba(9,9,121,0) ${(answerCount / totalAnswerCount) * 100}%)`;

    const optionListing = (id, containerClass, iconClass, icon, html, text, answerCount) => {
      return (
        <div
          className={`columns is-mobile question-option-container is-review ${containerClass}`}
          key={id}
          data-tip={`${answerCount + (answerCount === 1 ? ' student' : ' students')} (${formatScore(
            answerCount / totalAnswerCount,
            0
          )})`}
        >
          <ReactTooltip />
          <span
            className={`column is-1 question-option-letter level-left is-rounded button ${iconClass}`}
          >
            <span>{icon}</span>
          </span>
          {/* Only use dangerouslySetInnerHTML if necessary, otherwise just show text (for short answers) */}
          {text ? (
            <span
              className="column question-option-text level-left is-aggregated"
              style={{ background: progressGradient(answerCount, totalAnswerCount) }}
            >
              {text}
            </span>
          ) : (
            <span
              className="column question-option-text level-left is-aggregated"
              dangerouslySetInnerHTML={{ __html: html }}
              style={{ background: progressGradient(answerCount, totalAnswerCount) }}
            />
          )}
        </div>
      );
    };

    let optionsView;
    if (isMultipleChoice) {
      // Display all options, show number of students who chose each, and indicate which is correct
      optionsView = questionOptions
        .filter(option => option.text.trim() !== '')
        .map((option, index) => {
          const correct = option.isCorrect;
          const icon = correct ? correctIcon : ALPHABET[index];
          const iconClass = correct ? 'has-text-success' : '';
          const answerCount = answerCounts.get(option.id);

          return optionListing(option.id, '', iconClass, icon, option.text, null, answerCount);
        });
    } else {
      // Display all correct and actually-given short answers, show number of students who chose each, and indicate which are correct
      optionsView = [];
      answerCounts.forEach((count, answer) => {
        const correct = correctShortAnswers.indexOf(answer) >= 0;
        const icon = correct ? correctIcon : incorrectIcon;
        const iconClass = correct ? 'has-text-success' : 'has-text-danger';

        optionsView.push(optionListing(answer, '', iconClass, icon, null, answer, count));
      });
    }

    // Overall question confidence
    const confidence = confidentCount / totalAnswerCount;
    const confidenceSelector = (
      <ConfidenceSelector
        disabled
        title={`${formatScore(confidence, 0)} of students were confident:`}
        confident={confidence >= 0.5}
      />
    );

    return (
      <div>
        {promptView}
        <br />
        {optionsView}
        {showAllButton}
        {confidenceSelector}
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
  quizId: PropTypes.string.isRequired,
};

// Get the students’ answers for this question from their first attempt for the parent quiz
const COURSE_QUERY = gql`
  query courseQuery($courseId: ID!, $quizId: ID!, $questionId: ID!) {
    course(id: $courseId) {
      id
      students(where: { quizAttempts_some: { quiz: { id: $quizId } } }) {
        name
        quizAttempts(where: { quiz: { id: $quizId }, completed_not: null }, first: 1) {
          id
          score
          questionAttempts(where: { question: { id: $questionId } }) {
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
  }
`;

export default graphql(COURSE_QUERY, {
  name: 'courseQuery',
  options: props => {
    return {
      fetchPolicy: 'cache-and-network',
      variables: {
        courseId: props.courseId,
        quizId: props.quizId,
        questionId: props.question.id,
      },
    };
  },
})(AggregatedQuestionReview);
