import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';
// https://reactjs.org/docs/update.html
import update from 'immutability-helper';

import compose from '../../compose';
import withAuthCheck from '../shared/AuthCheck';
import { QUIZ_TYPE_NAMES } from '../../constants';

import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';
import Modal from '../shared/Modal';
import Breadcrumbs from '../shared/Breadcrumbs';

import QuestionEditor from './QuestionEditor';
import QuizInfoForm from './QuizInfoForm';
import QuizJSONImportModal from './QuizJSONImportModal';
import LTISetupModal from './LTISetupModal';

import Title from '../shared/Title';

const MAX_NAVBAR_QUESTIONS = 20;

/**
 * The actual saving of changes to quiz questions or quiz info happens in the QuestionEditor and QuizInfoForm components, respectively.
 * This page component displays quiz info, and manages QuestionEditors corresponding to the questions in the quiz.
 */
export class QuizEditor extends Component {
    constructor(props) {
        super(props);
    
        this.state = {
            isLoading: true,
            isSaving: false,
            isAddingQuestion: false,
            showQuizInfoModal: false,
            showQuizJSONImportModal: false,
            // Questions are stored in state once query loads, so that they can be reordered in the future (otherwise, query just loads into read-only prop).
            questions: new Map(),
            // Contains actual questions plus new (unsaved) question IDs
            orderedQuestionIds: [],
            // Store a special flag for questions added during the editing session to auto-expand them
            autoExpandQuestionIds: [],
            // Each new question needs a temporary ID before it gets saved to server. Keep a simple count
            newQuestionCount: 0,
            newQuestionIds: []
        };
    
        // Pre-bind these functions, to make adding it to input fields easier
        this.addQuestion = this.addQuestion.bind(this);
        this.onNewQuestionSaved = this.onNewQuestionSaved.bind(this);
        this.onImportComplete = this.onImportComplete.bind(this);
    }

    componentWillReceiveProps(nextProps) {
        // Workaround for no callback after apollo query finishes loading.
        if (nextProps.quizQuery && !nextProps.quizQuery.loading && !nextProps.quizQuery.error) {
            // Update order of question IDs
            const quiz = nextProps.quizQuery.quiz;
            // Tweak structure so (future) drag-and-drop reorder is easier
            // Map of questions: key=questionId, value=question
            // Array of ordered question IDs that will be changed on reorder
            let questions = new Map();
            let orderedQuestionIds = [];
            quiz.questions.forEach(q => {
                questions.set(q.id, q);
                orderedQuestionIds.push(q.id);
            });
            // Add in unsaved questions (if any) to the questions map (not to orderedQuestionIds, since newQuestionIds are rendered following orderedQuestionIds)
            this.state.newQuestionIds.forEach(qId => {
               questions.set(qId, { id: qId, prompt: '' });
            });
            this.setState({ isLoading: false, questions, orderedQuestionIds });
        }
    }

    async addQuestion() {
        // Add a new question with a temporary ID
        const newQuestionId = '_new' + this.state.newQuestionCount++;

        // Manually add new (empty) question to question Map and ordered ID array
        const questions = update(this.state.questions, {
            $add: [[newQuestionId, { id: newQuestionId, prompt: '' }]]
        });

        // Store new, unsaved questions separately
        const newQuestionIds = update(this.state.newQuestionIds, {
            $push: [newQuestionId]
        });

        this.setState({
            isAddingQuestion: false,
            questions,
            newQuestionIds
         });

        // Scroll to new question after render has hopefully finished
        window.setTimeout(() => this.scrollToQuestionId(newQuestionId), 100);
        return false;
    }

    // Scroll to a particular question, taking into account the sticky question navbar
    scrollToQuestionId(questionId) {
        // Scroll to question
        let questionElement = document.getElementById('container' + questionId);
        if (questionElement === null) { return; }
        questionElement.scrollIntoView(true);

        // Scroll up to account for sticky question navbar, if not at bottom of page already
        // https://stackoverflow.com/a/44422472/702643
        if ((window.innerHeight + Math.ceil(window.pageYOffset)) < document.body.offsetHeight) {
            const headerHeight = document.getElementById('question-navbar').offsetHeight;
            window.scrollTo(0, window.scrollY - headerHeight);
        }
    }

