import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';

import AuthCheck from './AuthCheck';

import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';

export class QuizEditor extends Component {
  state = {
  }

  /*addQuestion(quizId){
      console.log(quizId)
      this.props.addQuestionMutation({
          variables:{
              id:quizId
          }
      });
  }*/

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
        <AuthCheck location={this.props.location} />
        <div className="container">
          <h1 className="title is-inline-block">{quiz.title}</h1>
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
                    <span className="icon ">
                        <i className="fas fa-trash"></i>
                    </span>
                </a>
            </p>
            <div className="panel-block">
                <textarea className="textarea is-medium" type="text">{question.prompt}</textarea>
            </div>
            <p className="panel-block">
                concept selector
            </p>
            <form>
                <p className="panel-block" key={question.options[0].id}>
                <textarea className="textarea is-small" type="text">{question.options[0].text}</textarea>
                <input key = {question.options[0].id} name={"question"+index} value= "A" type="radio"/>
                </p>
                <p className="panel-block" key={question.options[1].id}>
                <textarea className="textarea is-small" type="text">{question.options[1].text}</textarea>
                <input key = {question.options[1].id} name={"question"+index} value= "B" type="radio"/>
                </p>
                <p className="panel-block" key={question.options[2].id}>
                <textarea className="textarea is-small" type="text">{question.options[2].text}</textarea>
                <input key = {question.options[2].id} name={"question"+index} value= "C" type="radio"/>
                </p>
                <p className="panel-block" key={question.options[3].id}>
                <textarea className="textarea is-small" type="text">{question.options[3].text}</textarea>
                <input key = {question.options[3].id} name={"question"+index} value= "D" type="radio"/>
                </p>
            </form>
            <p className="panel-block">
                So forth
            </p>
            </div>
        )}

            <div className="field is-grouped">
                <p className="control">
                    <a className="button is-danger">
                    Delete Quiz
                    </a>
                </p>
                <p className="control">
                    <a className="button">
                    Discard Changes
                    </a>
                </p>
                <p className="control">
                    <a className="button is-link">
                    Save Quiz
                    </a>
                </p>
                <p className="control">
                    
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
        questions{
            prompt
            options{
                text
                isCorrect
            }
        }
    }
  }
`

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
mutation addQuestionMutation(
    $id:ID!)
    {
        addQuestion(
            id:$id
        )
        questions{
            prompt
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
    graphql(ADD_QUESTION, {name: 'addQuestionMutation'})
 ) (QuizEditor)