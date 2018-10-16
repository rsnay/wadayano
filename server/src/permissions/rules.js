const { rule, and, or, not } = require('graphql-shield');
const { getUserInfo } = require('../utils');

const isStudent = rule()(async (parent, args, context, info) => {
    console.log('SHIELD: IsStudent?');
    const userInfo = getUserInfo(context);
    return (userInfo.userId !== null) && !userInfo.isInstructor;
});

const isInstructor = rule()(async (parent, args, context, info) => {
    console.log('SHIELD: IsInstructor?');
    const userInfo = getUserInfo(context);
    return (userInfo.userId !== null) && userInfo.isInstructor;
});

const isAuthenticated = or(isStudent, isInstructor);

const ownsCourse = rule({ cache: 'strict', fragment: 'fragment CourseId on Course { id }' })((parent, args, context, info) => {
    // TODO: integrate fragment replacement middleware so that ID will always be in parent
    if (!parent.id) { return false; }
    const userInfo = getUserInfo(context);
    console.log('SHIELD: OwnsCourse?');

    return userInfo.isInstructor && context.db.exists.Course({
        id: parent.id,
        instructors_some: { 
            id: userInfo.userId
        }
    });
});

const enrolledInCourse = rule({ cache: 'strict', fragment: 'fragment CourseId on Course { id }' })((parent, args, context, info) => {
    // TODO: integrate fragment replacement middleware so that ID will always be in parent
    if (!parent.id) { return false; }
    const userInfo = getUserInfo(context);
    console.log('SHIELD: EnrolledInCourse?');

    return (!userInfo.isInstructor) && context.db.exists.Course({
        id: parent.id,
        students_some: { 
            id: userInfo.userId
        }
    });
});

const canAccessCourse = or(enrolledInCourse, ownsCourse);

const canAccessQuiz = rule({ cache: 'strict', fragment: 'fragment QuizId on Quiz { id }' })((parent, args, context, info) => {
    // TODO actual implementation
    console.log('SHIELD: CanAccessQuiz?');
    return true;
    // TODO: integrate fragment replacement middleware so that ID will always be in parent
    if (!parent.id) { return false; }
    const userInfo = getUserInfo(context);

    return (!userInfo.isInstructor) && context.db.exists.Course({
        id: parent.id,
        students_some: { 
            id: userInfo.userId
        }
    });
});

module.exports = {
    isStudent,
    isInstructor,
    isAuthenticated,
    ownsCourse,
    enrolledInCourse,
    canAccessCourse,
    canAccessQuiz
};