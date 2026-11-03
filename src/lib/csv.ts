/** CSV helpers. Output is UTF-8 with BOM so Excel shows č, ć, ž, š, đ correctly. */
export const BOM = "﻿";

export function csvEscape(value: unknown, delimiter: string): string {
  const s = value === null || value === undefined ? "" : String(value);
  // neutralise spreadsheet formula injection
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return safe.includes(delimiter) || /["\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(headers: string[], rows: unknown[][], delimiter = ","): string {
  const lines = [headers, ...rows].map((r) => r.map((v) => csvEscape(v, delimiter)).join(delimiter));
  return BOM + lines.join("\r\n") + "\r\n";
}
