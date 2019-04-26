import React, { Component } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { withRouter } from 'react-router';
import ButterToast from './Toast';
import Logo from '../../logo_title.svg';

import { AUTH_TOKEN, AUTH_ROLE, AUTH_ROLE_INSTRUCTOR, AUTH_ROLE_STUDENT } from '../../constants';

/**
 * Main wadayano header to show applicable nav links based on current role.
 */
class Header extends Component {

    logOut() {
        // Remove auth token and role
        localStorage.removeItem(AUTH_TOKEN);
        localStorage.removeItem(AUTH_ROLE);
        // Redirect to welcome page
        this.props.history.push('/');
        // Reload page to clear apollo cache
        window.location.reload();
    }

    // On mobile devices, the top menu disappears and is replaced by a hamburger menu button.
    // This toggles it. Note that it relies on the menu having id of "header-main-menu"
    toggleMenu(e) {
        e.preventDefault()
        // Toggle the class on both the "navbar-burger" and the "navbar-menu"
        e.target.classList.toggle('is-active');
        document.getElementById('header-main-menu').classList.toggle('is-active');
    }

    render() {
        this.isLoggedIn = !!localStorage.getItem(AUTH_TOKEN);
        this.isInstructor = localStorage.getItem(AUTH_ROLE) === AUTH_ROLE_INSTRUCTOR;
        this.isStudent = localStorage.getItem(AUTH_ROLE) === AUTH_ROLE_STUDENT;
        return (
            <nav className="navbar is-light no-select" aria-label="main navigation">
                <div className="navbar-brand">
                    <Link to="/" className="navbar-item" style={{padding: 0}}>
                        <img src={Logo} alt="wadayano" style={{maxHeight: "4rem", height: "4rem"}} />
                    </Link>
                    <button
                        className="navbar-burger button is-light"
                        onClick={(e) => this.toggleMenu(e) }
                        data-target="navMenu"
                        aria-label="menu"
                        aria-expanded="false"
                    >
                        {/* Lines of the hamburger */}
                        <span aria-hidden="true"></span>
                        <span aria-hidden="true"></span>
                        <span aria-hidden="true"></span>
                    </button>
                </div>

                <div id="header-main-menu" className="navbar-menu">
                    <div className="navbar-start">
                        {this.isInstructor && <NavLink activeClassName="is-active" to="/instructor/courses" className="navbar-item">Courses</NavLink>}
                        {this.isInstructor && <NavLink activeClassName="is-active" to="/instructor/profile" className="navbar-item">Profile</NavLink>}
                        {this.isStudent && <NavLink activeClassName="is-active" to="/student/dashboard" className="navbar-item">Dashboard</NavLink>}
                    </div>

                    <div className="navbar-end">
                        {this.isLoggedIn && <NavLink activeClassName="is-active is-pulled-right" to="/feedback" className="navbar-item">Send Feedback</NavLink>}
                        <div className="navbar-item">
                        {this.isLoggedIn ? 
                            <button className="button is-outlined" onClick={() => this.logOut() }>Log Out</button>
                        : 
                            <Link to="/login" className="button is-info is-outlined">Log In</Link>
                        }
                        </div>
                    </div>
                </div>

                <ButterToast timeout={4000} />
            </nav> 
        );
    }
}

export default withRouter(Header);