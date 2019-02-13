import React, { Component } from 'react';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';

import { formatScore, predictedScore, wadayanoScore, stringCompare } from '../../utils';

export default function withCourseScores(ComposedComponent) {
    class WithCourseScores extends React.Component {
        constructor() {
            super();
            this.state = { courseScores: null };
        }

        componentWillReceiveProps(nextProps) {
            // Workaround for no callback after apollo query finishes loading.
            if (nextProps.courseQuery && !nextProps.courseQuery.loading && !nextProps.courseQuery.error) {
    
                // Prepare data for the sortable table
                const course = nextProps.courseQuery.course;
                // Use Array.from to shallow-copy, since source prop is read-only
                // const students = Array.from(course.students);

                let courseScores = new Map();
    
                course.quizzes.forEach(quiz => {
                    // Get first completed quiz attempt for each student, and calculate wadayano and predicted score
                    let studentScores = new Map();
                    quiz.quizAttempts.forEach(attempt => {
                        if (attempt.completed) {
                            const studentId = attempt.student.id;
                            // Save score and wadayano score for this student if not already in the Map
                            if (studentScores.get(studentId) === undefined) {
                                studentScores.set(studentId, {
                                    score: attempt.score,
                                    predictedScore: predictedScore(attempt),
                                    wadayanoScore: wadayanoScore(attempt)
                                });
                            }
                        }
                    });
    
                    // Calculate average scores
                    let averageScore = 0;
                    let averagePredictedScore = 0;
                    let averageWadayanoScore = 0;
    
                    const studentCount = studentScores.size;
                    if (studentCount > 0) {
                        studentScores.forEach(({ score, predictedScore, wadayanoScore }) => {
                            averageScore += score;
                            averagePredictedScore += predictedScore;
                            averageWadayanoScore += wadayanoScore;
                        });
                        averageScore /= studentCount;
                        averagePredictedScore /= studentCount;
                        averageWadayanoScore /= studentCount;
                    }
    
                    courseScores.set(quiz.id, {
                        id: quiz.id,
                        title: quiz.title,
                        type: quiz.type,
                        studentCount,
                        averageScore,
                        averagePredictedScore,
                        averageWadayanoScore
                    });
                });
    
                // Sort by title by default
                // aggregatedQuizScores.sort(sortFunctions['title']);
    
                this.setState({ courseScores });
            }
        }

        componentDidMount() {
            // this would fetch or connect to a store
            this.setState({ name: "Michael" });
        }

        render() {
            return <ComposedComponent {...this.props} courseScores={this.state.courseScores} />;
        }
    };

    // Get course details and quiz attempts
    const COURSE_QUERY = gql`
    query courseQuery($id:ID!) {
        course(
            id:$id
        ){
            id
            title
            quizzes{
                id
                title
                type
                questions{
                    id
                }
                quizAttempts(where:{completed_not:null}) {
                    id
                    student {
                        id
                    }
                    completed
                    score
                    questionAttempts {
                        id
                        isCorrect
                        isConfident
                    }
                    conceptConfidences {
                        id
                        confidence
                    }
                }
            }
        }
    }
    `

    WithCourseScores.displayName = `WithCourseScores(${ComposedComponent.displayName || ComposedComponent.name || 'Component'}`;
    return graphql(COURSE_QUERY, {
        name: 'courseQuery',
        options: (props) => {
            return { variables: { id:props.match.params.courseId } }
        }
    })(WithCourseScores);
}