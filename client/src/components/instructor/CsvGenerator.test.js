import CsvGenerator from './CsvGenerator';

describe('CsvGenerator', () => {
  it('quotes and escapes every field without truncating rows', () => {
    const generator = new CsvGenerator([
      ['Name', 'Answer'],
      ['Zoë, Student', 'She said "yes"'],
      ['Second student', 'Line one\nLine two'],
      ['Third student', null],
    ], 'results.csv', ',', true);

    expect(generator.getRawCsv()).toBe(
      '"Name","Answer"\n'
      + '"Zoë, Student","She said ""yes"""\n'
      + '"Second student","Line one\nLine two"\n'
      + '"Third student",""',
    );
  });

  it('leaves values unquoted when quoting is disabled', () => {
    const generator = new CsvGenerator([['one', 'two'], ['three', 'four']], 'results.csv');

    expect(generator.getRawCsv()).toBe('one,two\nthree,four');
  });
});
