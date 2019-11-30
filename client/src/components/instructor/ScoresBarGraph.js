/* eslint-disable react/no-array-index-key */
import React from 'react';
import PropTypes from 'prop-types';
import ReactTooltip from 'react-tooltip';

import { formatScore } from '../../utils';

const NUM_BARS = 10;
// Height of max bar (in px). Make sure this jives with what the main CSS file has
const MAX_HEIGHT = 210;
const BAR_COLORS = ['hsl(48, 100%, 67%)', 'hsl(204, 86%, 53%)'];

const ScoresBarGraph = ({
  scoreSeries,
  numBars = NUM_BARS,
  barColors = BAR_COLORS,
  lowerThreshold = 0,
  upperThreshold = 1,
}) => {
  const scoreSeriesGroups = scoreSeries.map(scores => {
    scores.sort((a, b) => a - b);

    // Generate random data for demo purposes
    /*
    scores = [];
    for (let i = 0; i < 100; i++) {
      scores.push(Math.random() > 0.5 ? Math.random() : Math.random() * -1.0);
    }
    scores.sort((a, b) => a - b);
    console.log(scores);
    */

    const scoreGroups = [];
    let scoreIndex = 0;

    // Group scores by numBars (e.g. if 10 bars, group by 10% increments.
    // Groups exclude upper bound, e.g. 0 ≤ score < 10, but last will include upper bound, 90 ≤ score ≤ 100)
    for (let i = 0; i < numBars; i++) {
      let scoreThreshold = lowerThreshold + (i + 1) * ((upperThreshold - lowerThreshold) / numBars);
      // Handle exclusion differently when < 0
      if (scoreThreshold <= 0) {
        scoreThreshold = lowerThreshold + i * ((upperThreshold - lowerThreshold) / numBars);
      }
      const previousScoreIndex = scoreIndex;

      // console.log(i, scoreThreshold, scoreLabel);

      // If not in last group, continue going through scores until next threshold
      if (i !== numBars - 1) {
        while (scores[scoreIndex] < scoreThreshold) {
          // console.log('\t adding score ', scores[scoreIndex]);
          scoreIndex++;
        }
      } else {
        // Otherwise, go to end of array
        scoreIndex = scores.length;
        // console.log('\t adding the rest of the scores');
      }

      // There are (scoreIndex - previousScoreIndex) many scores in this group
      scoreGroups.push(scoreIndex - previousScoreIndex);
    }

    return scoreGroups;
  });

  // Determine count for largest bar (find largest value in any of the series)
  // I know serie isn't a word, but I'm using it as singular and series as plural to be clearer
  const max = Math.max(...scoreSeriesGroups.map(scoreSerieGroups => Math.max(...scoreSerieGroups)));

  const barCells = [];
  const barLabels = [];
  for (let i = 0; i < numBars; i++) {
    barLabels[i] = formatScore(lowerThreshold + i * ((upperThreshold - lowerThreshold) / numBars));
    barCells[i] = (
      <td key={i}>
        {scoreSeriesGroups.map((scoreSerieGroups, serieIndex) => (
          <span
            key={serieIndex}
            className="chart-bar"
            style={{
              height: `${(scoreSerieGroups[i] / max) * MAX_HEIGHT}px`,
              backgroundColor: barColors[serieIndex],
            }}
            data-tip={scoreSerieGroups[i] + (scoreSerieGroups[i] === 1 ? ' student' : ' students')}
          />
        ))}
      </td>
    );
  }

  return (
    <>
      <table className="scores-bar-graph">
        <tbody>
          <tr>{barCells}</tr>
          <tr className="tick-mark-labels">
            {barLabels.map(label => (
              <td key={label} style={{ width: `${(1 / numBars) * 100}%` }}>
                {label}
              </td>
            ))}
          </tr>
          <tr className="tick-marks">
            {barLabels.map(label => (
              <td key={label}> {/* Placeholder cell for tickmarks */} </td>
            ))}
          </tr>
        </tbody>
      </table>
      <ReactTooltip />
    </>
  );
};

ScoresBarGraph.propTypes = {
  // E.g. [ [1,2,3], [1,4,2] ] for a 2-series graph
  scoreSeries: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number.isRequired).isRequired)
    .isRequired,
  numBars: PropTypes.number,
  barColors: PropTypes.arrayOf(PropTypes.string.isRequired),
  lowerThreshold: PropTypes.number,
  upperThreshold: PropTypes.number,
};

// The props to this won't change often, so memoize it.
// Calculation is done in the render method, as suggested in https://reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html#what-about-memoization
export default React.memo(ScoresBarGraph);