    // Called after a question is deleted (the delete mutation was already sent; we just need to remove from display)
    onQuestionDelete(questionId) {
        // This transition isn’t super great. Consider https://reactcommunity.org/react-transition-group/
        document.getElementById('container' + questionId).classList.add('fade-opacity');
        // After fade animation finishes, remove this question from the list of ordered question IDs, and it won’t be displayed
        window.setTimeout(() => {
            let index = this.state.orderedQuestionIds.indexOf(questionId);
            if (index >= 0) {
                const orderedQuestionIds = update(this.state.orderedQuestionIds, { $splice: [[index, 1]] });
                this.setState({ orderedQuestionIds });
            } else {
                // It might have been a new question, which are stored separately
                index = this.state.newQuestionIds.indexOf(questionId);
                if (index >= 0) {
                    const newQuestionIds = update(this.state.newQuestionIds, { $splice: [[index, 1]] });
                    this.setState({ newQuestionIds });
                }
            }
        }, 300);
    }

    // Called after a new question is saved to the database for the first time. Switch from the "_new0" temp ID to actual ID
    onNewQuestionSaved(tempQuestionId, newQuestion) {
        // Remove temp new ID
        const tempIdIndex = this.state.newQuestionIds.indexOf(tempQuestionId);
        if (tempIdIndex >= 0) {
            const newQuestionIds = update(this.state.newQuestionIds, { $splice: [[tempIdIndex, 1]] });

            // Add actual ID, if not already in array
            const actualIdIndex = this.state.orderedQuestionIds.indexOf(newQuestion.id);
            if (actualIdIndex < 0) {
                const orderedQuestionIds = update(this.state.orderedQuestionIds, {
                    $push: [newQuestion.id]
                });
                // Add the newly-saved question to the questions Map
                const questions = update(this.state.questions, {
                    $add: [[newQuestion.id, newQuestion]]
                });
                this.setState({ newQuestionIds, orderedQuestionIds, questions });
            }
        }
    }

    // Called when the import question JSON modal is closed
    onImportComplete(refetch) {
        this.setState({ showQuizJSONImportModal: false, isLoading: refetch });
        // Reload quiz data after it’s done
        if (refetch) {
            this.props.quizQuery.refetch();
        }
    }

