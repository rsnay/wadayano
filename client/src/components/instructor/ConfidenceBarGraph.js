import React from 'react';
import PropTypes from 'prop-types';
import { CONFIDENCES } from '../../constants';

// Width of max bar (in px). Make sure this jives with what the main CSS file has
const MAX_WIDTH = 100;

const ConfidenceGraphRow = ({ confidence, count, max }) => {
    return (
        <tr>
            <td>{confidence.text}</td><td className="emoji-cell">{confidence.emoji}</td>
            <td>
                <span className="chart-bar" style={{width: (count / max) * MAX_WIDTH + "px"}}></span>
                <span className="chart-bar-label">{count}</span>
            </td>
        </tr>
    );
}

const ConfidenceBarGraph = (props) => {
    const { overconfident, accurate, underconfident, mixed } = props;
    // Determine count for largest bar
    const max = Math.max(overconfident, accurate, underconfident, mixed);

    return (
        <table className="confidence-bar-graph">
            <tbody>
                <ConfidenceGraphRow confidence={CONFIDENCES.OVERCONFIDENT} count={overconfident} max={max} />
                <ConfidenceGraphRow confidence={CONFIDENCES.ACCURATE} count={accurate} max={max} />
                <ConfidenceGraphRow confidence={CONFIDENCES.UNDERCONFIDENT} count={underconfident} max={max} />
                <ConfidenceGraphRow confidence={CONFIDENCES.MIXED} count={mixed} max={max} />
            </tbody>
        </table>
    );
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

export default ConfidenceBarGraph;