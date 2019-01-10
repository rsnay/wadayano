import gql from 'graphql-tag';

const instructorFullQuestion = gql`
    fragment InstructorFullQuestion on Question {
        id
        concept
        prompt
        type
        correctShortAnswers
        options {
            id
            text
            isCorrect
        }
    }
`;

// Same as instructorFullQuestion, but doesn’t include restricted options.isCorrect and correctShortAnswers
const studentFullQuestion = gql`
    fragment StudentFullQuestion on Question {
        id
        concept
        prompt
        type
        options {
            id
            text
        }
    }
`;

const studentFullQuestionAttempt = gql`
    fragment StudentFullQuestionAttempt on QuestionAttempt {
        id
        question {
          ...StudentFullQuestion
        }
        option {
          id
          text
        }
        correctOption {
          id
          text
        }
        shortAnswer
        correctShortAnswer
        isCorrect
        isConfident
    }
    ${studentFullQuestion}
`;

const studentFullQuizAttempt = gql`
    fragment StudentFullQuizAttempt on QuizAttempt {
        id
        completed
        score
        postSucceeded
        quiz {
            id
            title
            questions {
                ...StudentFullQuestion
            }
        }
        questionAttempts {
            ...StudentFullQuestionAttempt
        }
        conceptConfidences {
            id
            concept
            confidence
        }
    }
    ${studentFullQuestion}
    ${studentFullQuestionAttempt}
`;

export default {
    instructorFullQuestion,
    studentFullQuestion,
    studentFullQuestionAttempt,
    studentFullQuizAttempt
}