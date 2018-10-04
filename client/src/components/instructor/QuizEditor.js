import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';
// https://reactjs.org/docs/update.html
import update from 'immutability-helper';

import { withAuthCheck } from '../shared/AuthCheck';
import { reorder } from '../../utils';
import { QUIZ_TYPE_NAMES } from '../../constants';

import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';
import ButterToast, { ToastTemplate } from '../shared/Toast';

import CollapsibleQuestionEditor from './CollapsibleQuestionEditor';
import Modal from '../shared/Modal';

export class QuizEditor extends Component {
    constructor(props) {
        super(props);
    
        this.state = {
            isLoading: true,
            isSaving: false,
            isAddingQuestion: false,
            showQuizInfoModal: false,
            // Questions are stored in state once query loads, so that they can be reordered in the future (otherwise, query just loads into read-only prop).
            questions: new Map(),
            orderedQuestionIds: [],
            // Store a special flag for questions added during the editing session to auto-expand them
            autoExpandQuestionIds: [],
        };
    
        // Pre-bind these functions, to make adding it to input fields easier
        this.saveQuiz = this.saveQuiz.bind(this);
        this.addQuestion = this.addQuestion.bind(this);
        this.onQuestionListSortEnd = this.onQuestionListSortEnd.bind(this);
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
            this.setState({ isLoading: false, questions, orderedQuestionIds });
        }
    }

    async saveQuiz(quiz, refetch = true){
        // Collect data to update in the quiz
        let quizData = {
            title: document.getElementById(quiz.id).value,
            type: Array.from(document.getElementsByName('quizType')).find(r => r.checked).value,
        };
        this.setState({ isSaving: true });

        try {
            // Send the mutation
            const result = await this.props.saveQuizMutation({
                variables:{
                    id: quiz.id,
                    data: quizData
                }
            });
            if (result.errors && result.errors.length > 0) {
                throw result;
            }
            ButterToast.raise({
                content: <ToastTemplate content="Quiz info saved." className="is-success" />
            });
        } catch (error) {
            ButterToast.raise({
                content: <ToastTemplate content="Error saving quiz info." className="is-danger" />
            });
        }
        this.setState({ isSaving: false, showQuizInfoModal: false });

        // Reload quiz data after it's done
        if (refetch) {
            this.props.quizQuery.refetch();
        }
    }

    async deleteQuiz(quiz){
        if (!window.confirm('Are you sure you want to delete this quiz? All students’ attempts for this quiz will also be deleted.')) { return; }
        this.setState({ isLoading: true });
        try {
            const result = await this.props.quizDeleteMutation({
                variables:{
                    id: quiz.id
                }
            });
            if (result.errors && result.errors.length > 0) {
                throw result;
            }
            // Redirect to course details after successful deletion
            this.props.history.push('/instructor/course/' + quiz.course.id);
            ButterToast.raise({
                content: <ToastTemplate content="Quiz was deleted." className="is-success" />
            });
        } catch (error) {
            this.setState({ isLoading: false });
            ButterToast.raise({
                content: <ToastTemplate content="Error deleting quiz." className="is-danger" />
            });
        }
    }

    async addQuestion() {
        if (this.state.isAddingQuestion) { return; }
        this.setState({ isAddingQuestion: true });
        let result;
        try {
            // Send new question mutation
            result = await this.props.addQuestionMutation({
                variables:{
                    id: this.props.match.params.quizId
                }
            });
            if (result.errors && result.errors.length > 0) {
                throw result;
            }
        } catch (error) {
            ButterToast.raise({
                content: <ToastTemplate content="Error adding question." className="is-danger" />
            });
            this.setState({ isAddingQuestion: false });
            return;
        }

        const newQuestionId = result.data.addQuestion.questions[result.data.addQuestion.questions.length - 1].id;

        // Manually add new (empty) question to question Map and ordered ID array
        // See immutability-helper syntax for adding to Map (array of [key, value] arrays)
        const questions = update(this.state.questions, {
            $add: [[newQuestionId, { id: newQuestionId, prompt: '' }]]
        });
        const orderedQuestionIds = update(this.state.orderedQuestionIds, {
            $push: [newQuestionId]
        });

        // Auto-expand new questions. Store a separate flag for them
        const autoExpandQuestionIds = update(this.state.autoExpandQuestionIds, {
            $push: [newQuestionId]
        });

        this.setState({
            isAddingQuestion: false,
            questions,
            autoExpandQuestionIds,
            orderedQuestionIds
         });

        // Scroll to new question after render and question load have hopefully finished
        window.setTimeout(() => this.scrollToQuestionId(newQuestionId), 100);
        window.setTimeout(() => this.scrollToQuestionId(newQuestionId), 400);
        return false;
    }

    // Scroll to a particular question, taking into account the sticky question navbar
    scrollToQuestionId(questionId) {
        // Scroll to question
        document.getElementById('container' + questionId).scrollIntoView(true);
        // Scroll up to account for sticky question navbar, if not at bottom of page already
        // https://stackoverflow.com/a/44422472/702643
        if ((window.innerHeight + Math.ceil(window.pageYOffset)) < document.body.offsetHeight) {
            const headerHeight = document.getElementById('question-navbar').offsetHeight;
            window.scrollTo(0, window.scrollY - headerHeight);
        }
    }

    // Called when a question is reordered
    onQuestionListSortEnd(result) {
        // Dropped outside the list
        if (!result.destination) {
          return;
        }
    
        const orderedQuestionIds = reorder(
          this.state.orderedQuestionIds,
          result.source.index,
          result.destination.index
        );
    
        this.setState({
          orderedQuestionIds,
        });

        alert('Saving the question order is not yet implemented.');
    }

    // Called after a question is deleted (the delete mutation was already sent; we just need to remove from display)
    onQuestionDelete(questionId) {
        // This transition isn’t super great. Consider https://reactcommunity.org/react-transition-group/
        document.getElementById('container' + questionId).classList.add('fade-opacity');
        // After fade animation finishes, remove this question from the list of ordered question IDs, and it won’t be displayed
        window.setTimeout(() => {
            const index = this.state.orderedQuestionIds.indexOf(questionId);
            if (index >= 0) {
                const orderedQuestionIds = update(this.state.orderedQuestionIds, { $splice: [[index, 1]] });
                this.setState({ orderedQuestionIds });
            }
        }, 300);
    }


  render() {

    if (this.state.isLoading) {
        return <LoadingBox />;
    }

    if (this.props.quizQuery && this.props.quizQuery.error) {
        return <ErrorBox><p>Couldn’t load quiz.</p></ErrorBox>;
    }

    const questionNavbar = (
        <div id="question-navbar" className="question-navbar no-select">
            <span className="has-text-dark is-inline-block" style={{marginTop: "0.4rem"}}>Jump to Question:</span>
            {this.state.orderedQuestionIds.map((questionId, index) => (
                <button key={questionId} onClick={() => this.scrollToQuestionId(questionId)} className="question-navbar-item button is-text">{index + 1}</button>
            ))}
            <button className={"button is-text question-navbar-item"+ (this.state.isAddingQuestion ? " is-loading" : "")} title="Add Question" onClick={this.addQuestion}>
                <span className="icon"><i className="fas fa-plus"></i></span>
            </button>
            <div id="editor-toolbar"></div>
        </div>
    );

    const questionList = this.state.orderedQuestionIds.map((questionId, index) => (
        <CollapsibleQuestionEditor
            key={questionId}
            courseId={this.props.quizQuery.quiz.course.id}
            elementId={"container" + questionId}
            questionId={questionId}
            questionIndex={index}
            defaultPrompt={this.state.questions.get(questionId).prompt}
            defaultExpanded={(this.state.autoExpandQuestionIds.indexOf(questionId) > -1)}
            onDelete={() => this.onQuestionDelete(questionId)} />
    ));

    const newQuestionButton = (
        <div className="panel collapsible-question-editor no-select">
            <p className="panel-heading is-flex">
                <i style={{paddingLeft: "1rem"}}>New Question</i>
                <span className="is-pulled-right is-flex collapsible-question-editor-button-group">
                    <button className={"button" + (this.state.isAddingQuestion ? " is-loading" : "")} onClick={this.addQuestion}>
                        <span className="icon"><i className="fas fa-plus"></i></span>
                        <span>Add Question</span>
                    </button>
                </span>
            </p>
        </div>
    );

    let quiz = this.props.quizQuery.quiz;

    const quizInfoModal = (
        <Modal
            modalState={this.state.showQuizInfoModal}
            closeModal={() => this.setState({ showQuizInfoModal: false})}
            title="Edit Quiz Info">
            <form>
                <label className="label is-medium">
                    Quiz Title<br />
                    <input className="input" type="text" placeholder="e.g. Lipids Review" defaultValue={quiz.title} id={quiz.id} style={{maxWidth: "42rem"}} />
                </label>

                <label className="label is-medium">
                    Quiz Type<br />
                </label>
                <div className="control">
                    <label className="radio">
                        <input type="radio" name="quizType" value="GRADED" defaultChecked={quiz.type === "GRADED"} />
                        Graded quiz (must be launched from LMS)
                    </label>
                    <br />
                    <label className="radio">
                        <input type="radio" name="quizType" value="PRACTICE" defaultChecked={quiz.type === "PRACTICE"} />
                        Practice quiz (students can launch from wadayano dashboard or LMS)
                    </label>
                </div>
                <hr />

                <div className="field is-grouped">
                    <p className="control buttons">
                        <button className="button" type="button" onClick={() => this.setState({ showQuizInfoModal: false})}>
                            Cancel
                        </button>
                        <button className="button is-danger" type="button" onClick={() => this.deleteQuiz(quiz)}>
                            Delete Quiz
                        </button>
                        <button className={"button is-primary"+ (this.state.isSaving ? " is-loading" : "")} type="submit" disabled={this.state.isSaving} onClick={() => this.saveQuiz(quiz, true)}>
                            Save Changes
                        </button>
                    </p>
                </div>
            </form>
        </Modal>
    );

    return (
        <section className="section">
        <div className="container">
        <nav className="breadcrumb" aria-label="breadcrumbs">
            <ul>
                <li><Link to="/instructor/courses">Course List</Link></li>
                <li><Link to={"/instructor/course/" + quiz.course.id}>{quiz.course.title}</Link></li>
                <li className="is-active"><Link to={"/instructor/quiz/" + quiz.id} aria-current="page">{quiz.title}</Link></li>
            </ul>
        </nav>

        <section>
            <div className="is-flex-tablet">
                <div style={{flex: 1}}>
                    <h3 className="title is-3">{quiz.title}</h3>
                    <h4 className="subtitle is-4">{QUIZ_TYPE_NAMES[quiz.type]} Quiz</h4>
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
            <h4 className="title is-4" style={{flex: 1}}>Questions</h4>
            <Link to={"/instructor/quiz/" + quiz.id + "/import-questions"} className="button is-light" style={{marginBottom: "1rem"}}>
                <span className="icon">
                    <i className="fas fa-file-import"></i>
                </span>
                <span>Import From Other Quizzes</span>
            </Link>
        </div>

        {(quiz.quizAttempts.length > 0) &&
            <div className="notification is-warning">
            <p>Students have taken this quiz. Changing quiz questions may invalidate data and lead to inconsistencies and/or errors. Please <Link to="/feedback">contact us</Link> if you need assistance.</p>
            </div>
        }

        {this.state.orderedQuestionIds.length > 0 && questionNavbar}
        <br />

        {questionList}
        {newQuestionButton}

        {quizInfoModal}

        </div>
      </section>
    )
  }

}

