import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';

import AuthCheck from './AuthCheck';

import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';

export class QuizEditor extends Component {
    constructor(props) {
        super(props);
    
        this.state = {
          quiz:null,
          quizTitle:'',
          questions:[]
        };
    
        // Pre-bind this function, to make adding it to input fields easier
        this.updateQuiz = this.updateQuiz.bind(this);
        this.addQuestion = this.addQuestion.bind(this);
        this.deleteQuestion = this.deleteQuestion.bind(this);
      }

    addQuestion(){
      console.log(this.props.match.params.quizId)
      this.props.addQuestionMutation({
          variables:{
              id:this.props.match.params.quizId
          }
      });
      window.location.reload(true);
    }

    updateQuiz(quiz){
        console.log(quiz);
        var i = 0;
        this.props.quizSaveMutation({
            variables:{
                id:quiz.id,
                //title:document.getElementById("quizTitle").value
                title:document.getElementById(quiz.id).value
            }
        })
        for(i;i<quiz.questions.length;i++){
            console.log(document.getElementById(quiz.questions[i].id).value);
            this.props.questionSaveMutation({
                variables:{
                    id:quiz.questions[i].id,
                    prompt:document.getElementById(quiz.questions[i].id).value
                }
            });
            var j=0;
            console.log(quiz.questions[i].id);
            for(j;j<quiz.questions[i].options.length;j++){
                this.props.optionSaveMutation({
                    variables:{
                        id:quiz.questions[i].options[j].id,
                        text:document.getElementById(quiz.questions[i].options[j].id+"text").value,
                        isCorrect:document.getElementById(quiz.questions[i].options[j].id+"radio").checked
                    }
                })
            }
        }
        window.location.reload(true);
    }

    deleteQuestion(question){
        console.log(question.id);
        this.props.questionDeleteMutation({
            variables:{
                id:question.id
            }
        });
        window.location.reload(true);
    }

    deleteQuiz(quiz){
        console.log(quiz);
        this.props.quizDeleteMutation({
            variables:{
                id:quiz.id
            }
        });
        window.location.href = "javascript:history.back()";
        
    }

    editQuizTitle(){
        var title = document.getElementById('quizTitle');
        title.type = "input";
        title.value = "TEST";
    }

    checkConcepts(quiz, question){
        var inQuiz = false;
        var input = document.getElementById("concept"+question.id).value;
        for(var i = 0; i < quiz.concepts.length; i++){
            if(input == quiz.concepts[i]){
                inQuiz = true;
            }
        }
        if(!inQuiz){

        }
    }

    conceptFilter(quiz, question){
        var search = document.getElementById("concept"+question.id).value;
        console.log(search);
    }

    saveConcept(question){
        this.props.conceptQuestion({
            variables:{
                id:question.id,
                title:document.getElementById("concept"+question.id).value
            }
        })
        //window.location.reload(true);
    }

