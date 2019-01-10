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

export default {
    instructorFullQuestion,
    studentFullQuestion
}