import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';

import { withAuthCheck } from '../shared/AuthCheck';
import { ALPHABET } from '../../constants';

import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';

export class QuizEditor extends Component {
    constructor(props) {
        super(props);
    
        this.state = {
            isLoading: false,
            concepts: [],
            showConceptsForQuestion: null
        };
    
        // Pre-bind this function, to make adding it to input fields easier
        this.saveQuiz = this.saveQuiz.bind(this);
        this.addQuestion = this.addQuestion.bind(this);
        this.deleteQuestion = this.deleteQuestion.bind(this);
    }

    async saveQuiz(quiz){
        // Ensure that each question has a non-empty concept
        for(let i = 0; i < quiz.questions.length; i++){
            let concept = document.getElementById(('concept' + quiz.questions[i].id)).value;
            if (concept === null || concept.trim() === '') {
                alert(`Please enter a concept for each question. Question ${i + 1} is missing a concept.`);
                return;
            }
        }

        // Collect data to update in the quiz
        let quizData = {
            title: document.getElementById(quiz.id).value,
            type: document.getElementById('quizTypeSelector').value,
            // Updated questions will be added here
            questions: { update: [] },
            // Concepts will be added here (QuizUpdateconceptsInput requires a set sub-property)
            concepts: []
        };

        // Get updated fields of each question
        quiz.questions.forEach(question => {
            // Prisma-specific syntax for nested update mutation
            let updatedQuestion = {
                where: { id: question.id },
                data: {
                    prompt: document.getElementById(question.id).value,
                    concept: document.getElementById('concept' + question.id).value,
                    options: { update: [] }
                }
            };
            // Add concept to quiz concept list
            quizData.concepts.push(document.getElementById('concept' + question.id).value);
            // Get updated options for this question
            question.options.forEach(option => {
                let updatedOption = {
                    where: { id: option.id },
                    data: {
                        text: document.getElementById(option.id + 'text').value,
                        isCorrect: document.getElementById(option.id + 'radio').checked
                    }
                };
                // Add updated option to question mutation
                updatedQuestion.data.options.update.push(updatedOption);
            });
            // Add this updated question to main quiz mutation
            quizData.questions.update.push(updatedQuestion);
        });

        // Remove duplicate concepts (a Set can’t have duplicates, so it will return only unique concepts)
        quizData.concepts = Array.from(new Set(quizData.concepts));

        // Send the mutation
        await this.props.saveQuizMutation({
            variables:{
                id: quiz.id,
                data: quizData
            }
        });

        // Reload quiz data after it's done
        this.props.quizQuery.refetch();
    }

    async deleteQuiz(quiz){
        if (!window.confirm('Are you sure you want to delete this quiz? All students’ attempts for this quiz will also be deleted.')) { return; }
        this.setState({ isLoading: true });
        await this.props.quizDeleteMutation({
            variables:{
                id: quiz.id
            }
        });
        // Redirect to course details after successful deletion
        this.props.history.push('/instructor/course/' + quiz.course.id);
    }

    async addQuestion(){
        this.setState({ isLoading: true });
        await this.props.addQuestionMutation({
            variables:{
                id: this.props.match.params.quizId
            }
        });
        this.props.quizQuery.refetch();
        this.setState({ isLoading: false });
    }

    async deleteQuestion(question){
        if (!window.confirm('Are you sure you want to delete this question? All students’ attempts for this question will also be deleted.')) { return; }
        this.setState({ isLoading: true });
        await this.props.questionDeleteMutation({
            variables:{
                id: question.id
            }
        });
        this.props.quizQuery.refetch();
        this.setState({ isLoading: false });
    }

    conceptFilter(quiz, question){
        let allConcepts = [];
        // Combine concepts from all quizzes in the course
        quiz.course.quizzes.forEach(quiz => {
            allConcepts = allConcepts.concat(quiz.concepts);
        });
        console.log(quiz);
        // Add in concepts that have been added in the current editing session
        quiz.questions.forEach(q => {
            // Exclude current question
            if (q.id !== question.id) {
                allConcepts.push(document.getElementById('concept' + q.id).value);
            }
        });

        // Filter to current search term
        let searchTerm = document.getElementById("concept"+question.id).value.toLowerCase();
        let filteredConcepts = allConcepts.filter(concept => concept.toLowerCase().includes(searchTerm));

        // Remove duplicates
        filteredConcepts = Array.from(new Set(filteredConcepts));

        this.setState({concepts: filteredConcepts, showConceptsForQuestion: question.id})
    }

