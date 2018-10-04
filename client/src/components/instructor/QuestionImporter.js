import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';

import { QUIZ_TYPE_NAMES } from '../../constants';
import { withAuthCheck } from '../shared/AuthCheck';

import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';
import { stripTags } from '../../utils';

class QuestionImporter extends Component {
    constructor(props) {
        super(props);

        this.state = {
            questionIds: [],
            isSaving: false
        };
    }

    async _importQuestions() {
        this.setState({ isSaving: true });
        try {
            const quizId = this.props.match.params.quizId;
            // Send the mutation
            const result = await this.props.importQuestionsMutation({
                variables: {
                    quizId,
                    questionIds: this.state.questionIds
                }
            });
            // Handle errors
            if (result.errors && result.errors.length > 0) {
                throw result;
            }
            this.setState({ isSaving: false }, () => {
                // Redirect to quiz after successful save
                this.props.history.push('/instructor/quiz/' + quizId);
            });
        } catch (error) {
            alert('There was an error copying questions into this quiz. Please try again later, and contact us if the problem persists.');
        }
    }

    _selectQuiz(quizId, deselect = false) {
        let questionIds = [...this.state.questionIds];
        // Add or remove each question from this quiz
        let quiz = this.props.quizQuery.quiz.course.quizzes.find(q => q.id === quizId);
        quiz.questions.forEach(question => {
            if (!deselect) {
                questionIds.push(question.id);
            } else {
                questionIds = questionIds.filter(q => q !== question.id);
            }
        });
        // Remove duplicates
        questionIds = Array.from(new Set(questionIds));
        this.setState({ questionIds });
    }

    _selectQuestion(questionId, deselect = false) {
        let questionIds = [...this.state.questionIds];
        // Add or remove this question
        if (!deselect) {
            questionIds.push(questionId);
        } else {
            questionIds = questionIds.filter(q => q !== questionId);
        }
        // Remove duplicates
        questionIds = Array.from(new Set(questionIds));
        this.setState({ questionIds });
    }

    render() {

        if (this.state.isSaving || (this.props.quizQuery && this.props.quizQuery.loading)) {
            return <LoadingBox />;
        }

        if (this.props.quizQuery && this.props.quizQuery.error) {
            return <ErrorBox><p>Couldn’t load questions. Please try again later.</p></ErrorBox>;
        }

        const quiz = this.props.quizQuery.quiz;
        const course = quiz.course;
        const selectedIds = this.state.questionIds;
        // Exclude the destination quiz and empty quizzes from the source list
        const quizzes = course.quizzes.filter(q => (q.id !== quiz.id) && (q.questions.length > 0));

        let quizzesList;
        // If there are no other non-empty quizzes, alert the instructor
        if (quizzes.length === 0) {
            quizzesList = (<p className="notification is-light">Nothing to see here! There are no other non-empty quizzes in this course to import questions from.</p>);
        } else {
            // Otherwise show a list of quizzes and their questions
            quizzesList = quizzes.map(quiz => (
                <table key={quiz.id} className="table is-striped is-fullwidth">
                    <thead>
                        <tr className="sticky-header">
                            <th style={{textAlign: "center"}}>
                                <button className="button is-small" style={{marginBottom: "0.2rem", width: "100%"}}
                                    onClick={() => this._selectQuiz(quiz.id)}>
                                    All
                                </button>
                                <button className="button is-small" style={{width: "100%"}}
                                    onClick={() => this._selectQuiz(quiz.id, true)}>
                                    None
                                </button>
                            </th>
                            <th style={{width: "99%", verticalAlign: "middle"}}>
                                {quiz.title} ({QUIZ_TYPE_NAMES[quiz.type]})
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {quiz.questions.map(question => {
                            const selected = selectedIds.indexOf(question.id) > -1;

                            return (
                            <tr key={question.id}>
                                <td>
                                    <button className={"button" + (selected ? " is-link" : "")}
                                        onClick={() => this._selectQuestion(question.id, selected)}>
                                        {selected ? "✓" : <i>&nbsp;&nbsp;</i>}
                                        {/*selected ? <span className="icon"><i className="fas fa-check"></i></span> : <span className="icon"></span>*/}
                                    </button>
                                </td>
                                <td>
                                    {stripTags(question.prompt)}
                                </td>
                            </tr>
                            )
                        })}
                    </tbody>
                </table>
            ));
        }

        return (
            <section className="section">
              <div className="container">

                <nav className="breadcrumb" aria-label="breadcrumbs">
                    <ul>
                        <li><Link to="/instructor/courses">Course List</Link></li>
                        <li><Link to={"/instructor/course/" + quiz.course.id}>{quiz.course.title}</Link></li>
                        <li><Link to={"/instructor/quiz/" + quiz.id} aria-current="page">{quiz.title}</Link></li>
                        <li className="is-active"><Link to={"/instructor/quiz/" + quiz.id + "/import-questions"} aria-current="page">Import Questions</Link></li>
                    </ul>
                </nav>

                <h4 className="title is-4">Select questions from other quizzes in this course to copy to “{quiz.title}”</h4>

                {quizzesList}

                <br /> <br />
                <div style={{position: "fixed", bottom: 0, backgroundColor: "white", padding: "1rem", zIndex: 20, width: "100%", borderTop: "solid #f3f3f3 1px"}}>
                    <div className="field is-grouped">
                        <p className="control">
                            <Link className="button" to={"/instructor/quiz/" + quiz.id}>Cancel</Link>
                        </p>
                        <p className="control">
                            <button
                                className="button is-primary"
                                disabled={selectedIds.length === 0}
                                onClick={() => this._importQuestions()}>
                                Import {selectedIds.length || ""} Question{selectedIds.length !== 1 && "s"}
                            </button>
                        </p>
                    </div>
                </div>

              </div>
            </section>
        );
    }
}

// Get all questions in all quizzes in the course that this quiz belongs to
const QUIZ_QUERY = gql`
  query quizQuery($id: ID!) {
    quiz(id:$id){
        id
        title
        course {
            id
            title
            quizzes {
                id
                title
                type
                questions {
                    id
                    prompt
                    concept
                }
            }
        }
    }
  }
`

const IMPORT_QUESTIONS = gql`
mutation importQuestionsMutation(
    $quizId: ID!
    $questionIds: [ID!]!
){
    importQuestions(
        quizId: $quizId
        questionIds: $questionIds
    ){
        id
    }
}`

export default withAuthCheck(compose(
    graphql(QUIZ_QUERY, {
        name: 'quizQuery',
        options: (props) => {
            return { variables: { id: props.match.params.quizId } }
        }
    }),
    graphql(IMPORT_QUESTIONS, {name: 'importQuestionsMutation'}),
) (QuestionImporter), { instructor: true });
