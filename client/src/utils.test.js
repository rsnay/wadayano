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
