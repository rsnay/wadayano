export interface Option {
  id: number,
  isCorrect: boolean,
  questionId: number,           //NOTE: this is the simplest way, but won't allow easy recycling of distractors.
  text: string,                         //e.g. "Riboflavin"
}

export interface Question {
  id: number,
  options: Option[],
  prompt: string,           //e.g. "Which of the following is not included in the B Vitamin complex?"
  conceptId: number           //NOTE: this approach suggests 1-to-1 question-concept
}

export interface Concept {
  id: number,
  title: string,            //e.g. "Micronutrients"
}

export interface Quiz {
  id: number,
  available: number,         //UTC when this quiz becomes available in the course (NOTE: this is a naive approach)
  questions: Question[],
  isGraded: boolean,        //i.e. does this quiz return a grade via LTI? Or just a practice quiz?
  title: string,            //e.g. "Micronutrients"
}

export interface QuestionAttempt {
  userId: number,
  questionId: number,
  selectedOption: number,   //option.id
  isCorrect?: boolean       //optional; for convenience
  isConfident: boolean      //i.e. "I'm confident my answer is correct"
  timestamp: number         //UTC
}

export interface QuizAttempt {
  userId: number,
  quizId: number,
  quizAttempts: QuizAttempt[],
  score: number,                 // (correct/total)
  conceptConfidences: ConceptConfidence[],
  totalConfidenceError: number,  // sum of forEach(attempt =>  abs(isConfident - isCorrect)). 0 == perfect estimation accuracy
  totalConfidenceBias: number,   // sum of forEach(attempt => isConfident - isCorrect). Positive == overestimated; 0 == counterbalanced or no bias
  timestamp: number              //UTC
}

export interface ConceptConfidence {
  conceptId: number,
  conceptTitle?: string,        //optional; for convenience
  confidenceError: number,    //same as above, but filtered to a single concept
  confidenceBias: number,     //ditto
}

export interface Course {     //LTI login grants access to one course
  id: number,
  quizzes: Quiz[]
}

export interface User {
   id: number,
   role: string                 //"instructor" | "student"
}
