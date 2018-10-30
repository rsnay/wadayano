// Format a 0–1 float score to 33.3%
export function formatScore(score) {
    return `${Math.round(score * 1000) / 10}%`;
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

// Calculate wadayano score for a given quiz attempt
// Returns a float ranging from 0 to 1
export function wadayanoScore(quizAttempt) {
    if (!quizAttempt || !quizAttempt.questionAttempts || quizAttempt.questionAttempts.length === 0) { 
        return 0;
    }
    const questionCount = quizAttempt.questionAttempts.length;
    // wadayano score is the percentage of questions where the student accurately assessed their confidence (confident and correct are either both true, or both false)
    const accurateConfidenceCount = quizAttempt.questionAttempts.filter(q => q.isConfident === q.isCorrect).length;

    return (accurateConfidenceCount / questionCount);
}

// Analyze a student’s confidence for a given quiz attempt
// Returns an object: { text: "Accurate", emoji: "🧘" }
export function confidenceAnalysis(quizAttempt){
    var quizConfidenceText;
    var quizConfidenceEmoji;
    var quizOverC = 0;
    var quizUnderC = 0;
    for(var i = 0; i < quizAttempt.questionAttempts.length; i++){
        var correct = 0;
        var confident = 0;
        var compare = 0;
        if(quizAttempt.questionAttempts[i].isConfident){
            confident = 1;
        }
        if(quizAttempt.questionAttempts[i].isCorrect){
            correct = 1;
        }
        compare = confident - correct;
        switch(compare){
            case -1:
                quizUnderC += 1;
                break;
            case 0:
                break;
            case 1:
            quizOverC += 1;
                break;
        } 
    }

    let wadayano = wadayanoScore(quizAttempt);

    // wadayanoScore() returns a float in range 0-1
    if(wadayano > 0.9){
        quizConfidenceText = "Accurate";
        quizConfidenceEmoji = "🧘";
    } else if(quizOverC === quizUnderC){
        quizConfidenceText = "Mixed";
        quizConfidenceEmoji = "🤷‍";
    } else if(quizOverC > quizUnderC){
        quizConfidenceText = "Overconfident";
        quizConfidenceEmoji = "🤦‍";
    } else {
        quizConfidenceText = "Underconfident";
        quizConfidenceEmoji = "🙍‍";
    }
    return { text: quizConfidenceText, emoji: quizConfidenceEmoji };
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