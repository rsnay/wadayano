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
        </div>
        <div className="navbar-menu is-active">
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