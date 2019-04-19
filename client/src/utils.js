import { CONFIDENCES } from "./constants";

// Format a 0–1 float score to 33.3%, with the given number of  digits after the decimal point
export function formatScore(score, mantissaDigits = 1) {
    if (Number.isNaN(score)) { score = 0; }
    return `${Math.round(score * 100 * Math.pow(10, mantissaDigits)) / (1 * Math.pow(10, mantissaDigits))}%`;
}

// A function to help with reordering an array element (for drag and drop)
// From react-beautiful-dnd: https://github.com/atlassian/react-beautiful-dnd/blob/master/website/src/components/examples/reorder.js
export function reorder(list, startIndex, endIndex) {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
  
    return result;
};

// Strip HTML tags from a given string
export function stripTags(html) {
    const parser = new DOMParser();
    let doc = parser.parseFromString(html, 'text/html');
    return doc.body.textContent || '';
}

// Filters a quizAttempt by the given concept, and returns the corresponding questionAttempts
// Returns all questionAttempts if no concept is provided
export function filterByConcept(quizAttempt, concept = null) {
    // Filter by concept, if applicable
    let questionAttempts;
    if (concept !== null) {
        questionAttempts = quizAttempt.questionAttempts.filter(questionAttempt => questionAttempt.question.concept === concept);
    } else {
        questionAttempts = quizAttempt.questionAttempts;
    }
    return questionAttempts;
}

// Calculate predicted score for a given quiz attempt (optionally for a specific concept, for which quizAttempt.questionAttempts[i].question.concept must be included)
// Returns a float ranging from 0 to 1
export function predictedScore(quizAttempt, concept = null) {
    if (!quizAttempt || !quizAttempt.questionAttempts || quizAttempt.questionAttempts.length === 0 || !quizAttempt.conceptConfidences || quizAttempt.conceptConfidences.length === 0) { 
        return 0;
    }

    const questionAttempts = filterByConcept(quizAttempt, concept);

    // Avoid divide by zero
    const questionCount = questionAttempts.length;
    if (questionCount === 0) { return 0; }

    // Predicted score is the percentage of questions that the student predicted they would get correct (in the pre-quiz confidence assessment)
    let predictedCount = 0;
    // Calculate predicted count, based on entire quiz or specific concept
    if (concept !== null) {
        const conceptConfidence = quizAttempt.conceptConfidences.find(c => c.concept === concept);
        if (conceptConfidence === undefined) { return 0; }
        predictedCount += conceptConfidence.confidence;
    } else {
        quizAttempt.conceptConfidences.forEach(c => predictedCount += c.confidence);
    }

    return (predictedCount / questionCount);
}

// Calculate wadayano score for a given quiz attempt (optionally for a specific concept, for which quizAttempt.questionAttempts[i].question.concept must be included)
// Returns a float ranging from 0 to 1
export function wadayanoScore(quizAttempt, concept = null) {
    if (!quizAttempt || !quizAttempt.questionAttempts || quizAttempt.questionAttempts.length === 0) { 
        return 0;
    }

    const questionAttempts = filterByConcept(quizAttempt, concept);

    // Avoid divide by zero
    const questionCount = questionAttempts.length;
    if (questionCount === 0) { return 0; }

    // wadayano score is the percentage of questions where the student accurately assessed their confidence (confident and correct are either both true, or both false)
    const accurateConfidenceCount = questionAttempts.filter(q => q.isConfident === q.isCorrect).length;

    return (accurateConfidenceCount / questionCount);
}

// Analyze a student’s confidence for a given quiz attempt (optionally for a specific concept, for which quizAttempt.questionAttempts[i].question.concept must be included)
// Returns an object: { text: "Accurate", key: "ACCURATE" }
export function confidenceAnalysis(quizAttempt, concept = null){

    const questionAttempts = filterByConcept(quizAttempt, concept);

    let overConfidentCount = 0;
    let underConfidentCount = 0;

    for (let i = 0; i < questionAttempts.length; i++) {
        let { isConfident, isCorrect } = questionAttempts[i];
        // Count if the student was under- or overconfident on this question
        if ((!isConfident) && isCorrect) {
            underConfidentCount++;
        } else if (isConfident && (!isCorrect)) {
            overConfidentCount++;
        }
    }

    // Get the overall wadayano score for the quiz or concept
    let wadayano = wadayanoScore(quizAttempt, concept);

    // wadayanoScore() returns a float in range 0-1
    if (wadayano > 0.9) {
        // Accurate if wadayano score > 90%
        return CONFIDENCES.ACCURATE;
    } else if (overConfidentCount === underConfidentCount) {
        // Mixed if student was equally under- and overconfident
        return CONFIDENCES.MIXED;
    } else if (overConfidentCount > underConfidentCount) {
        // Overconfident if more over- than underconfident
        return CONFIDENCES.OVERCONFIDENT;
    } else {
        // Otherwise underconfident
        return CONFIDENCES.UNDERCONFIDENT;
    }
}

// Returns -1, 0, or 1 based on the values of strings a and b
// For use in sorting comparison functions (a compare function for Array.sort() needs numerical, not boolean, values)
export function stringCompare(a, b, caseSensitive = false) {
    if (!caseSensitive) {
        a = a.toLowerCase();
        b = b.toLowerCase();
    }
    return (a < b ? -1 : (a > b ? 1 : 0))
}

// The following helper functions are from https://codereview.stackexchange.com/a/150016
// Creates a random number generator function.
export function createRandomGenerator(seed) {
    const a = 5486230734;  // some big numbers
    const b = 6908969830; 
    const m = 9853205067;
    var x = seed;
    // returns a random value 0 <= num < 1
    return function(seed = x){  // seed is optional. If supplied sets a new seed
        x = (seed  * a + b) % m;
        return x / m;
    }
}

// Creates a 32bit hash of a string    
export function stringTo32BitHash(str) {
    var v = 0;
    for(var i = 0; i < str.length; i += 1){
        v += str.charCodeAt(i) << (i % 24);
    }
    return v % 0xFFFFFFFF;
}
// Shuffle array using the given seed (to shuffle the same way every time for a given seed)
export function shuffleArray(seed, arr) {
    var rArr = [];
    var random = createRandomGenerator(stringTo32BitHash(seed));        
    while(arr.length > 1) {
        rArr.push(arr.splice(Math.floor(random() * arr.length), 1)[0]);
    }
    rArr.push(arr[0]);
    return rArr;
}
