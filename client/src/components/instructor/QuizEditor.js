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
                title:quiz.title
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
          <h1 className="title is-inline-block" type="input" id="quizTitle">{quiz.title}</h1>
          &nbsp;&nbsp;
            <a className="button">
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
                concept selector
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
                    <a className="button">
                    Discard Changes
                    </a>
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

//all courses for user of id
//TODO change from hardcoded userId
export const QUIZ_QUERY = gql`
  query quizQuery($id: ID!) {
    quiz(id:$id){
        id
        title
        questions{
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
    graphql(QUESTION_SAVE, {name: 'questionSaveMutation'}),
    graphql(OPTION_SAVE, {name: 'optionSaveMutation'}),
    graphql(ADD_QUESTION, {name: 'addQuestionMutation'}),
    graphql(QUESTION_DELETE, {name: 'questionDeleteMutation'}),
    graphql(QUIZ_SAVE, {name: 'quizSaveMutation'}),
    graphql(QUIZ_DELETE, {name:'quizDeleteMutation'})
 ) (QuizEditor)