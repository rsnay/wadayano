import React, { Component } from 'react';
import { Link } from 'react-router-dom';

export default class PageNotFound extends Component {
    render() {
        return (
        <article class="section message is-warning">
            <div class="message-header">
                <p>Page Not Found</p>
                <span class="icon is-large"><i class="fas fa-3x fa-exclamation-circle" aria-hidden="true"></i></span>
            </div>
            <div class="message-body">
                <Link to="/">Return home</Link>
            </div>
        </article>
        );
    }
}