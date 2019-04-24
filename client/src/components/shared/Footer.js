import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { withRouter } from 'react-router';

/**
 * Main wadayano footer with copyright and legal info
 */
class Footer extends Component {

    render() {
        return (
            <footer class="app-footer no-select">
                <div class="content">
                    <span class="footer-item">
                        &copy; 2019 wadayano
                    </span>
                    <Link to="/terms" class="footer-item">Terms</Link>
                    <Link to="/privacy" class="footer-item">Privacy</Link>
                    <Link to="/about" class="footer-item">About</Link>
                </div>
            </footer>
        );
    }
}

export default withRouter(Footer);