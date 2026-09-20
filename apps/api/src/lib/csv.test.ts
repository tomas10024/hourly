import { describe, expect, it } from 'vitest';
import { UTF8_BOM, csvField, csvNumber, toCsv } from './csv.js';

describe('csvField', () => {
  it('leaves an ordinary value alone', () => {
    expect(csvField('Meniu redagavimas')).toBe('Meniu redagavimas');
  });

  it('quotes a value containing the delimiter', () => {
    expect(csvField('Maketas, antra versija')).toBe('"Maketas, antra versija"');
  });

  it('doubles quotes inside a quoted value', () => {
    expect(csvField('Kirpykla "Ramune"')).toBe('"Kirpykla ""Ramune"""');
  });

  it('quotes a value containing a line break', () => {
    expect(csvField('Pirma\neilute')).toBe('"Pirma\neilute"');
  });
});

describe('toCsv', () => {
  it('joins rows with CRLF, as RFC 4180 requires', () => {
    expect(toCsv([['a', 'b'], ['c', 'd']])).toBe('a,b\r\nc,d');
  });

  it('keeps an empty row as an empty line', () => {
    expect(toCsv([['a'], [], ['b']])).toBe('a\r\n\r\nb');
  });

  it('escapes while joining', () => {
    expect(toCsv([['Task, one', '2']])).toBe('"Task, one",2');
  });
});

describe('csvNumber', () => {
  it('writes money with two decimals', () => {
    expect(csvNumber(8.3)).toBe('8.30');
    expect(csvNumber(210)).toBe('210.00');
  });

  it('writes nothing for a missing value', () => {
    expect(csvNumber(null)).toBe('');
  });
});

describe('UTF8_BOM', () => {
  it('is a single byte order mark, so Excel reads Lithuanian letters', () => {
    expect(UTF8_BOM).toBe('﻿');
    expect(UTF8_BOM).toHaveLength(1);
  });
});
