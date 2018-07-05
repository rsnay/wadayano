import React, { Component } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { withRouter } from 'react-router';
import Logo from '../../logo.svg';

import { INSTRUCTOR_LOGGED_IN } from '../../constants';

class Header extends Component {

    componentDidMount() {
    }

    _logOut() {
        localStorage.removeItem(INSTRUCTOR_LOGGED_IN);
        this.props.history.push('/');
    }

    // On mobile devices, the top menu disappears and is replaced by a hamburger menu button.
    // This toggles it. Note that it relies on the menu having id of "header-main-menu"
    _toggleMenu(e) {
        e.preventDefault();
        // Toggle the class on both the "navbar-burger" and the "navbar-menu"
        e.target.classList.toggle('is-active');
        document.getElementById('header-main-menu').classList.toggle('is-active');
    }

  render() {
    let instructorLoggedIn = localStorage.getItem(INSTRUCTOR_LOGGED_IN) === "true";
    return (
      <nav className="navbar is-light" role="navigation" aria-label="main navigation">
        <div className="navbar-brand">
            <Link to="/" className="navbar-item">
                <span className="icon is-medium">
                    <i className="fas fa-2x fa-book"></i>
                </span>
                &nbsp;&nbsp;
                <img src={Logo} alt="Knowledge Monitoring" height="28" />
            </Link>
            <a role="button" class="navbar-burger" onClick={(e) => this._toggleMenu(e) } data-target="navMenu" aria-label="menu" aria-expanded="false">
                <span aria-hidden="true"></span>
                <span aria-hidden="true"></span>
                <span aria-hidden="true"></span>
            </a>
        </div>

        <div id="header-main-menu" className="navbar-menu">
            <div className="navbar-start">
                <NavLink activeClassName="is-active" to="/instructor" className="navbar-item">Instructors</NavLink>
                <NavLink activeClassName="is-active" to="/student" className="navbar-item">Students</NavLink>
            </div>
            <div className="navbar-end">
                <div className="navbar-item">
                {instructorLoggedIn ? 
                    <button className="button is-danger is-outlined" onClick={() => this._logOut() }>Log Out</button>
                : 
                    <Link to="/login" className="button is-info is-outlined">Log In</Link>
                }
                </div>
            </div>
        </div>
      </nav> 
    )
  }
}

export default withRouter(Header)