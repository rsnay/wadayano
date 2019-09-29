import React, { Suspense, lazy } from 'react';
import '../styles/App.css';
import '../styles/Instructor.css';
import '../styles/Student.css';
import '../styles/BulmaConfig.css';

import { Switch, Route } from 'react-router-dom';
import Header from './shared/Header';
import Footer from './shared/Footer';

import Welcome from './shared/Welcome';
import Login from './instructor/Login';
import ResetPassword from './instructor/ResetPassword';
import FeedbackForm from './shared/FeedbackForm';
import LoadingBox from './shared/LoadingBox';

import CourseList from './instructor/CourseList';
import CourseDetails from './instructor/CourseDetails';
import QuizScores from './instructor/QuizScores';
import SurveyEditor from './instructor/SurveyEditor';
import SurveyResults from './instructor/SurveyResults';
import ProfileEditor from './instructor/ProfileEditor';
import Help from './instructor/Help';

import LTILaunch from './student/LTILaunch';
import CourseConsentForm from './student/CourseConsentForm';
import DashboardList from './student/DashboardList';
import Dashboard from './student/Dashboard';
import QuizTaker from './student/QuizTaker';
import SurveyTaker from './student/SurveyTaker';
import QuizReviewPage from './student/QuizReviewPage';

import TermsOfUse from './shared/TermsOfUse';
import PrivacyPolicy from './shared/PrivacyPolicy';
import About from './shared/About';
import PageNotFound from './shared/PageNotFound';
import QuestionImporter from './instructor/QuestionImporter';
import withGraphQLTracking from './AppTracker';

// Load QuizEditor separately, since it has large dependencies not needed for the rest of the app
const QuizEditor = lazy(() => import('./instructor/QuizEditor'));

const App = () => (
  <Suspense fallback={<LoadingBox />}>
    <div className="app-content">
      <Header />
      <Switch>
        <Route exact path="/" component={Welcome} />
        <Route exact path="/login" component={Login} />
        <Route exact path="/signup" component={Login} />
        <Route path="/reset-password/:token" component={ResetPassword} />
        <Route exact path="/feedback" component={FeedbackForm} />

        <Route exact path="/instructor" component={CourseList} />
        <Route exact path="/instructor/courses" component={CourseList} />
        <Route path="/instructor/course/:courseId" component={CourseDetails} />
        <Route path="/instructor/quiz/:quizId/import-questions" component={QuestionImporter} />
        <Route path="/instructor/quiz/:quizId/scores" component={QuizScores} />
        <Route path="/instructor/quiz/:quizId" component={QuizEditor} />
        <Route path="/instructor/survey/edit/:courseId" component={SurveyEditor} />
        <Route path="/instructor/survey/results/:courseId" component={SurveyResults} />
        <Route exact path="/instructor/profile" component={ProfileEditor} />
        <Route exact path="/instructor/help" component={Help} />

        {/* When a student launches, the server will redirect to either /student/launch or /student/consent,
            both of which will redirect to the desired content */}
        {/* Allow flexibility in redirecting to another route when launching via LTI.
            The route `/student/launch/fakeToken/quiz/id1` would redirect to `/student/quiz/id1` */}
        <Route path="/student/launch/:token/:action/:parameter1" component={LTILaunch} />
        {/* Presents the consent form and redirects to the given action/param as does LTILaunch.
            This is a separate route/component, as regular LTILaunch may not have the course ID */}
        <Route
          path="/student/consent/:courseId/:token/:action/:parameter1"
          component={CourseConsentForm}
        />
        {/* Allow a student to review or change their consent */}
        <Route path="/student/consent/:courseId" component={CourseConsentForm} />

        <Route exact path="/student" component={DashboardList} />
        <Route exact path="/student/dashboard" component={DashboardList} />
        <Route exact path="/student/dashboard/:courseId" component={Dashboard} />
        <Route path="/student/quiz/review/:quizAttemptId" component={QuizReviewPage} />
        <Route path="/student/quiz/:quizId" component={QuizTaker} />
        <Route path="/student/survey/:courseId" component={SurveyTaker} />

        <Route exact path="/terms" component={TermsOfUse} />
        <Route exact path="/privacy" component={PrivacyPolicy} />
        <Route exact path="/about" component={About} />
        <Route component={PageNotFound} />
      </Switch>
    </div>
    <Footer />
  </Suspense>
);

// Set up react-tracking, with a custom dispatch function
export default withGraphQLTracking(App);
