import { formatScore, stripTags, filterByConcept } from './utils';

describe('formatScore', () => {
  test('properly formats valid input', () => {
    expect(formatScore(0, 1)).toBe('0%');
    expect(formatScore(1, 1)).toBe('100%');
    expect(formatScore(2, 1)).toBe('200%');
    expect(formatScore(1 / 4, 1)).toBe('25%');
    expect(formatScore(-0.7, 1)).toBe('-70%');
  });
  test('returns correct number of mantissa digits', () => {
    expect(formatScore(1 / 3, 0)).toBe('33%');
    expect(formatScore(1 / 3, 1)).toBe('33.3%');
    expect(formatScore(1 / 3, 2)).toBe('33.33%');
    expect(formatScore(1 / 3, 3)).toBe('33.333%');
  });
  test('returns 0% for invalid input', () => {
    expect(formatScore(NaN, 1)).toBe('0%');
    expect(formatScore('bogus', 1)).toBe('0%');
    expect(formatScore({ score: 1 }, 1)).toBe('0%');
  });
});

describe('stripTags', () => {
  test('does not modify input with no tags', () => {
    const html = 'Some text with no tags, but a < and >.';
    expect(stripTags(html)).toBe(html);
  });
  test('removes valid tags', () => {
    const html = '<b>Some <u>text</u></b>';
    const expected = 'Some text';
    expect(stripTags(html)).toBe(expected);
  });
  test('removes invalid tags', () => {
    const html = '<b>Unclosed tag';
    const expected = 'Unclosed tag';
    expect(stripTags(html)).toBe(expected);
  });
});

describe('filterByConcept', () => {
  const quizAttempt = {
    questionAttempts: [
      {
        id: 'qa1',
        isCorrect: true,
        isConfident: false,
        question: { id: 'q1', concept: 'c1' },
      },
      {
        id: 'qa2',
        isCorrect: false,
        isConfident: false,
        question: { id: 'q2', concept: 'c1' },
      },
      {
        id: 'qa3',
        isCorrect: true,
        isConfident: true,
        question: { id: 'q3', concept: 'c2' },
      },
    ],
  };
  test('filters properly by concept that is in quiz', () => {
    const result1 = filterByConcept(quizAttempt, 'c1');
    expect(result1).toContain(quizAttempt.questionAttempts[0]);
    expect(result1).toContain(quizAttempt.questionAttempts[1]);
    expect(result1).not.toContain(quizAttempt.questionAttempts[2]);

    const result2 = filterByConcept(quizAttempt, 'c2');
    expect(result2).not.toContain(quizAttempt.questionAttempts[0]);
    expect(result2).not.toContain(quizAttempt.questionAttempts[1]);
    expect(result2).toContain(quizAttempt.questionAttempts[2]);
  });
  test('returns empty array for concept not in quiz', () => {
    const result = filterByConcept(quizAttempt, 'other concept');
    expect(result).toHaveLength(0);
  });
  test('returns all question attempts if concept is null', () => {
    const result = filterByConcept(quizAttempt, null);
    expect(result).toHaveLength(3);
    expect(result).toContain(quizAttempt.questionAttempts[0]);
    expect(result).toContain(quizAttempt.questionAttempts[1]);
    expect(result).toContain(quizAttempt.questionAttempts[2]);
  });
});
