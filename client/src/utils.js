// Score format of 33.3%
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