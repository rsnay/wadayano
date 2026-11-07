import React, { Suspense, lazy } from 'react';
import '../styles/App.css';
import '../styles/Instructor.css';
import '../styles/Student.css';
import '../styles/BulmaConfig.css';

import { Routes, Route } from 'react-router-dom';
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
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Login />} />
        <Route path="/reset-password/:token/*" element={<ResetPassword />} />
        <Route path="/feedback" element={<AuthRoute student instructor><FeedbackForm /></AuthRoute>} />

        <Route path="/instructor" element={<AuthRoute instructor><CourseList /></AuthRoute>} />
        <Route path="/instructor/courses" element={<AuthRoute instructor><CourseList /></AuthRoute>} />
        <Route path="/instructor/course/:courseId/*" element={<AuthRoute instructor><CourseDetails /></AuthRoute>} />
        <Route path="/instructor/quiz/:quizId/import/*" element={<AuthRoute instructor><QuestionImporter /></AuthRoute>} />
        <Route path="/instructor/quiz/:quizId/scores/*" element={<AuthRoute instructor><QuizScores /></AuthRoute>} />
        <Route path="/instructor/quiz/:quizId/*" element={<AuthRoute instructor><QuizEditor /></AuthRoute>} />
        <Route path="/instructor/survey/edit/:courseId/*" element={<AuthRoute instructor><SurveyEditor /></AuthRoute>} />
        <Route path="/instructor/survey/results/:courseId/*" element={<AuthRoute instructor><SurveyResults /></AuthRoute>} />
        <Route path="/instructor/profile" element={<AuthRoute instructor><ProfileEditor /></AuthRoute>} />
        <Route path="/instructor/help" element={<AuthRoute instructor><Help /></AuthRoute>} />

        {/* When a student launches, the server will redirect to either /student/launch or /student/consent,
            both of which will redirect to the desired content */}
        {/* Allow flexibility in redirecting to another route when launching via LTI.
            The route `/student/launch/fakeToken/quiz/id1` would redirect to `/student/quiz/id1` */}
        {/* Presents the consent form and redirects to the given action/param as does LTILaunch.
            This is a separate route/component, as regular LTILaunch may not have the course ID */}
        {/* Allow a student to review or change their consent
            (not protected, since it can be part of initial launch/auth process) */}
        <Route path="/student/launch/:token/:action/:parameter1/*" element={<LTILaunch />} />
        <Route path="/student/consent/:courseId/:token/:action/:parameter1/*" element={<CourseConsentForm />} />
        <Route path="/student/consent/:courseId/*" element={<CourseConsentForm />} />
        <Route path="/student" element={<AuthRoute student><DashboardList /></AuthRoute>} />
        <Route path="/student/dashboard" element={<AuthRoute student><DashboardList /></AuthRoute>} />
        <Route path="/student/dashboard/:courseId" element={<AuthRoute student><Dashboard /></AuthRoute>} />
        <Route path="/student/quiz/review/:quizAttemptId/*" element={<AuthRoute student instructor><QuizReviewPage /></AuthRoute>} />
        <Route path="/student/quiz/:quizId/*" element={<AuthRoute student><QuizTaker /></AuthRoute>} />
        <Route path="/student/survey/:courseId/*" element={<AuthRoute student><SurveyTaker /></AuthRoute>} />

        <Route path="/terms" element={<TermsOfUse />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </div>
    <Footer />
  </Suspense>
);

// Set up react-tracking, with a custom dispatch function
export default withGraphQLTracking(App);
