import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ApolloConsumer, graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';
// https://reactjs.org/docs/update.html
import update from 'immutability-helper';
import ScrollIntoViewIfNeeded from 'react-scroll-into-view-if-needed';

import { ALPHABET } from '../../constants';
import ErrorBox from '../shared/ErrorBox';
import ConceptSelector from './ConceptSelector';

// TinyMCE imports and config
import tinymce from 'tinymce/tinymce';
import 'tinymce/themes/modern/theme';
import 'tinymce/plugins/autoresize';
import 'tinymce/plugins/charmap';
import 'tinymce/plugins/hr';
import 'tinymce/plugins/image';
import 'tinymce/plugins/link';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/textcolor';
import { Editor } from '@tinymce/tinymce-react';
import { stripTags } from '../../utils';

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

export class CollapsibleQuestionEditor extends Component {
    constructor(props) {
        super(props);
        this.state = {
            isLoading: false,
            isDeleting: false,
            isExpanded: false,
            error: null,
            question: null,
        };

        // Pre-bind functions
        this._loadQuestion = this._loadQuestion.bind(this);
        this._deleteQuestion = this._deleteQuestion.bind(this);
        this._saveQuestion = this._saveQuestion.bind(this);
        this._discardChanges = this._discardChanges.bind(this);
    }
    
    componentDidMount() {
        // If starting expanded, call the query immediately
        if (this.props.defaultExpanded) {
            this._loadQuestion();
        }
    }
    
    async _loadQuestion() {
        // Don’t reload question if already expanded
        if (this.state.isExpanded) { return; }
        console.log('loading question');
        try {
            this.setState({ isLoading: true });
            const result = await this.props.client.query({
                query: QUESTION_QUERY,
                variables: { id: this.props.questionId }
            });
            console.log('load result', result);
            this.setState({ isLoading: false, question: result.data.question, isExpanded: true });
        } catch (error) {
            console.error(error);
            this.setState({ error: 'Error loading question: ' + error });
        }
    }

    async _deleteQuestion() {
        if (!window.confirm('Are you sure you want to delete this question? All students’ attempts for this question will also be deleted.')) { return; }
        this.setState({ isDeleting: true, isExpanded: false });
        try {
            const result = await this.props.deleteQuestionMutation({
                variables:{
                    id: this.props.questionId
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
        // Ensure there are at least 2 non-empty options
        let optionCount = 0;
        let correctOptionEmpty = false;
        question.options.forEach(option => {
            const { text, isCorrect } = option;
            const isEmpty = text === null || text.trim() === '';
            if (!isEmpty) { optionCount++; }
            // Ensure that the correct option is non-empty
            if (isCorrect && isEmpty) { correctOptionEmpty = true; }
        });
        if (correctOptionEmpty) {
            return 'The correct option must not be be blank';
        }
        if (optionCount < 2) {
            return 'The quetion must have 2 or more non-blank options';
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
            prompt: question.prompt,
            concept: question.concept,
            options: { update: [] }
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
            await this.props.updateQuestionMutation({
                variables:{
                    id: this.props.questionId,
                    data: updatedQuestion
                }
            });
            // Collapse editor
            this.setState({ isLoading: false, isExpanded: false });
        } catch (error) {
            alert('There was an error saving this question. Please copy the question to a document and try again later.');
            this.setState({ isLoading: false });
        }
    }

    _discardChanges() {
        this.setState({ question:null, isExpanded: false });
    }

    _handlePromptChange(newPrompt) {
        let question = update(this.state.question, { $merge: { prompt: newPrompt } });
        this.setState({ question });
    }
    
    _handleConceptChange(newConcept) {
        let question = update(this.state.question, { $merge: { concept: newConcept } });
        this.setState({ question });
    }

    _handleOptionChange(optionIndex, newOption) {
        let question = update(this.state.question, { options: { [optionIndex]: { $merge: { text: newOption } } } } );
        this.setState({ question });
    }

    _handleCorrectOptionChange(optionIndex, checked) {
        console.log(optionIndex, checked);
        // Set previously-correct option as not correct
        const previousCorrectIndex = this.state.question.options.findIndex(o => o.isCorrect === true);
        let question = update(this.state.question, { options: {
            [previousCorrectIndex]: { $merge: { isCorrect: false } },
            [optionIndex]: { $merge: { isCorrect: true } },
        } } );
        this.setState({ question });
    }

    render() {
        const { isExpanded, isLoading, isDeleting, question, error } = this.state;

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
            <button className={"button is-link" + (isLoading ? " is-loading" : "")} onClick={this._saveQuestion}>
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

        const deleteButton = (
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

        const conceptSelector = isExpanded && (
            <div className="panel-block quiz-editor-question-concept">
                <label>
                    <span className="is-inline">Concept &nbsp; &nbsp;</span>
                </label>
                <ConceptSelector concept={question.concept} onChange={(c) => this._handleConceptChange(c)} courseId={this.props.courseId} />
            </div>
        );

        const optionsEditor = isExpanded && (
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
                {conceptSelector}
                {optionsEditor}
            </div>
        );

    }
}
    
CollapsibleQuestionEditor.propTypes = {
    elementId: PropTypes.string,
    // courseId is needed for getting concept suggestions from the course
    courseId: PropTypes.string,
    questionId: PropTypes.string.isRequired,
    questionIndex: PropTypes.number,
    defaultPrompt: PropTypes.string,
    defaultExpanded: PropTypes.bool,
    dragHandleProps: PropTypes.object,
    onDelete: PropTypes.func
};

const QUESTION_QUERY = gql`
query questionQuery($id: ID!) {
    question(id:$id){
        concept
        id
        prompt
        options{
            id
            text
            isCorrect
        }
    }
}
`

export const UPDATE_QUESTION = gql`
mutation updateQuestionMutation($id: ID!, $data: QuestionUpdateInput!) {
    updateQuestion(id: $id, data: $data) {
        id
    }
}`

export const DELETE_QUESTION = gql`
mutation deleteQuestionMutation($id: ID!) {
    deleteQuestion(id: $id){
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
    graphql(UPDATE_QUESTION, {name: 'updateQuestionMutation'}),
    graphql(DELETE_QUESTION, {name: 'deleteQuestionMutation'}),
    ) (WithApolloClient)