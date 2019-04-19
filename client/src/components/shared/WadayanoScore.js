import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { formatScore } from '../../utils';
import Logo from '../../logo_boxed.svg';
import Modal from '../shared/Modal';

/**
 * Component for use in QuizReview that displays the wadayano logo, wadayano score,
 * and confidence analysis (used for both quizzes and invidiaul concepts).
 */
export default class WadayanoScore extends Component{

    constructor(props) {
        super(props);
        this.state = {
            displayHelpText:false,
        };
    }

    render() {
        return(
            <React.Fragment>
                <div className="columns is-gapless is-multiline wadyano-score-container">
                    <div className="column wadayano-score-logo">
                        <img src={Logo} alt="wadayano" />
                    </div>
                    <div className="column">
                        <h2 className="subtitle is-4">
                            Wadayano Score: {formatScore(this.props.score)}
                        </h2>
                        <div>
                            <span className="subtitle is-4">
                                <span className={"confidence-emoji is-medium " + this.props.confidenceAnalysis.key}></span> {this.props.confidenceAnalysis.text}
                            </span>
                            <span className="question-mark-circle" onClick={() => this.setState({ displayHelpText: true }) }>?</span>
                        </div>
                    </div>
                </div>

                <Modal
                    modalState={this.state.displayHelpText}
                    closeModal={() => this.setState({ displayHelpText: false })}
                    title={"Help"}
                >
                    <p>Wadayano Score measures how well you know what you know.</p>
                    <ul>
                        <li>Higher scores mean you are only confident about things you actually know.</li>
                        <li>Lower scores may indicate that you are over- or under-confident.</li>
                    </ul>
                </Modal>
            </React.Fragment>
        );
    }
}

WadayanoScore.propTypes = {
    // Floating point score in range 0–1
    score: PropTypes.number.isRequired,
    // The object returned from utils.confidenceAnalysis matches this shape
    confidenceAnalysis: PropTypes.shape({
        text: PropTypes.string.isRequired,
        key: PropTypes.string.isRequired
    }).isRequired
};