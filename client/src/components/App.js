import React, { Component } from 'react';
import '../styles/App.css';
import '../styles/BulmaConfig.css';

import Header from './shared/Header';
import { Switch, Route } from 'react-router-dom';

import Welcome from './shared/Welcome';
import Login from './instructor/Login';

import CourseList from './instructor/CourseList';
import CourseDetails from './instructor/CourseDetails';
import QuizEditor from './instructor/QuizEditor';

import Dashboard from './student/Dashboard';
import QuizTaker from './student/QuizTaker';

class App extends Component {
  render() {
    return (
      <div className="App">
        <Header />
        <Switch>
          <Route exact path="/" component={Welcome} />
          <Route exact path="/login" component={Login} />

          <Route exact path="/instructor" component={CourseList} />
          <Route exact path="/instructor/courses" component={CourseList} />
          <Route path="/instructor/course/:courseId" component={CourseDetails} />
          <Route path="/instructor/quiz/:quizId" component={QuizEditor} />

          <Route exact path="/student" component={Dashboard} />
          <Route path="/student/quiz/:quizId" component={QuizTaker} />

        </Switch>
      </div>
    );
  }
}

export default App;
