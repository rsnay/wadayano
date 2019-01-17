import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Prompt } from 'react-router';
import { ApolloConsumer, graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';
// https://reactjs.org/docs/update.html
import update from 'immutability-helper';
import ScrollIntoViewIfNeeded from 'react-scroll-into-view-if-needed';

import { ALPHABET, QUESTION_TYPE_NAMES, DEFAULT_QUESTION_TYPE, MULTIPLE_CHOICE, SHORT_ANSWER } from '../../constants';
import ErrorBox from '../shared/ErrorBox';
import ConceptSelector from './ConceptSelector';

// TinyMCE imports and config
// tinymce import is required but never used by reference, so add eslint exception
/* eslint-disable no-unused-vars */
import tinymce from 'tinymce/tinymce';
import 'tinymce/themes/modern/theme';
import 'tinymce/plugins/autoresize';
import 'tinymce/plugins/charmap';
import 'tinymce/plugins/hr';
import 'tinymce/plugins/image';
import 'tinymce/plugins/link';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/textcolor';
/* eslint-enable no-unused-vars */
import { Editor } from '@tinymce/tinymce-react';
import { stripTags } from '../../utils';
import fragments from '../../fragments';

// Main editor configuration
const tinymceConfig = {
    skin_url: '/tinymce/lightgray',
    plugins: 'autoresize charmap hr image link lists textcolor',
    toolbar: 'undo redo | formatselect | fontsizeselect | bold italic underline | forecolor backcolor | align | bullist numlist | outdent indent | superscript subscript | removeformat | hr image link charmap',
    menubar: false,
    statusbar: false,
    branding: false,
    autoresize_max_height: 500
};

// Smaller toolbar on inline editor for options
const tinymceInlineConfig = {
    ...tinymceConfig,
    inline: true,
    toolbar: 'undo redo | bold italic underline | forecolor backcolor | align | outdent indent | superscript subscript | removeformat | image charmap',
};

const unsavedAlertMessage = 'You have unsaved questions in this quiz. Do you want to discard these changes?';

export class CollapsibleQuestionEditor extends Component {
    constructor(props) {
        super(props);
        this.state = {
            isLoading: false,
            isDeleting: false,
            isExpanded: false,
            isDirty: false,
            // Flag if the question hasn’t been saved to server and doesn’t have a permanant ID
            isNew: false,
            // If the question was new, but has since been saved, don’t rely from props.questionId
            wasNew: false,
            error: null,
            question: null,
        };

        // Pre-bind functions
        this._loadQuestion = this._loadQuestion.bind(this);
        this._deleteQuestion = this._deleteQuestion.bind(this);
        this._saveQuestion = this._saveQuestion.bind(this);
        this._discardChanges = this._discardChanges.bind(this);
        this._onBeforeUnload = this._onBeforeUnload.bind(this);
    }
    
    componentDidMount() {
        // Add beforeunload listener to alert user of unsaved changes
        window.addEventListener('beforeunload', this._onBeforeUnload);

        // If question is new and has a temporary ID, set the flag and autoexpand
        if (/^_new[0-9]*/.test(this.props.questionId)) {
            // Create fake question
            const question = {
                id: this.props.questionId,
                concept: '',
                prompt: '',
                type: DEFAULT_QUESTION_TYPE,
                options: [
                    {id: '_newOption1', text: '', isCorrect: false},
                    {id: '_newOption2', text: '', isCorrect: false},
                    {id: '_newOption3', text: '', isCorrect: false},
                    {id: '_newOption4', text: '', isCorrect: false},
                    {id: '_newOption5', text: '', isCorrect: false},
                    {id: '_newOption6', text: '', isCorrect: false},
                    {id: '_newOption7', text: '', isCorrect: false},
                    {id: '_newOption8', text: '', isCorrect: false}
                ],
                correctShortAnswers: []
            };
            this.setState({ isLoading: false, question, isExpanded: true, isNew: true });
        } else {
            // Otherwise, if starting expanded, call the query immediately
            if (this.props.defaultExpanded) {
                this._loadQuestion();
            }
        }
    }

    componentWillUnmount() {
        window.removeEventListener('beforeunload', this._onBeforeUnload);
    }

    _onBeforeUnload(e) {
        // Warn of any unsaved changes before navigating away
        if (this.state.isDirty) {
            e.returnValue = unsavedAlertMessage;
            return unsavedAlertMessage;
        }
    }
    
    async _loadQuestion() {
        // Don’t reload question if already expanded
        if (this.state.isExpanded) { return; }
        try {
            this.setState({ isLoading: true });
            const result = await this.props.client.query({
                query: QUESTION_QUERY,
                variables: { id: (this.state.wasNew ? this.state.question.id : this.props.questionId) }
            });
            if (!(result.data && result.data.question)) {
                throw Error('Question not found');
            }
            this.setState({ isLoading: false, question: result.data.question, isExpanded: true });
        } catch (error) {
            console.error(error);
            this.setState({ error: 'Error loading question: ' + error });
        }
    }

    async _deleteQuestion() {
        if (!window.confirm('Are you sure you want to delete this question? All students’ attempts for this question will also be deleted.')) { return; }
        this.setState({ isDeleting: true, isExpanded: false, isDirty: false });
        try {
            const result = await this.props.deleteQuestionMutation({
                variables:{
                    id: (this.state.wasNew ? this.state.question.id : this.props.questionId)
                }
            });
            if (result.errors && result.errors.length > 0) {
                throw result;
            }
            this.setState({ isDeleting: false });
            // Let the main editor know this question was deleted, so it can be hidden without having to reload entire quiz
            if (this.props.onDelete) {
                this.props.onDelete();
            }
        } catch (e) {
            let message = 'Please try again later.';
            if (e.errors && e.errors.length > 0) {
                message = e.errors[0].message;
            }
            this.setState({ error: 'There was an error deleting this question: ' + message, isDeleting: false });
        }
    }

    // Performs various checks on a given question (for before the quiz is saved)
    // Returns true if valid, or a message describing why it’s invalid
    _validateQuestion() {
        const { question } = this.state;
        // Ensure the question has a non-empty prompt
        if (question.prompt === null || question.prompt.trim() === '') {
            return 'Please enter a prompt for this question';
        }
        // Ensure the question has a non-empty concept
        let concept = question.concept;
        if (concept === null || concept.trim() === '') {
            return 'Please enter a concept for this question';
        }
        switch (question.type) {
            case MULTIPLE_CHOICE:
                // Ensure there are at least 2 non-empty options
                let optionCount = 0;
                let noCorrectOption = true;
                let correctOptionEmpty = false;
                question.options.forEach(option => {
                    const { text, isCorrect } = option;
                    const isEmpty = text === null || text.trim() === '';
                    if (!isEmpty) { optionCount++; }
                    if (isCorrect) { noCorrectOption = false; }
                    // Ensure that the correct option is non-empty
                    if (isCorrect && isEmpty) { correctOptionEmpty = true; }
                });
                if (optionCount < 2) {
                    return 'The question must have 2 or more non-blank options';
                }
                if (noCorrectOption) {
                    return 'There must be a correct option (choose with the radio button to the left of the option).';
                }
                if (correctOptionEmpty) {
                    return 'The correct option must not be be blank';
                }
                break;
            case SHORT_ANSWER:
                // Ensure there is at least 1 non-empty correct short answer
                const shortAnswers = question.correctShortAnswers.filter(answer => answer.trim() !== '');
                if (shortAnswers.length === 0) {
                    return 'There must be at least one non-blank correct short answer.';
                }
                break;
            default:
        }
        // Question is valid
        return true;
    }
    
    async _saveQuestion() {
        this.setState({ isLoading: true });
        const valid = this._validateQuestion();
        if (valid !== true) {
            alert(`Please correct this error: ${valid}`);
            this.setState({ isLoading: false });
            return;
        }
        const { question } = this.state;
        // Prisma-specific syntax for nested update mutation
        let updatedQuestion = {
            type: question.type,
            prompt: question.prompt,
            concept: question.concept,
            options: { update: [] },
            correctShortAnswers: { set: question.correctShortAnswers }
        };
        // Get updated options for this question
        question.options.forEach(option => {
            let updatedOption = {
                where: { id: option.id },
                data: {
                    text: option.text,
                    isCorrect: option.isCorrect
                }
            };
            // Add updated option to question mutation
            updatedQuestion.options.update.push(updatedOption);
        });
        try {
            if (this.state.isNew) {
                // If this is a new question, restructure the data
                let newQuestion = { ...updatedQuestion };
                // Create options with only text and isCorrect (not ID)
                newQuestion.options.create = newQuestion.options.update.map(o => { return { text: o.data.text, isCorrect: o.data.isCorrect } });
                // Remove updated options list
                delete newQuestion.options.update;
                // Send addQuestion mutation
                const result = await this.props.addQuestionMutation({
                    variables: {
                        quizId: this.props.quizId,
                        question: newQuestion
                    }
                });
                // Put the newly-added question (now with IDs) in the state
                // Collapse editor, and mark as not new
                this.setState({ question: result.data.addQuestion, isNew: false, wasNew: true, isLoading: false, isExpanded: false, isDirty: false });

                // Tell the quiz editor that this question is now saved in the database
                if (this.props.onNewSave) {
                    // Pass in the temp "_new0" ID, as well as the saved question, which will contain the actual ID from the database
                    this.props.onNewSave(this.props.questionId, result.data.addQuestion);
                }
            } else {
                // Otherwise update it
                await this.props.updateQuestionMutation({
                    variables:{
                        id: (this.state.wasNew ? this.state.question.id : this.props.questionId),
                        data: updatedQuestion
                    }
                });
                // Collapse editor
                this.setState({ isLoading: false, isExpanded: false, isDirty: false });
            }
        } catch (error) {
            console.log(error);
            alert('There was an error saving this question. Please copy the question to a document and try again later.');
            this.setState({ isLoading: false });
        }
    }

    _discardChanges() {
        // If it’s a new question, it hasn’t been saved to server, so ‘delete’ the question to remove it entirely
        if (this.state.isNew) {
            // If there is content in the prompt, confirm deletion
            if (this.state.question.prompt.trim() !== '') {
                if (!window.confirm('This question has never been saved, so any content will be lost. Remove this question?')) { return; }
            }
            // Remove the question
            this.setState({ isDeleting: true, isDirty: false });
            if (this.props.onDelete) {
                this.props.onDelete();
            }
        } else {
            this.setState({ question:null, isExpanded: false, isDirty: false });
        }
    }

    _handlePromptChange(newPrompt) {
        let question = update(this.state.question, { $merge: { prompt: newPrompt } });
        this.setState({ question, isDirty: true });
    }
    
    _handleConceptChange(newConcept) {
        let question = update(this.state.question, { $merge: { concept: newConcept } });
        this.setState({ question, isDirty: true });
    }

    _handleTypeChange(newType) {
        let question = update(this.state.question, { $merge: { type: newType } });
        this.setState({ question, isDirty: true });
    }

    _handleOptionChange(optionIndex, newOption) {
        let question = update(this.state.question, { options: { [optionIndex]: { $merge: { text: newOption } } } } );
        this.setState({ question, isDirty: true });
    }

    _handleCorrectOptionChange(optionIndex, checked) {
        const previousCorrectIndex = this.state.question.options.findIndex(o => o.isCorrect === true);

        // Update correct option
        let question = update(this.state.question, { options: {
            [optionIndex]: { $merge: { isCorrect: true } }
        } } );

        // Set previously-correct option as not correct, if there was one
        if (previousCorrectIndex > -1) {
            question = update(question, { options: {
                [previousCorrectIndex]: { $merge: { isCorrect: false } }
            } } );
        }

        this.setState({ question, isDirty: true });
    }

    _handleShortAnswerChange(index, newShortAnswer) {
        let question;
        // Remove empty short answer
        if (newShortAnswer === '') {
            question = update(this.state.question, { correctShortAnswers: { $splice: [[index, 1]] } } );
        } else {
            // Otherwise update it
            question = update(this.state.question, { correctShortAnswers: { [index]: { $set: newShortAnswer } } } );
        }
        this.setState({ question, isDirty: true });
    }

    render() {
        const { isExpanded, isLoading, isDeleting, isNew, question, error } = this.state;

        if (error || (isExpanded && !isLoading && !(question && question.id))) {
            return <ErrorBox><p>{error}</p></ErrorBox>;
        }

        // If this is part of a reorderable list, show a drag handle
        const dragHandle = this.props.dragHandleProps && (
            <span {...this.props.dragHandleProps} className="icon is-inline-block is-flex drag-handle">
                <i className="fas fa-grip-vertical"></i>
            </span>
        );

        const saveButton = isExpanded && (
            <button className={"button is-primary" + (isLoading ? " is-loading" : "")} onClick={this._saveQuestion}>
                <span>Save</span>
            </button>
        );

        const cancelButton = isExpanded && (
            <button className="button" onClick={this._discardChanges}>
                <span>Cancel</span>
            </button>
        );

        const editButton = !isExpanded && (
            <button className={"button" + (isLoading ? " is-loading" : "")} disabled={isDeleting} onClick={this._loadQuestion}>
                <span className="icon">
                    <i className="fas fa-edit"></i>
                </span>
                <span>Edit</span>
            </button>
        );

        const deleteButton = !isNew && (
            <button className={"button" + (isDeleting ? " is-loading" : "")} onClick={this._deleteQuestion} title="Delete Question">
                <span className="icon">
                    <i className="fas fa-trash-alt"></i>
                </span>
            </button>
        );

        const promptEditor = isExpanded && (
            <ScrollIntoViewIfNeeded className="panel-block quiz-editor-question-prompt">
                {question.prompt.trim() === "" && <span className="quiz-editor-question-prompt-placeholder">Question&nbsp;Prompt</span>}
                {/* Another element needed so react won’t reinsert placeholder after tinymce editor, since tinymce modifies dom and react can only do its best to adjust */}
                <span></span>
                <Editor value={question.prompt}
                    onEditorChange={(newPrompt) => this._handlePromptChange(newPrompt)}
                    init={tinymceConfig} />
            </ScrollIntoViewIfNeeded>
        );

        const metadatEditor = isExpanded && (
            <div className="panel-block quiz-editor-question-concept">
                <label className="is-inline">Concept &nbsp;</label>
                <ConceptSelector concept={question.concept} onChange={(c) => this._handleConceptChange(c)} courseId={this.props.courseId} />

                <select className="quiz-editor-question-type" value={question.type}
                    onChange={(e) => this._handleTypeChange(e.target.value)}>
                    <option value={MULTIPLE_CHOICE}>{QUESTION_TYPE_NAMES[MULTIPLE_CHOICE]}</option>
                    <option value={SHORT_ANSWER}>{QUESTION_TYPE_NAMES[SHORT_ANSWER]}</option>
                </select>
            </div>
        );

        const optionsEditor = (isExpanded && question.type === MULTIPLE_CHOICE) && (
            <form>
            {question.options.map((option, optionIndex) =>
                <div className="panel-block is-flex quiz-editor-question-option" key={option.id}>
                    <label className="radio is-flex">
                        <input
                            id={option.id + "radio"}
                            key={option.id + "radio"}
                            checked={option.isCorrect}
                            onChange={(e) => this._handleCorrectOptionChange(optionIndex, e.currentTarget.value)}
                            name={"question" + question.id}
                            disabled={option.text.trim() === ""}
                            type="radio" />
                        <span>{ALPHABET[optionIndex]}</span>
                    </label>
                    <span className="quiz-editor-question-option-tinymce-container">
                        {option.text.trim() === "" && <span className="quiz-editor-question-option-placeholder">(Leave option empty to hide on quiz)</span>}
                        <Editor
                            value={option.text}
                            onEditorChange={(newOption) => this._handleOptionChange(optionIndex, newOption)}
                            init={tinymceInlineConfig} />
                    </span>
                </div>
            )}
            </form>
        );

        // Always display an empty answer textbox at the end to easily add another
        // Add the empty to a copy of the correctShortAnswers array to not actually store in question
        let correctShortAnswers = question ? question.correctShortAnswers.slice() : [];
        correctShortAnswers.push('');
        const shortAnswersEditor = (isExpanded && question.type === SHORT_ANSWER) && (
            <div className="panel-block is-block quiz-editor-question-short-answers">
            Correct short answers (whitespace and case will be ignored when comparing with students’ responses)
                {correctShortAnswers.map((shortAnswer, index) =>
                    <input
                        value={shortAnswer}
                        key={index}
                        onChange={(e) => this._handleShortAnswerChange(index, e.target.value)}
                        placeholder="Add a correct answer"
                        className="input"
                        type="text"
                    />
                )}
            </div>
        );

        return (
            <div className="panel collapsible-question-editor" id={this.props.elementId}>
                <p className="panel-heading is-flex">
                    {dragHandle}

                    <span className="collapsible-question-editor-title" onClick={this._loadQuestion}>
                        {this.props.questionIndex !== null && `${this.props.questionIndex + 1}. `}
                        {!isExpanded && stripTags(question ? question.prompt : this.props.defaultPrompt)}
                    </span>

                    <span className="is-pulled-right is-flex collapsible-question-editor-button-group">
                        {deleteButton}
                        {editButton}
                        {cancelButton}
                        {saveButton}
                    </span>

                </p>

                {promptEditor}
                {metadatEditor}
                {optionsEditor}
                {shortAnswersEditor}

                {/* If the question has been modified, have react router confirm before user navigates away */}
                <Prompt
                    when={this.state.isDirty}
                    message={unsavedAlertMessage}
                />
            </div>
        );

    }
}
    
CollapsibleQuestionEditor.propTypes = {
    elementId: PropTypes.string,
    // courseId is needed for getting concept suggestions from the course
    courseId: PropTypes.string,
    // quizId is needed for adding the new question to the correct quiz
    quizId: PropTypes.string.isRequired,
    // questionId can be _new([0-9]*) for new questions that are added to quiz, but not saved yet
    questionId: PropTypes.string.isRequired,
    questionIndex: PropTypes.number,
    defaultPrompt: PropTypes.string,
    defaultExpanded: PropTypes.bool,
    dragHandleProps: PropTypes.object,
    onDelete: PropTypes.func,
    onNewSave: PropTypes.func
};

const QUESTION_QUERY = gql`
    query questionQuery($id: ID!) {
        question(id:$id) {
            ...InstructorFullQuestion
        }
    }
    ${fragments.instructorFullQuestion}
`;

export const ADD_QUESTION = gql`
    mutation addQuestionMutation($quizId: ID!, $question: QuestionCreateInput!) {
        addQuestion(quizId: $quizId, question: $question) {
            ...InstructorFullQuestion
        }
    }
    ${fragments.instructorFullQuestion}
`;

export const UPDATE_QUESTION = gql`
    mutation updateQuestionMutation($id: ID!, $data: QuestionUpdateInput!) {
        updateQuestion(id: $id, data: $data) {
            ...InstructorFullQuestion
        }
    }
    ${fragments.instructorFullQuestion}
`;

export const DELETE_QUESTION = gql`
mutation deleteQuestionMutation($id: ID!) {
    deleteQuestion(id: $id) {
        id
    }
}`

// Manually wrap in ApolloConsumer to get access to Apollo client to manually fire query
const WithApolloClient = (props) => (
    <ApolloConsumer>
    {client => <CollapsibleQuestionEditor client={client} {...props} />}
    </ApolloConsumer>
    );
    
export default compose(
    graphql(ADD_QUESTION, {name: 'addQuestionMutation'}),
    graphql(UPDATE_QUESTION, {name: 'updateQuestionMutation'}),
    graphql(DELETE_QUESTION, {name: 'deleteQuestionMutation'}),
    ) (WithApolloClient)