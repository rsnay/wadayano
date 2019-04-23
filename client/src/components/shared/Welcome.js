import React, { Component } from 'react';
import { Link } from 'react-router-dom';

import { AUTH_ROLE, AUTH_ROLE_STUDENT, AUTH_ROLE_INSTRUCTOR } from '../../constants';

import Logo from '../../logo_title_white.svg';
import QuizzesImage from '../../img/welcome_quizzes.png';
import ConfidenceImage from '../../img/welcome_confidence.png';
import InsightsImage from '../../img/welcome_insights.png';

/**
 * The page displayed at the root path (e.g. https://wadayano.com/ )
 * Redirects to the student or instructor dashboard, or offers login/signup options and information about wadayano
 */
 export default class Welcome extends Component {
    
    componentDidMount() {
        const authRole = localStorage.getItem(AUTH_ROLE);
        if (authRole === AUTH_ROLE_STUDENT) {
            this.props.history.replace('/student/dashboard');
            return;
        }
        if (authRole === AUTH_ROLE_INSTRUCTOR) {
            this.props.history.replace('/instructor/courses');
            return;
        }
    }

    render() {

        const authButtons = (
            <p className="buttons is-centered auth-buttons">
                <Link to="/login" className="button is-info">
                    <span className="icon">
                        <i className="fas fa-sign-in-alt"></i>
                    </span>
                    <span>Log In</span>
                </Link>
                <Link to="/signup" className="button is-info">
                    <span className="icon">
                        <i className="fas fa-user-plus"></i>
                    </span>
                    <span>Sign Up</span>
                </Link>
            </p>
        );

        return (
            <main>
            <section class="hero is-bold is-primary">
                <div class="hero-body">
                    <div class="container">
                    <h1 class="title">
                        <img src={Logo} alt="wadayano" style={{maxHeight: "6rem", height: "6rem", marginLeft: "-2rem"}} />
                    </h1>
                    <h2 class="subtitle">
                        Supporting knowledge monitoring development
                    </h2>
                    </div>
                </div>
            </section>

            <div className="container welcome-page">
            {authButtons}

            <div class="section tile is-ancestor">
                <div class="tile is-parent">
                <article class="tile is-child box">
                    <h2 class="title">Student Quizzes</h2>
                    <p class="content">
                    Help your students better monitor <b>what they know</b> and <b>what they don’t</b> know in your courses with online quizzes.
                    <br /><br />
                    We integrate with popular learning management systems via LTI, creating a seamless experience for your students.
                    <br /><br />
                    <img src={QuizzesImage} alt="Preview of a mobile-friendly wadayano quiz" />
                    </p>
                </article>
                </div>

                <div class="tile is-parent">
                <article class="tile is-child box">
                    <h2 class="title">Confidence Analysis</h2>
                    <p class="content">
                    Students estimate how well they know each quiz concept and indicate whether they are confident in their response to each question.
                    <br /><br />
                    In addition to getting a normal quiz score, they receive a wadayano score that indicates how accurate their predictions were.
                    <br /><br />
                    <img src={ConfidenceImage} alt="Confidence analysis and wadayano scores to help students improve their knowledge monitoring abilities" />
                    </p>
                </article>
                </div>

                <div class="tile is-parent">
                <article class="tile is-child box">
                    <h2 class="title">Instructor Insights</h2>
                    <p class="content">
                    Review predicted and wadayano scores by quiz and concept to see where students over- and underestimate their own knowledge.
                    <br /><br />
                    Make informed course adjustments and ensure that the balance of quiz items meets students’ needs.
                    <br /><br />
                    <img src={InsightsImage} alt="Detailed instructor insights provide predicted, actual, and wadayano scores for quizzes and concepts." />
                    </p>
                </article>
                </div>
            </div>

            <section className="section" style={{ marginTop: "-2rem", paddingTop: 0 }}>
                <h2 className="title is-3">Why Knowledge Monitoring?</h2>
                Knowledge monitoring (KM) is a predictor of broader success like GPA and high school dropout rate. It’s also foundational to other metacognitive skills—having an accurate sense of what you do and don’t know enables you to develop plans and strategies that make effective use of limited study time and resources.&nbsp;
                <Link to="/signup" className="has-text-info is-text">
                    Get started with wadayano for free
                    <span className="icon" style={{verticalAlign: "top"}}>
                        <i className="fas fa-chevron-right"></i>
                    </span>
                </Link>
            {authButtons}
            </section>
            </div>
            </main>
        );
    }

}