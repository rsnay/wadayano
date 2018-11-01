import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { formatScore } from '../../utils';

const NUM_BARS = 10;
// Height of max bar (in px). Make sure this jives with what the main CSS file has
const MAX_HEIGHT = 140;

export default class ScoresBarGraph extends Component {

    constructor(props) {
        super(props);
        // Group the scores (first copy them, since props are read-only)
        let scores = [...props.scores];
        scores.sort();

        // Generate random data for demo purposes
        /*
        scores = [];
        for (let i = 0; i < 200; i++) {
            scores.push(Math.random());
        }
        scores.sort();
        */

        let scoreGroups = [];
        let scoreIndex = 0;
        
        // Group scores by NUM_BARS (e.g. if 10 bars, group by 10% increments. Groups exclude upper bound, e.g. 0 ≤ score < 10, but last will include upper bound, 90 ≤ score ≤ 100)
        for (let i = 0; i < NUM_BARS; i++) {
            let scoreThreshold = (i + 1) * (1 / (NUM_BARS));
            let previousScoreIndex = scoreIndex;
            
            // If not in last group, continue going through scores until next threshold
            if (i !== NUM_BARS - 1) {
                while (scores[scoreIndex] < scoreThreshold) { scoreIndex++; }
            } else {
                // Otherwise, go to end of array
                scoreIndex = scores.length;
            }

            // There are (scoreIndex - previousScoreIndex) many scores in this group
            scoreGroups.push(scoreIndex - previousScoreIndex)
        }

        this.state = {
            scoreGroups
        };
    }

    render() {
        const { scoreGroups } = this.state;

        // Determine count for largest bar
        const max = Math.max(...scoreGroups);

        return (
            <table className="scores-bar-graph">
                <tbody>
                    <tr>
                        {scoreGroups.map((groupCount, index) => 
                            <td key={index}>
                                <span className="chart-bar-label">{groupCount !== 0 && groupCount}</span>
                                <span className="chart-bar" style={{height: (groupCount / max) * MAX_HEIGHT + "px"}}></span>
                            </td>
                        )}
                    </tr>
                    <tr className="tick-mark-labels">
                        {scoreGroups.map((groupCount, index) => 
                            <td key={index}>{formatScore(index * (1 / NUM_BARS))} </td>
                        )} 
                    </tr>
                    <tr className="tick-marks">
                        {scoreGroups.map((groupCount, index) => 
                            <td key={index}> {/* Placeholder cell for tickmarks */} </td>
                        )}
                    </tr>
                </tbody>
            </table>
            );
    }
}
    
ScoresBarGraph.propTypes = {
    scores: PropTypes.arrayOf(PropTypes.number.isRequired).isRequired
};

ScoresBarGraph.defaultProps = {
    scores: []
};
