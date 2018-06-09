export interface Option {
  id: number,
  isCorrect: boolean,
  itemId: number,           //NOTE: this is the simplest way, but won't allow easy recycling of distractors.
  text: string,             //e.g. "Riboflavin"
}

export interface Item {
  id: number,
  options: Option[],
  prompt: string,           //e.g. "Which of the following is not included in the B Vitamin complex?"
  topicId: number           //NOTE: this approach suggests 1-to-1 item-topic
}

export interface Topic {
  id: number,
  title: string,            //e.g. "Micronutrients"
}

export interface Quiz {
  id: number,
  available: number,         //UTC when this quiz becomes available in the course (NOTE: this is a naive approach)
  items: Item[],
  isGraded: boolean,        //i.e. does this quiz return a grade via LTI? Or just a practice quiz?
  title: string,            //e.g. "Micronutrients"
}

export interface Attempt {
  userId: number,
  itemId: number,
  selectedOption: number,   //option.id
  isCorrect?: boolean       //optional; for convenience
  isConfident: boolean      //i.e. "I'm confident my answer is correct"
  timestamp: number         //UTC
}

export interface QuizAttempt {
  userId: number,
  quizId: number,
  attempts: Attempt[],
  score: number,                 // (correct/total)
  topicConfidences: TopicConfidence[],
  totalConfidenceError: number,  // sum of forEach(attempt =>  abs(isConfident - isCorrect)). 0 == perfect estimation accuracy
  totalConfidenceBias: number,   // sum of forEach(attempt => isConfident - isCorrect). Positive == overestimated; 0 == counterbalanced or no bias
  timestamp: number              //UTC
}

export interface TopicConfidence {
  topicId: number,
  topicTitle?: string,        //optional; for convenience
  confidenceError: number,    //same as above, but filtered to a single topic
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
