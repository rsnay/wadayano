// The Application GraphQL Server endpoint to use (and auto-switch for production)
export const GRAPHQL_ENDPOINT =
  process.env.NODE_ENV !== 'production' ? 'http://localhost:4000/' : 'https://wadayano.com/api/';

// Base URL for LTI launches (no trailing slash), to which action and ID will be appended as GET parameters
export const LTI_LAUNCH_URL =
  process.env.NODE_ENV !== 'production'
    ? 'http://localhost:4000/lti'
    : 'https://www.wadayano.com/lti';

// This constant is simply used to make sure that the same name is always used for the localStorage key
export const AUTH_TOKEN = 'authToken';

// For the client to keep track of which role it is logged in as
export const AUTH_ROLE = 'authRole';
export const AUTH_ROLE_STUDENT = 'student';
export const AUTH_ROLE_INSTRUCTOR = 'instructor';

export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
// Letters are key codes 65–90: https://keycode.info/
export const KEY_CODE_A = 65;
export const KEY_CODE_Z = 90;
export const KEY_CODE_COMMA = 188;
export const KEY_CODE_PERIOD = 190;

export const QUIZ_TYPE_NAMES = { PRACTICE: 'Practice', GRADED: 'Graded' };

export const MULTIPLE_CHOICE = 'MULTIPLE_CHOICE';
export const SHORT_ANSWER = 'SHORT_ANSWER';
export const DEFAULT_QUESTION_TYPE = MULTIPLE_CHOICE;
export const QUESTION_TYPE_NAMES = {
  MULTIPLE_CHOICE: 'Multiple Choice',
  SHORT_ANSWER: 'Short Answer',
};

// The keys are used for css classes to display the specific emoji
export const CONFIDENCES = {
  OVERCONFIDENT: {
    key: 'OVERCONFIDENT',
    text: 'Overconfident',
  },
  ACCURATE: {
    key: 'ACCURATE',
    text: 'Accurate',
  },
  UNDERCONFIDENT: {
    key: 'UNDERCONFIDENT',
    text: 'Underconfident',
  },
  MIXED: {
    key: 'MIXED',
    text: 'Mixed',
  },
};
