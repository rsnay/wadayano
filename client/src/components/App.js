import React, { Suspense, lazy } from 'react';
import '../styles/App.css';
import '../styles/Instructor.css';
import '../styles/Student.css';
import '../styles/BulmaConfig.css';

import { Switch, Route } from 'react-router-dom';
import AuthRoute from './shared/AuthRoute';
import Header from './shared/Header';
import Footer from './shared/Footer';

import Welcome from './shared/Welcome';
import Login from './instructor/Login';
import ResetPassword from './instructor/ResetPassword';
import FeedbackForm from './shared/FeedbackForm';
import Spinner from './shared/Spinner';

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
  <Suspense fallback={<Spinner />}>
    <div className="app-content">
      <Header />
      <Switch>
        <Route exact path="/">
          <Welcome />
        </Route>
        <Route exact path="/login">
          <Login />
        </Route>
        <Route exact path="/signup">
          <Login />
        </Route>
        <Route path="/reset-password/:token">
          <ResetPassword />
        </Route>
        <AuthRoute student instructor exact path="/feedback">
          <FeedbackForm />
        </AuthRoute>

        <AuthRoute instructor exact path="/instructor">
          <CourseList />
        </AuthRoute>
        <AuthRoute instructor exact path="/instructor/courses">
          <CourseList />
        </AuthRoute>
        <AuthRoute instructor path="/instructor/course/:courseId">
          <CourseDetails />
        </AuthRoute>
        <AuthRoute instructor path="/instructor/quiz/:quizId/import">
          <QuestionImporter />
        </AuthRoute>
        <AuthRoute instructor path="/instructor/quiz/:quizId/scores">
          <QuizScores />
        </AuthRoute>
        <AuthRoute instructor path="/instructor/quiz/:quizId">
          <QuizEditor />
        </AuthRoute>
        <AuthRoute instructor path="/instructor/survey/edit/:courseId">
          <SurveyEditor />
        </AuthRoute>
        <AuthRoute instructor path="/instructor/survey/results/:courseId">
          <SurveyResults />
        </AuthRoute>
        <AuthRoute instructor exact path="/instructor/profile">
          <ProfileEditor />
        </AuthRoute>
        <AuthRoute instructor exact path="/instructor/help">
          <Help />
        </AuthRoute>

        {/* When a student launches, the server will redirect to either /student/launch or /student/consent,
            both of which will redirect to the desired content */}
        {/* Allow flexibility in redirecting to another route when launching via LTI.
            The route `/student/launch/fakeToken/quiz/id1` would redirect to `/student/quiz/id1` */}
        <Route path="/student/launch/:token/:action/:parameter1">
          <LTILaunch />
        </Route>
        {/* Presents the consent form and redirects to the given action/param as does LTILaunch.
            This is a separate route/component, as regular LTILaunch may not have the course ID */}
        <Route path="/student/consent/:courseId/:token/:action/:parameter1">
          <CourseConsentForm />
        </Route>
        {/* Allow a student to review or change their consent
            (not protected, since it can be part of initial launch/auth process) */}
        <Route path="/student/consent/:courseId">
          <CourseConsentForm />
        </Route>

        <AuthRoute student exact path="/student">
          <DashboardList />
        </AuthRoute>
        <AuthRoute student exact path="/student/dashboard">
          <DashboardList />
        </AuthRoute>
        <AuthRoute student exact path="/student/dashboard/:courseId">
          <Dashboard />
        </AuthRoute>
        <AuthRoute student instructor path="/student/quiz/review/:quizAttemptId">
          <QuizReviewPage />
        </AuthRoute>
        <AuthRoute student path="/student/quiz/:quizId">
          <QuizTaker />
        </AuthRoute>
        <AuthRoute student path="/student/survey/:courseId">
          <SurveyTaker />
        </AuthRoute>

        <Route exact path="/terms">
          <TermsOfUse />
        </Route>
        <Route exact path="/privacy">
          <PrivacyPolicy />
        </Route>
        <Route exact path="/about">
          <About />
        </Route>
        <Route>
          <PageNotFound />
        </Route>
      </Switch>
    </div>
    <Footer />
  </Suspense>
);

// Set up react-tracking, with a custom dispatch function
export default withGraphQLTracking(App);
