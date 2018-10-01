const { shield, and, or } = require('graphql-shield');
const rules = require('./rules');

// Restrict most things in the public-facing schema.graphql (which includes some things from the internal datamodel.graphql)
// Currently, isCorrect on Option is protected from student access via a custom resolver
const Permissions = {
    Query: {  
        //course: rules.canAccessCourse,
        //courses: rules.canAccessCourse
    },
    Mutation: {
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
};

module.exports = {
    Permissions
}