const { shield, and, or, allow, deny } = require('graphql-shield');
const rules = require('./rules');

// Restrict most things in the public-facing schema.graphql (which includes some things from the internal datamodel.graphql)
// Currently, isCorrect on Option is protected from student access via a custom resolver
const Permissions = {
    Query: {
        quiz: rules.canAccessQuiz,
        currentInstructor: rules.isInstructor,
        course: rules.isAuthenticated, // More lax here, since individual properties are controlled below
        courseConcepts: rules.isAuthenticated, // More lax here, since individual properties are controlled below
        question: rules.canAccessQuestion,
        currentStudent: rules.isStudent,
        currentStudentQuizAttempts: rules.isStudent,
        quizAttempt: rules.canAccessQuizAttempt
    },
    Mutation: {
        updateQuiz: rules.ownsQuiz,
        addCourse: rules.isInstructor,
        createQuiz: rules.ownsCourse,
        updateCourse: rules.ownsCourse,
        deleteCourse: rules.ownsCourse,
        deleteQuiz: rules.ownsQuiz,
        addQuestion: rules.ownsQuiz,
        updateQuestion: rules.ownsQuestion,
        deleteQuestion: rules.ownsQuestion,
        importQuestions: rules.ownsQuiz,
        updateSurvey: rules.ownsCourse,
        sendInstructorCourseInvite: rules.ownsCourse,
        removeInstructorFromCourse: rules.ownsCourse,
      
        instructorSignup: allow,
        instructorLogin: allow,
        instructorRequestPasswordReset: allow,
        instructorResetPassword: allow,
        instructorUpdateProfile: rules.isInstructor,
        sendFeedback: rules.isAuthenticated,
      
        /* The following mutations handle their own permissions already.
           That could be moved into a rule here, but it would require an extra
           query and result in less-specific error messages.
            startOrResumeQuizAttempt: rules.enrolledInQuiz,
            completeQuizAttempt: rules.ownsQuizAttempt,
            rateConcepts: rules.ownsQuizAttempt,
            attemptQuestion: rules.ownsQuizAttempt,
        */
      
        submitSurveyResult: rules.enrolledInCourse,
        trackEvent: allow
    },
    Course: {
        title: rules.canAccessCourse,
        number: rules.canAccessCourse,
        lmsUrl: rules.canAccessCourse,
        quizzes: rules.canAccessCourse,
        instructors: rules.ownsCourse,
        students: rules.ownsCourse,
        ltiSecret: rules.ownsCourse,
        survey: rules.canAccessCourse,
        surveyResults: rules.ownsCourse,
        pendingCourseInvites: rules.ownsCourse
    },
    // No additional controls on quiz or question are needed, since if a user can access a course, they have permission to access all quizzes and questions within the course
    // Exceptions to above comment: restrict backlink of Quiz to QuizAttempts, and Option to QuestionAttempts
    Quiz: {
        quizAttempts: rules.isInstructor
    },
    Option: {
        // These are needed as backlinks (see comment in datamodel.graphql), but no user should ever access them
        questionAttempts: deny,
        correctQuestionAttempts: deny
    }

};

module.exports = {
    Permissions
}