import React, { Component } from 'react';
import '../styles/App.css';
import '../styles/Student.css';
import '../styles/BulmaConfig.css';

import Header from './shared/Header';
import { Switch, Route } from 'react-router-dom';

import Welcome from './shared/Welcome';
import Login from './instructor/Login';

import CourseList from './instructor/CourseList';
import CourseDetails from './instructor/CourseDetails';
import QuizEditor from './instructor/QuizEditor';

import LTILaunch from './student/LTILaunch';
import Dashboard from './student/Dashboard';
import QuizTaker from './student/QuizTaker';

import PageNotFound from './shared/PageNotFound';

class App extends Component {
  render() {
    return (
      <div className="App">
        <Header />
        <Switch>
          <Route exact path="/" component={Welcome} />
          <Route exact path="/login" component={Login} />
          <Route exact path="/signup" component={Login} />

          <Route exact path="/instructor" component={CourseList} />
          <Route exact path="/instructor/courses" component={CourseList} />
          <Route path="/instructor/course/:courseId" component={CourseDetails} />
          <Route path="/instructor/quiz/:quizId" component={QuizEditor} />

          {/* Allow flexibility in redirecting to another route when launching via LTI. Route /student/launch/fakeToken/quiz/id1 would redirect to /student/quiz/id1 */}
          <Route path="/student/launch/:token/:action/:parameter1" component={LTILaunch} />
          <Route exact path="/student" component={Dashboard} />
          <Route exact path="/student/dashboard/:courseId" component={Dashboard} />
          <Route path="/student/quiz/:quizId" component={QuizTaker} />

          <Route component={PageNotFound} />

        </Switch>
      </div>
    );
  }
}

export default App;