// Get the quiz
export const QUIZ_QUERY = gql`
  query quizQuery($id: ID!) {
    quiz(id:$id){
        id
        title
        type
        course{
            title
            quizzes {
                questions {
                    concept
                }
            }
            id
        }
        questions{
            id
            prompt
        }
        quizAttempts {
            id
        }
    }
  }
`

export const QUIZ_SAVE = gql`
mutation quizSaveMutation(
    $id: ID!
    $data: QuizUpdateInput!
){
    updateQuiz(
        id: $id
        data: $data
    ){
        id
    }
}`

export const QUIZ_DELETE = gql`
mutation quizDeleteMutation($id:ID!) {
    deleteQuiz(id:$id){
        id
    }
}`

export const ADD_QUESTION = gql`
mutation addQuestionMutation($id:ID!)
    {
        addQuestion(
            id:$id
        ){
            questions { id }
        }
    }`

export default withAuthCheck(compose(
    graphql(QUIZ_QUERY, {name: 'quizQuery',
        options: (props) => {
            console.log(props.match.params.quizId);
            return { variables: { id:props.match.params.quizId } }
        }
    }),
    graphql(QUIZ_SAVE, {name: 'saveQuizMutation'}),
    graphql(QUIZ_DELETE, {name:'quizDeleteMutation'}),
    graphql(ADD_QUESTION, {name: 'addQuestionMutation'}),
) (QuizEditor), { instructor: true });
