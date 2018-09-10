import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ApolloConsumer, graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';

export class CollapsibleQuestionEditor extends Component {
    constructor(props) {
        super(props);
        this.state = {
            isLoading: false,
            isExpanded: props.defaultExpanded,
            error: null,
            question: null,
            
        };
    }
    
    componentDidMount() {
        // If starting expanded, call the query immediately
        if (this.state.isExpanded) {
            this._loadQuestion();
        }
        console.log(this.props.client);
    }
    
    async _loadQuestion() {
        try {
            this.setState({ isLoading: true, isExpanded: true });
            const result = await this.props.client.query({
                query: QUESTION_QUERY,
                variables: { id: this.props.questionId }
            });
            this.setState({ isLoading: false, question: result.data.question });
        } catch (error) {
            console.error(error);
            this.setState({ error: 'Error loading question: ' + error });
        }
    }
    
    render() {
        if (!this.state.isExpanded) {
            return (
                <div>
                    {this.props.defaultPrompt}
                    <button className="button" onClick={() => this._loadQuestion()}>Edit</button>
                </div>
            );
        }

        return (
            <div>
                {this.props.defaultPrompt}
                <button className="button" onClick={() => this._loadQuestion()}>Save</button>
            </div>
        );

    }
}
    
CollapsibleQuestionEditor.propTypes = {
    questionId: PropTypes.string.isRequired,
    defaultPrompt: PropTypes.string,
    defaultExpanded: PropTypes.bool
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

export const ADD_COURSE = gql`
mutation addCourseMutation($title:String!)
{
    addCourse(
        title:$title
        ){
            id
        }
    }`
    
export const QUESTION_DELETE = gql`
mutation questionDeleteMutation($id:ID!) {
    deleteQuestion(id:$id){
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
        graphql(ADD_COURSE, {name: 'addCourseMutation'}),
        graphql(QUESTION_DELETE, {name: 'questionDeleteMutation'}),
        ) (WithApolloClient)