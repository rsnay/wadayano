// Score format of 33.3%
export function formatScore(score) {
    return `${Math.round(score * 1000) / 10}%`;
}