import { stringCompare } from './utils';

// How to weight the confidence analysis labels for sorting
export const confidenceAnalysisWeights = {
  // '0' denotes quiz not taken
  '0': 0,
  Mixed: 1,
  Underconfident: 2,
  Accurate: 3,
  Overconfident: 4,
};

// Functions to define sorting on the various columns
export const sortFunctions = {
  name: (a, b) => stringCompare(a.name, b.name),
  concept: (a, b) => stringCompare(a.concept, b.concept),
  attempts: (a, b) => a.attempts - b.attempts,
  highestScore: (a, b) => a.highestScore - b.highestScore,
  predictedScore: (a, b) => a.predictedScore - b.predictedScore,
  wadayanoScore: (a, b) => a.wadayanoScore - b.wadayanoScore,
  confidenceAnalysis: (a, b) =>
    confidenceAnalysisWeights[a.confidenceAnalysis.text] -
    confidenceAnalysisWeights[b.confidenceAnalysis.text],
  averageScore: (a, b) => a.averageScore - b.averageScore,
  averagePredictedScore: (a, b) => a.averagePredictedScore - b.averagePredictedScore,
  averageWadayanoScore: (a, b) => a.averageWadayanoScore - b.averageWadayanoScore,
};
