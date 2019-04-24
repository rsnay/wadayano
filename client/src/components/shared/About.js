import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { CONFIDENCES } from '../../constants';
import licenses from '../../licenses.json';

/**
 * “About” page
 * Information about wadayano, acknowledgements for open-source projects used, etc.
 */
 export default class About extends Component {
    render() {
        console.table(licenses);

        return (
            <section className="container section content">
                <h1 className="title is-1 has-text-weight-light">About wadayano</h1>

                Wadayano is an online quiz tool to help students better monitor <b>what they know</b> and <b>what they don’t</b> know.  We integrate with popular learning management systems like Canvas via LTI (Learning Tools Interoperability), creating a seamless experience.
                <br /><br />

                When students take a quiz on wadayano, they estimate how well they know each quiz concept and indicate whether they are confident in their response to each question. In addition to getting a normal quiz score, they receive a wadayano score that indicates how accurate their predictions were (with a corresponding emoji):
                <br /><br />
                <div class="columns is-size-4">
                    {Object.keys(CONFIDENCES).map(confidence => 
                        <div class="column">
                            <span className={"confidence-emoji is-medium " + CONFIDENCES[confidence].key}></span> {CONFIDENCES[confidence].text}
                        </div>
                    )}
                </div>

                The instructor dashboard gives detailed reports of actual, predicted, and wadayano scores by quiz and concept to see where students over- and underestimate their own knowledge. Instructors can view individual student attempts, as well as a summary of responses given to a question by all students in the course.
                <br /><br />

                <Link to="/signup" className="has-text-info is-text">
                    Get started with wadayano for free
                    <span className="icon" style={{verticalAlign: "top"}}>
                        <i className="fas fa-chevron-right"></i>
                    </span>
                </Link>

                <h2 className="title is-2 has-text-weight-light">Open Source Acknowledgements</h2>
                <p><i>For wadayano source code, <a href="https://github.com/bodily11/knowledge-monitoring-dashboard/">visit us on GitHub</a>.</i></p>
                <p>Emoji artwork is provided by <a href="https://twemoji.twitter.com/">Twemoji</a>, licensed under <a href="https://creativecommons.org/licenses/by/4.0/">CC-BY 4.0</a>.</p>
                <p>Wadayano makes use of the following open source projects:</p>
                {/* To update this table, run `npm-license-crawler --production --onlyDirectDependencies --omitVersion --json client/src/licenses.json` in the repository root directory. The license crawler will need to be installed globally: `npm i npm-license-crawler -g` */}
                <table className="table is-striped is-vcentered">
                    <thead>
                        <tr><th>Project</th><th>License</th></tr>
                    </thead>
                    <tbody>
                        {Object.keys(licenses).map(dep => 
                            <tr>
                                <td><a href={licenses[dep].repository}>{dep}</a></td>
                                <td><a href={licenses[dep].licenseUrl}>{licenses[dep].licenses}</a></td>
                            </tr>
                        )}
                    </tbody>
                </table>

            </section>
        );
    }

}