  render() {

    if (this.props.quizQuery && this.props.quizQuery.error) {
        return <ErrorBox><p>Couldn’t load quiz.</p></ErrorBox>;
    }

    if (this.state.isLoading) {
        return <LoadingBox />;
    }

    let allQuestions = this.state.orderedQuestionIds.concat(this.state.newQuestionIds);

    // Render up to 20 questions in navbar
    let divisor = 1;
    while (allQuestions.length / divisor > MAX_NAVBAR_QUESTIONS) {
        divisor++;
    }
    const questionNavbar = (
        <div id="question-navbar" className="question-navbar no-select">
            <span className="has-text-dark is-inline-block question-navbar-title">Jump to Question:</span>
            {/* Only render up to 20 questions by omitting non-factors of the divisor, but always include first and last questions */}
            {allQuestions.map((questionId, index) => {
                if ((index + 1) % divisor === 0 || index === 0 || index === allQuestions.length - 1) {
                    return (
                        <button
                            key={questionId}
                            onClick={() => this.scrollToQuestionId(questionId)}
                            className="question-navbar-item button is-text"
                        >
                            {index + 1}
                        </button>
                    );
                } else { return null; }
            })}
            <button
                className={"button is-text question-navbar-item"+ (this.state.isAddingQuestion ? " is-loading" : "")}
                title="Add Question"
                onClick={this.addQuestion}
            >
                <span className="icon"><i className="fas fa-plus"></i></span>
            </button>
        </div>
    );

    const questionList = allQuestions.map((questionId, index) => (
        <QuestionEditor
            key={questionId}
            courseId={this.props.quizQuery.quiz.course.id}
            quizId={this.props.quizQuery.quiz.id}
            elementId={"container" + questionId}
            questionId={questionId}
            questionIndex={index}
            defaultPrompt={this.state.questions.get(questionId).prompt}
            defaultExpanded={(this.state.autoExpandQuestionIds.indexOf(questionId) > -1)}
            onDelete={() => this.onQuestionDelete(questionId)}
            onNewSave={this.onNewQuestionSaved}
        />
    ));

    const newQuestionButton = (
        <div className="panel question-editor no-select" onClick={this.addQuestion}>
            <p className="panel-heading is-flex">
                <i style={{paddingLeft: "1rem"}}>New Question</i>
                <span className="is-pulled-right is-flex question-editor-button-group">
                    <button className={"button" + (this.state.isAddingQuestion ? " is-loading" : "")} onClick={this.addQuestion}>
                        <span className="icon"><i className="fas fa-plus"></i></span>
                        <span>Add Question</span>
                    </button>
                </span>
            </p>
        </div>
    );

    let quiz = this.props.quizQuery.quiz;

    // Show a section hinting instructor to add quiz to the LMS if there are > 0 saved questions
    const addToLMSSection = this.state.orderedQuestionIds.length > 0 && (
        <section>
            <h4 className="title is-4">Add Quiz to LMS</h4>
            <div className="is-flex-tablet">
                {quiz.type === 'GRADED' ?
                    <span className="flex-1">Students launch graded quizzes directly from the course LMS.<br /> To make this quiz available to students, create an LTI assignment or link for this quiz.<br /></span>
                  : 
                    <span className="flex-1">Students can launch all practice quizzes from their wadayano dashboard.<br /> You can also add a direct LTI link to this quiz.<br /></span>
                }
                <br/><span className="flex-1">When taking a quiz, students will see questions in a random order.<br/></span>
                <button style={{marginLeft: "1rem"}} className="button is-light"
                    onClick={() => this.setState({ displayLtiSetup: true })}>
                    <span className="icon">
                    <i className="fas fa-link"></i>
                    </span>
                    <span>Add Quiz to LMS</span>
                </button>
            </div>
            <LTISetupModal
                action={'quiz'}
                objectId={quiz.id}
                consumerKey={quiz.course.id}
                sharedSecret={quiz.course.ltiSecret}
                closeModal={() => this.setState({ displayLtiSetup: false })}
                modalState={this.state.displayLtiSetup}
            />
        </section>
    );

    const quizInfoModal = (
        <Modal
            modalState={this.state.showQuizInfoModal}
            closeModal={() => this.setState({ showQuizInfoModal: false})}
            title="Edit Quiz Info"
        >
            <QuizInfoForm
                quiz={quiz}
                onCancel={() => this.setState({ showQuizInfoModal: false })}
                onSave={() => {
                    this.setState({ showQuizInfoModal: false });
                    this.props.quizQuery.refetch();
                }}
            />
        </Modal>
    );

    return (
      <section className="section">
        <div className="container">
            <head>
                <Title title={`wadayano | ${quiz.title} Editor`}/>
            </head>

        <Breadcrumbs links={[
            { to: "/instructor/courses", title: "Course List" },
            { to: "/instructor/course/" + quiz.course.id, title: quiz.course.title },
            { to: "/instructor/quiz/" + quiz.id, title: quiz.title, active: true }
        ]} />

        <section>
            <div className="is-flex-tablet">
                <div style={{flex: 1}}>
                    <h1 className="title is-3">{quiz.title}</h1>
                    <h2 className="subtitle is-4">{QUIZ_TYPE_NAMES[quiz.type]} Quiz</h2>
                </div>
                <button className="button is-light" onClick={() => this.setState({ showQuizInfoModal: true})} style={{marginTop: "1rem"}}>
                    <span className="icon">
                        <i className="fas fa-edit"></i>
                    </span>
                    <span>Edit Quiz Info</span>
                </button>
            </div>
            <hr />
        </section>

        <div className="is-flex-tablet">
            <h2 className="title is-4" style={{flex: 1}}>Questions</h2>
            <Link to={"/instructor/quiz/" + quiz.id + "/import-questions"} className="button is-light" style={{marginBottom: "1rem"}}>
                <span className="icon">
                    <i className="fas fa-file-import"></i>
                </span>
                <span>Import From Other Quizzes</span>
            </Link>

            <button className="button is-light" style={{marginBottom: "1rem", marginLeft: "0.5rem"}} onClick={() => this.setState({ showQuizJSONImportModal: true })}>
                <span className="icon">
                    <i className="fas fa-code"></i>
                </span>
                <span>Import Question JSON</span>
            </button>
            {this.state.showQuizJSONImportModal && <QuizJSONImportModal quizId={quiz.id} onClose={this.onImportComplete} />}
        </div>

        {(quiz.quizAttempts.length > 0) &&
            <div className="notification is-warning">
            <p>Students have taken (or started taking) this quiz. Changing quiz questions will invalidate data and lead to inconsistencies and/or errors. Please <Link to="/feedback">contact us</Link> if you need assistance.</p>
            </div>
        }

        {allQuestions.length > 0 && questionNavbar}
        <br />

        {questionList}
        {newQuestionButton}

        {addToLMSSection}

        {quizInfoModal}

        </div>
      </section>
    );
  }

}

// Get the quiz
const QUIZ_QUERY = gql`
  query quizQuery($id: ID!) {
    quiz(id:$id) {
        id
        title
        type
        course {
            id
            title
            ltiSecret
        }
        questions {
            id
            prompt
        }
        quizAttempts {
            id
        }
    }
  }
`;

export default withAuthCheck(compose(
    graphql(QUIZ_QUERY, {name: 'quizQuery',
        options: (props) => {
            return { variables: { id: props.match.params.quizId } }
        }
    })
) (QuizEditor), { instructor: true });
