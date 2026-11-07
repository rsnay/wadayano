import React, { useCallback } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useHistory } from '../../navigation';
import ButterToast from './Toast';
import Logo from '../../logo_title.svg';

import { AUTH_TOKEN, AUTH_ROLE, AUTH_ROLE_INSTRUCTOR, AUTH_ROLE_STUDENT } from '../../constants';

// On mobile devices, the top menu disappears and is replaced by a hamburger menu button.
// This toggles it. Note that it relies on the menu having id of "header-main-menu"
function toggleMenu(e) {
  e.preventDefault();
  // Toggle the class on both the "navbar-burger" and the "navbar-menu"
  e.target.classList.toggle('is-active');
  document.getElementById('header-main-menu').classList.toggle('is-active');
}

/**
 * Main wadayano header to show applicable nav links based on current role.
 */
const Header = () => {
  const history = useHistory();

  const logOut = useCallback(() => {
    // Remove auth token and role
    localStorage.removeItem(AUTH_TOKEN);
    localStorage.removeItem(AUTH_ROLE);
    // Redirect to welcome page
    history.push('/');
    // Reload page to clear apollo cache
    window.location.reload();
  }, [history]);
  const isLoggedIn = !!localStorage.getItem(AUTH_TOKEN);
  const isInstructor = localStorage.getItem(AUTH_ROLE) === AUTH_ROLE_INSTRUCTOR;
  const isStudent = localStorage.getItem(AUTH_ROLE) === AUTH_ROLE_STUDENT;
  return (
    <nav className="navbar is-light no-select" aria-label="main navigation">
      <div className="navbar-brand">
        <Link to="/" className="navbar-item" style={{ padding: 0 }}>
          <img src={Logo} alt="wadayano" style={{ maxHeight: '4rem', height: '4rem' }} />
        </Link>
        <button
          className="navbar-burger button is-light"
          onClick={e => toggleMenu(e)}
          data-target="navMenu"
          aria-label="menu"
          aria-expanded="false"
          type="button"
        >
          {/* Lines of the hamburger */}
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
      </div>

      <div id="header-main-menu" className="navbar-menu">
        <div className="navbar-start">
          {isInstructor && (
            <NavLink to="/instructor/courses" className={({ isActive }) => `navbar-item${isActive ? ' is-active' : ''}`}>
              Courses
            </NavLink>
          )}
          {isInstructor && (
            <NavLink to="/instructor/profile" className={({ isActive }) => `navbar-item${isActive ? ' is-active' : ''}`}>
              Profile
            </NavLink>
          )}
          {isStudent && (
            <NavLink to="/student/dashboard" className={({ isActive }) => `navbar-item${isActive ? ' is-active' : ''}`}>
              Dashboard
            </NavLink>
          )}
        </div>

        <div className="navbar-end">
          {isInstructor && (
            <NavLink to="/instructor/help" className={({ isActive }) => `navbar-item${isActive ? ' is-active' : ''}`}>
              Help
            </NavLink>
          )}
          {isLoggedIn && (
            <NavLink
              to="/feedback"
              className={({ isActive }) => `navbar-item${isActive ? ' is-active is-pulled-right' : ''}`}
            >
              Send Feedback
            </NavLink>
          )}
          {!isLoggedIn && (
            <NavLink to="/about" className={({ isActive }) => `navbar-item${isActive ? ' is-active' : ''}`}>
              About
            </NavLink>
          )}
          <div className="navbar-item">
            {isLoggedIn ? (
              <button className="button is-outlined" onClick={logOut} type="button">
                Log Out
              </button>
            ) : (
              <Link to="/login" className="button is-info is-outlined">
                Log In
              </Link>
            )}
          </div>
        </div>
      </div>

      <ButterToast timeout={4000} />
    </nav>
  );
};

export default Header;