  render() {

    if (this.props.quizQuery && this.props.quizQuery.loading) {
        return <LoadingBox />;
    }

    if (this.props.quizQuery && this.props.quizQuery.error) {
        return <ErrorBox>Couldn't load courses</ErrorBox>;
    }
    console.log(this.props);
    let quiz = this.props.quizQuery.quiz;

    return (
        <section className="section">
        <AuthCheck instructor location={this.props.location} />
        <div className="container">
        <textarea id = {quiz.id} key = {quiz.id} className="textarea is-large" type="text">{quiz.title}</textarea>
            <a className="button" >
                <span className="icon is-small">
                <i className="fas fa-edit"></i>
                </span>
            </a>
        {quiz.questions.map((question,index)=>
        <div className="panel" key={question.id}>
            <p className="panel-heading">
                Question {index+1}
                <a className="is-pulled-right button is-small">
                    <span className="icon " onClick={this.deleteQuestion.bind(null,(question))}>
                        <i className="fas fa-trash"></i>
                    </span>
                </a>
            </p>
            <div className="panel-block">
                <textarea id = {question.id} key = {question.id} className="textarea is-medium" type="text">{question.prompt}</textarea>
            </div>
            <p className="panel-block">
                <input type="text" id={"concept"+question.id} placeholder="concept" onChange = {() => this.conceptFilter(quiz, question)}></input>
                <button onClick = {() => this.saveConcept(question)}>+</button>
            </p>
            <form>
                <p className="panel-block" key={question.options[0].id}>
                <textarea id = {question.options[0].id+"text"} key = {question.options[0].id+"text"} className="textarea is-small" type="text">{question.options[0].text}</textarea>
                <input id = {question.options[0].id+"radio"} key = {question.options[0].id+"radio"} defaultChecked={question.options[0].isCorrect} name={"question"+index} value= "A" type="radio"/>
                </p>
                <p className="panel-block" key={question.options[1].id}>
                <textarea id = {question.options[1].id+"text"} key = {question.options[1].id+"text"} className="textarea is-small" type="text">{question.options[1].text}</textarea>
                <input id = {question.options[1].id+"radio"} key = {question.options[1].id+"radio"} defaultChecked={question.options[1].isCorrect} name={"question"+index} value= "B" type="radio"/>
                </p>
                <p className="panel-block" key={question.options[2].id}>
                <textarea id = {question.options[2].id+"text"} key = {question.options[2].id+"text"} className="textarea is-small" type="text">{question.options[2].text}</textarea>
                <input id = {question.options[2].id+"radio"} key = {question.options[2].id+"radio"} defaultChecked={question.options[2].isCorrect} name={"question"+index} value= "C" type="radio"/>
                </p>
                <p className="panel-block" key={question.options[3].id}>
                <textarea id = {question.options[3].id+"text"} key = {question.options[3].id+"text"} className="textarea is-small" type="text">{question.options[3].text}</textarea>
                <input id = {question.options[3].id+"radio"} key = {question.options[3].id+"radio"} defaultChecked={question.options[3].isCorrect} name={"question"+index} value= "D" type="radio"/>
                </p>
            </form>
            <p className="panel-block">
                So forth
            </p>
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
                    <button className="button is-link" onClick={this.updateQuiz.bind(null, quiz)}>Save Quiz</button>
                </p>
                <p className="control">
                    <button onClick={this.addQuestion}>Add Question</button>
                </p>
            </div>
        </div>
      </section>
    )
  }

}

export const CONCEPT_QUERY = gql`
  query conceptQuery($id:ID!) {
      concept(id:$id){
          title
          id
      }
  }`

//all courses for user of id
//TODO change from hardcoded userId
export const QUIZ_QUERY = gql`
  query quizQuery($id: ID!) {
    quiz(id:$id){
        id
        title
        concepts{
            title
        }
        course{
            title
            concepts{
                title
            }
            id
        }
        questions{
            concept{
                title
            }
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

export const QUIZ_SAVE = gql`
    mutation quizSaveMutation(
        $id:ID!
        $title:String!
    ){
        updateQuiz(
            id:$id
            title:$title
        ){
            id
            title
        }
    }`

export const QUESTION_SAVE = gql`
mutation questionSaveMutation(
    $id:ID!
    $prompt:String!
){
    updateQuestion(
        id:$id
        prompt:$prompt
    ){
        id
        prompt
    }
}`

export const OPTION_SAVE = gql`
mutation optionSaveMutation(
    $id:ID!
    $isCorrect:Boolean!
    $text:String!){
        updateOption(
            id:$id
            isCorrect:$isCorrect
            text:$text
        ){
            id
            isCorrect
            text
        }
    }`

export const CONCEPT_QUESTION = gql`
mutation conceptQuestion(
    $id:ID!
    $title:String!){
        conceptQuestion(
            id:$id
            title:$title
        ){
            id
            concept{
                title
            }
            prompt
        }
    }`

export const CONCEPT_QUIZ = gql`
mutation conceptQuiz{
        conceptQuiz(
            id:$id
            title:$title
        ){
            id
            concept{
                title
            }
            prompt
        }
    }`


export const CONCEPT_COURSE = gql`
mutation conceptCourse{
        conceptQuiz(
            id:$id
            title:$title
        ){
            id
            concept{
                title
            }
            prompt
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

export default compose(
    graphql(QUIZ_QUERY, {name: 'quizQuery',
  options: (props) => {
    console.log(props.match.params.quizId);
    return { variables: { id:props.match.params.quizId } }
  }
}),
    //graphql(CONCEPT_QUERY, {name: 'conceptQuery'}),
    graphql(QUESTION_SAVE, {name: 'questionSaveMutation'}),
    graphql(OPTION_SAVE, {name: 'optionSaveMutation'}),
    graphql(ADD_QUESTION, {name: 'addQuestionMutation'}),
    graphql(QUESTION_DELETE, {name: 'questionDeleteMutation'}),
    graphql(QUIZ_SAVE, {name: 'quizSaveMutation'}),
    graphql(QUIZ_DELETE, {name:'quizDeleteMutation'}),
    graphql(CONCEPT_QUESTION, {name: 'conceptQuestion'}),
    graphql(CONCEPT_QUIZ, {name: 'conceptQuiz'}),
    graphql(CONCEPT_COURSE, {name:'conceptCourse'})
 ) (QuizEditor)