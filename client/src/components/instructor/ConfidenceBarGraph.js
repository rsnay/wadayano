import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { CONFIDENCES } from '../../constants';

// Width of max bar (in px). Make sure this jives with what the main CSS file has
const MAX_WIDTH = 100;

export default class ConfidenceBarGraph extends Component {
    render() {
        const { overconfident, accurate, underconfident, mixed } = this.props;
        // Determine count for largest bar
        const max = Math.max(overconfident, accurate, underconfident, mixed);

        return (
            <table className="confidence-bar-graph">
                <tbody>
                    <tr>
                        <td>{CONFIDENCES.OVERCONFIDENT.text}</td><td className="emoji-cell">{CONFIDENCES.OVERCONFIDENT.emoji}</td>
                        <td>
                            <span className="chart-bar" style={{width: (overconfident / max) * MAX_WIDTH + "px"}}></span>
                            <span className="chart-bar-label">{overconfident}</span>
                        </td>
                    </tr>
                    <tr>
                        <td>{CONFIDENCES.ACCURATE.text}</td><td className="emoji-cell">{CONFIDENCES.ACCURATE.emoji}</td>
                        <td>
                            <span className="chart-bar" style={{width: (accurate / max) * MAX_WIDTH + "px"}}></span>
                            <span className="chart-bar-label">{accurate}</span>
                        </td>
                    </tr>
                    <tr>
                        <td>{CONFIDENCES.UNDERCONFIDENT.text}</td><td className="emoji-cell">{CONFIDENCES.UNDERCONFIDENT.emoji}</td>
                        <td>
                            <span className="chart-bar" style={{width: (underconfident / max) * MAX_WIDTH + "px"}}></span>
                            <span className="chart-bar-label">{underconfident}</span>
                        </td>
                    </tr>
                    <tr>
                        <td>{CONFIDENCES.MIXED.text}</td><td className="emoji-cell">{CONFIDENCES.MIXED.emoji}</td>
                        <td>
                            <span className="chart-bar" style={{width: (mixed / max) * MAX_WIDTH + "px"}}></span>
                            <span className="chart-bar-label">{mixed}</span>
                        </td>
                    </tr>
                </tbody>
            </table>
        );
    }
}
    
ConfidenceBarGraph.propTypes = {
    overconfident: PropTypes.number.isRequired,
    accurate: PropTypes.number.isRequired,
    underconfident: PropTypes.number.isRequired,
    mixed: PropTypes.number.isRequired,
};

ConfidenceBarGraph.defaultProps = {
    overconfident: 0,
    accurate: 0,
    underconfident: 0,
    mixed: 0
};
