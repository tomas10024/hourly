/**
 * Minimal CSV serializer following RFC 4180.
 *
 * Written by hand rather than pulled in as a dependency: the whole format is
 * one escaping rule and one line separator, and a report is the only thing in
 * this project that needs it.
 */

/**
 * Excel on Windows assumes the system code page unless a file starts with a
 * byte order mark, which would turn "Užsakymų sąrašas" into mojibake. Prepend
 * this to the body when sending a downloadable file.
 */
export const UTF8_BOM = '﻿';

/**
 * A field is quoted only when it has to be: if it contains the delimiter, a
 * quote or a line break. Quotes inside a quoted field are doubled.
 */
export function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/** RFC 4180 specifies CRLF between records. */
export function toCsv(rows: readonly (readonly string[])[]): string {
  return rows.map((row) => row.map(csvField).join(',')).join('\r\n');
}

/** Money and hours in the report are written with two decimals and a dot. */
export function csvNumber(value: number | null, decimals = 2): string {
  return value === null ? '' : value.toFixed(decimals);
}