    setConcept(questionId, str){
        var e = document.getElementById("concept"+questionId);
        this.setState({showConceptsForQuestion:null})
        e.value = str;
    }

  render() {

    if (this.state.isLoading || (this.props.quizQuery && this.props.quizQuery.loading)) {
        return <LoadingBox />;
    }

    if (this.props.quizQuery && this.props.quizQuery.error) {
        return <ErrorBox><p>Couldn’t load quiz.</p></ErrorBox>;
    }
    console.log(this.props);
    let quiz = this.props.quizQuery.quiz;

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
        
        <label className="label is-medium">
            Quiz Title<br />
            <input className="input" type="text" placeholder="e.g. Lipids Review" defaultValue={quiz.title} id={quiz.id} style={{maxWidth: "42rem"}} />
        </label>

        <label className="label is-medium">
            Quiz Type<br />
            <div className="select">
                <select id="quizTypeSelector" defaultValue={quiz.type}>
                    <option value="GRADED">Graded quiz (must be launched from LMS)</option>
                    <option value="PRACTICE">Practice quiz (students can launch from wadayano dashboard or LMS)</option>
                </select>
            </div>
        </label>

        <label className="label is-medium">Questions</label>

        {quiz.questions.map((question, questionIndex)=>
        <div className="panel" key={question.id}>
            <p className="panel-heading">
                Question {questionIndex + 1}
                <a className="is-pulled-right button is-small">
                    <span className="icon " onClick={this.deleteQuestion.bind(null,(question))}>
                        <i className="fas fa-trash"></i>
                    </span>
                </a>
            </p>
            <div className="panel-block">
                <textarea
                    id={question.id}
                    className="textarea is-medium"
                    placeholder="Question Prompt"
                    defaultValue={question.prompt} />
            </div>
            <p className="panel-block">
                <label>
                    <span className="is-inline" style={{verticalAlign: "-webkit-baseline-middle"}}>Concept &nbsp; &nbsp;</span>
                    <input className="input is-inline" type="text" defaultValue={question.concept} id={"concept"+question.id} placeholder="concept" onFocus={() => this.conceptFilter(quiz, question)} onChange = {() => this.conceptFilter(quiz, question)}></input>
                </label>
                {(this.state.showConceptsForQuestion === question.id && this.state.concepts.length > 0) &&
                    <span id={"suggestions"+question.id}>
                    &nbsp; Suggestions: &nbsp;
                    {this.state.concepts.map(concept => (
                        <button id={concept} key={concept} className="concept-tag tag is-light" onClick={() => this.setConcept(question.id,concept)}>{concept}</button>
                    ))}
                    </span>
                }
            </p>
            <form>
                {question.options.map((option, optionIndex) =>
                    <p className="panel-block" key={option.id}>
                        <label className="radio">
                            <input
                                id={option.id + "radio"}
                                key={option.id + "radio"}
                                defaultChecked={option.isCorrect}
                                name={"question" + questionIndex}
                                placeholder="Option Text"
                                type="radio" />
                            {ALPHABET[optionIndex]}
                        </label>
                        <textarea
                            id={option.id + "text"}
                            className="textarea is-small"
                            style={{margin: "0 0 0 1rem", minWidth: "inherit"}}
                            rows="2"
                            defaultValue={option.text} />
                    </p>
                )}
            </form>
        </div>
        )}

            <div className="field is-grouped">
                <p className="control">
                    <button className="button is-danger" onClick={() => this.deleteQuiz(quiz)}>
                    Delete Quiz
                    </button>
                </p>
                <p className="control">
                    <button className="button" onClick={() => window.location.reload(true)}>
                    Discard Changes
                    </button>
                </p>
                <p className="control">
                    <button className="button is-link" onClick={this.saveQuiz.bind(null, quiz)}>Save Quiz</button>
                </p>
                <p className="control">
                    <button className="button is-primary" onClick={this.addQuestion}>Add Question</button>
                </p>
            </div>
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
        concepts
        type
        course{
            title
            quizzes {
                concepts
            }
            id
        }
        questions{
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

export const QUESTION_DELETE = gql`
    mutation questionDeleteMutation($id:ID!) {
        deleteQuestion(id:$id){
            id
        }
    }`

export const ADD_QUESTION = gql`
mutation addQuestionMutation($id:ID!)
    {
        addQuestion(
            id:$id
        ){
            title
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
    graphql(QUESTION_DELETE, {name: 'questionDeleteMutation'}),
) (QuizEditor), { instructor: true });
