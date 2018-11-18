const { rule, and, or, not } = require('graphql-shield');
const { getUserInfo } = require('../utils');

// Each of these rules returns a boolean to allow/deny access
// Rules that use the `context` parameter (any that use getUserInfo) need to have the cache property set to contextual.
// Rules that use `parent` or `args` parameters (checking if a user can access a particular entity) need to have cache set to strict
// Some rules that check for permission on a specific DB entity need to get the entity ID either from the parent (if part of a resolves), or from args (if the rule is attached to a Query in the schema)

const isStudent = rule({ cache: 'contextual' })(async (parent, args, context, info) => {
    console.log('SHIELD: IsStudent?');
    const userInfo = getUserInfo(context);
    return (userInfo.userId !== null) && !userInfo.isInstructor;
});

const isInstructor = rule({ cache: 'contextual' })(async (parent, args, context, info) => {
    console.log('SHIELD: IsInstructor?');
    const userInfo = getUserInfo(context);
    return (userInfo.userId !== null) && userInfo.isInstructor;
});

const isAuthenticated = or(isStudent, isInstructor);

// TODO: integrate fragment replacement middleware so that ID will always be in parent

// For the current permissions setup, any member instructor of a course “owns” the course and can perform any actions on it, including adding/removing other instructors and deleting the course
const ownsCourse = rule({
    cache: 'strict',
    fragment: 'fragment CourseId on Course { id }'
}) ((parent, args, context, info) => {
    console.log('SHIELD: OwnsCourse?');
    // ID to check could be parent object (from resolver), or `id` or similar argument from query
    let id = null;
    if (parent && parent.id) {
        id = parent.id;
    } else if (args) {
        id = args.id || args.courseId;
    }
    if (!id) { return false; }

    const userInfo = getUserInfo(context);

    return userInfo.isInstructor && context.db.exists.Course({
        id: id,
        instructors_some: { 
            id: userInfo.userId
        }
    });
});

const enrolledInCourse = rule({ cache: 'strict', fragment: 'fragment CourseId on Course { id }' })((parent, args, context, info) => {
    console.log('SHIELD: EnrolledInCourse?');
    // ID to check could be parent object (from resolver), or `id` or similar argument from query
    let id = null;
    if (parent && parent.id) {
        id = parent.id;
    } else if (args) {
        id = args.id || args.courseId;
    }
    if (!id) { return false; }

    const userInfo = getUserInfo(context);

    return (!userInfo.isInstructor) && context.db.exists.Course({
        id: id,
        students_some: { 
            id: userInfo.userId
        }
    });
});

const canAccessCourse = or(enrolledInCourse, ownsCourse);

const ownsQuiz = rule({
    cache: 'strict',
    fragment: 'fragment QuizId on Quiz { id }'
}) ((parent, args, context, info) => {
    console.log('SHIELD: ownsQuiz?', args);
    // ID to check could be parent object (from resolver), or `id` or similar argument from query
    let id = null;
    if (parent && parent.id) {
        id = parent.id;
    } else if (args) {
        id = args.id || args.quizId;
    }
    if (!id) { return false; }

    const userInfo = getUserInfo(context);

    return (userInfo.isInstructor && context.db.exists.Quiz({
        id: id,
        course: {
            instructors_some: { 
                id: userInfo.userId
            }
        }
    }));
});

const enrolledInQuiz = rule({
    cache: 'strict',
    fragment: 'fragment QuizId on Quiz { id }'
}) ((parent, args, context, info) => {
    console.log('SHIELD: enrolledInQuiz?');
    // Quiz to check could be parent object (from resolver), or `id` or `quizId` argument from query
    let id = null;
    if (parent && parent.id) {
        id = parent.id;
    } else if (args) {
        id = args.id || args.quizId;
    }
    if (!id) { return false; }

    const userInfo = getUserInfo(context);

    return (!userInfo.isInstructor) && context.db.exists.Quiz({
        id: id,
        course: {
            students_some: { 
                id: userInfo.userId
            }
        }
    });
});

const canAccessQuiz = or(enrolledInQuiz, ownsQuiz);

const ownsQuestion = rule({
    cache: 'strict',
    fragment: 'fragment QuestionId on Question { id }'
}) ((parent, args, context, info) => {
    console.log('SHIELD: ownsQuestion?');
    // Question to check could be parent object (from resolver), or `id` or `questionId` argument from query
    let id = null;
    if (parent && parent.id) {
        id = parent.id;
    } else if (args) {
        id = args.id || args.questionId;
    }
    if (!id) { return false; }

    const userInfo = getUserInfo(context);

    return (userInfo.isInstructor && context.db.exists.Course({
        quizzes_some: {
            questions_some: {
                id: id
            }
        },
        instructors_some: { 
            id: userInfo.userId
        }
    }));
});

const enrolledInQuestion = rule({
    cache: 'strict',
    fragment: 'fragment QuestionId on Question { id }'
}) ((parent, args, context, info) => {
    console.log('SHIELD: enrolledInQuestion?');
    // Question to check could be parent object (from resolver), or `id` or `questionId` argument from query
    let id = null;
    if (parent && parent.id) {
        id = parent.id;
    } else if (args) {
        id = args.id || args.questionId;
    }
    if (!id) { return false; }

    const userInfo = getUserInfo(context);

    return (!userInfo.isInstructor && context.db.exists.Course({
        quizzes_some: {
            questions_some: {
                id: id
            }
        },
        students_some: { 
            id: userInfo.userId
        }
    }));
});

const canAccessQuestion = or(enrolledInQuestion, ownsQuestion);

module.exports = {
    isStudent,
    isInstructor,
    isAuthenticated,

    ownsCourse,
    enrolledInCourse,
    canAccessCourse,

    ownsQuiz,
    enrolledInQuiz,
    canAccessQuiz,

    ownsQuestion,
    enrolledInQuestion,
    canAccessQuestion
};