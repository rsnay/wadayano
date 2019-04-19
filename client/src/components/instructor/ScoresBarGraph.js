import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ReactTooltip from 'react-tooltip';

import { formatScore } from '../../utils';

const NUM_BARS = 10;
// Height of max bar (in px). Make sure this jives with what the main CSS file has
const MAX_HEIGHT = 210;
const BAR_COLORS = ['hsl(48, 100%, 67%)','hsl(204, 86%, 53%)'];

export default class ScoresBarGraph extends Component {

    constructor(props) {
        super(props);
        let scoreSeriesGroups = props.scoreSeries.map(scores => {
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

            return scoreGroups;
        });

        this.state = {
            scoreSeriesGroups
        };
    }

    render() {
        const { scoreSeriesGroups } = this.state;

        // Determine count for largest bar (find largest value in any of the series)
        // I know serie isn't a word, but I'm using it as singular and series as plural to be clearer
        const max = Math.max(...scoreSeriesGroups.map(scoreSerieGroups => Math.max(...scoreSerieGroups)));

        let barCells = [];
        for (let i = 0; i < NUM_BARS; i++) {
            barCells[i] = (
                <td key={i}>
                    {scoreSeriesGroups.map((scoreSerieGroups, serieIndex) => 
                        <span
                            key={serieIndex}
                            className="chart-bar"
                            style={{
                                height: (scoreSerieGroups[i] / max) * MAX_HEIGHT + "px",        
                                backgroundColor: BAR_COLORS[serieIndex]
                            }}
                            data-tip={scoreSerieGroups[i] + (scoreSerieGroups[i] === 1 ? ' student' : ' students')}
                        ></span>
                    )}
                </td>
            );
        }

        return (
            <React.Fragment>
                <table className="scores-bar-graph">
                    <tbody>
                        <tr>
                            {barCells}
                        </tr>
                        <tr className="tick-mark-labels">
                            {barCells.map((unused, index) => 
                                <td key={index}>{formatScore(index * (1 / NUM_BARS))} </td>
                            )} 
                        </tr>
                        <tr className="tick-marks">
                            {barCells.map((unused, index) => 
                                <td key={index}> {/* Placeholder cell for tickmarks */} </td>
                            )}
                        </tr>
                    </tbody>
                </table>
                <ReactTooltip />
            </React.Fragment>
        );
    }
}
    
ScoresBarGraph.propTypes = {
    // E.g. [ [1,2,3], [1,4,2] ] for a 2-series graph
    scoreSeries: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number.isRequired).isRequired).isRequired
};

ScoresBarGraph.defaultProps = {
    scores: [[]]
};
