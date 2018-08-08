import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';

import { withAuthCheck } from '../shared/AuthCheck';

import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';

export class QuizEditor extends Component {
    constructor(props) {
        super(props);
    
        this.state = {
          quiz:null,
          quizTitle:'',
          quizType: null,
          questions:[],
          concepts:[]
        };
    
        // Pre-bind this function, to make adding it to input fields easier
        this.updateQuiz = this.updateQuiz.bind(this);
        this.addQuestion = this.addQuestion.bind(this);
        this.deleteQuestion = this.deleteQuestion.bind(this);
        this.updateQuiz = this.updateQuiz.bind(this);
        this.saveConcept = this.saveConcept.bind(this);
        this.setConcept = this.setConcept.bind(this);
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
        for(var i=0;i<quiz.questions.length;i++){
            if(document.getElementById(("concept"+quiz.questions[i].id)).value===null || document.getElementById(("concept"+quiz.questions[i].id)).value.replace(/\s/g,'')===""){
                alert("Please enter info into required fields");
                return;
            }
        }
        console.log(quiz);
        this.props.quizSaveMutation({
            variables:{
                id:quiz.id,
                //title:document.getElementById("quizTitle").value
                title:document.getElementById(quiz.id).value,
                type:document.getElementById("quizTypeSelector").value
            }
        })
        for(i=0;i<quiz.questions.length;i++){
            console.log(document.getElementById(quiz.questions[i].id).value);
            this.props.questionSaveMutation({
                variables:{
                    id:quiz.questions[i].id,
                    //concept:document.getElementById("concept"+quiz.questions[i].id).value,
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
            console.log(i);
            this.saveConcept(quiz.questions[i]);
        }
        var concepts = [];
        for(var i = 0; i < quiz.questions.length; i++){
            var newConcept = true;
            for(var j = 0; j< concepts.length; j++){
                if(quiz.questions[i].concept === concepts[j]){
                    newConcept = false;
                }
            }
            if(newConcept){
                concepts.push(document.getElementById("concept"+quiz.questions[i].id).value);
            }
        }
        console.log(concepts);
        this.props.conceptQuiz({
            variables:{
                id:quiz.id,
                concepts:concepts
            }
        })
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

    async deleteQuiz(quiz){
        console.log(quiz);
        if (!window.confirm('Are you sure you want to delete this quiz? All students’ attempts for this quiz will also be deleted.')) { return; }
        await this.props.quizDeleteMutation({
            variables:{
                id:quiz.id
            }
        });
        window.history.back();
    }

    editQuizTitle(){
        var title = document.getElementById('quizTitle');
        title.type = "input";
        title.value = "TEST";
    }

    checkConcepts(quiz, question){
        var suggestions = [];
        var input = document.getElementById("concept"+question.id).value;
        for(var i = 0; i < quiz.concepts.length; i++){
            if(quiz.concepts[i].includes(input)){
                suggestions.push(quiz.concepts[i]);
            }
        }
        return suggestions;
    }

    conceptFilter(quiz, question){
        var search = document.getElementById("concept"+question.id).value;
        console.log(search);
        var strs = [];
        var courseConcepts = quiz.concepts;
        for(var i=0; i < courseConcepts.length; i++){
            if(courseConcepts[i].includes(document.getElementById("concept"+question.id).value)){
                strs.push(courseConcepts[i]);
            }
        }
        console.log(quiz.concepts);
        console.log(strs);
        this.setState({concepts: strs, showConceptsForQuestion:question.id})
    }

    setConcept(questionId, str){
        var e = document.getElementById("concept"+questionId);
        this.setState({showConceptsForQuestion:null})
        e.value = str;
    }

    saveConcept(question){
        console.log("question"+question);
        console.log("id"+question.id);
        console.log("con"+document.getElementById("concept"+question.id).value);
        this.props.conceptQuestion({
            variables:{
                id:question.id,
                concept:document.getElementById("concept"+question.id).value
            }
        })
    }

  render() {

    if (this.props.quizQuery && this.props.quizQuery.loading) {
        return <LoadingBox />;
    }

    if (this.props.quizQuery && this.props.quizQuery.error) {
        return <ErrorBox>Couldn’t load quiz</ErrorBox>;
    }
    console.log(this.props);
    let quiz = this.props.quizQuery.quiz;

    return (
        <section className="section">
        <div className="container">
        <nav className="breadcrumb" aria-label="breadcrumbs">
            <ul>
                <li><Link to="/instructor">Course List</Link></li>
                <li><Link to={"/instructor/course/" + quiz.course.id}>{quiz.course.title}</Link></li>
                <li className="is-active"><Link to={"/instructor/quiz/" + quiz.id} aria-current="page">{quiz.title}</Link></li>
            </ul>
        </nav>
        
        <label className="label is-medium">
            Quiz Title<br />
            <input className="input" type="text" placeholder="e.g. Lipids Review" defaultValue={quiz.title} id={quiz.id} style={{maxWidth: "38rem"}} />
        </label>

        <label className="label is-medium">
            Quiz Type<br />
            <div className="select">
                <select id="quizTypeSelector" defaultValue={quiz.type}>
                    <option value="GRADED">Graded quiz (must be launched from LMS)</option>
                    <option value="PRACTICE">Practice quiz (students can launch from wadayano dashboard)</option>
                </select>
            </div>
        </label>

        <label className="label is-medium">Questions</label>

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
                <input type="text" defaultValue={question.concept} id={"concept"+question.id} placeholder="concept" onChange = {() => this.conceptFilter(quiz, question)}></input>
            </p>
            {(this.state.showConceptsForQuestion === question.id) &&
            <div id={"suggestions"+question.id}>
            {this.state.concepts.map(concept => (
                <p id= {concept} onClick={() => this.setConcept(question.id,concept)}>{concept}</p>
            ))}
            </div>}
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
                    <button className="button is-primary" onClick={this.addQuestion}>Add Question</button>
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
            concepts
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
        $type:QuizType!
    ){
        updateQuiz(
            id:$id
            title:$title
            type:$type
        ){
            id
            title
            type
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
    $concept:String!){
        conceptQuestion(
            id:$id
            concept:$concept
        ){
            id
            concept
            prompt
        }
    }`

export const CONCEPT_QUIZ = gql`
mutation conceptQuiz(
    $id:ID!
    $concepts:[String!]!){
        conceptQuiz(
            id:$id
            concepts:$concepts
        ){
            id
            concepts
        }
    }`


export const CONCEPT_COURSE = gql`
mutation conceptCourse{
        conceptQuiz(
            id:$id
            title:$title
        ){
            id
            concepts
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

export default withAuthCheck(compose(
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
) (QuizEditor), { instructor: true });
