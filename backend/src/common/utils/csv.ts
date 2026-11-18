/** RFC 4180 CSV with formula-injection protection for spreadsheet apps. */
export function toCsv(headers: string[], rows: unknown[][]): string {
  const cell = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    let s =
      v instanceof Date ? v.toISOString() : typeof v === 'object' ? JSON.stringify(v) : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}
