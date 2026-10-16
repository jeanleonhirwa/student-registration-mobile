const toDate = (value: string | Date): Date =>
  value instanceof Date ? value : new Date(value.length === 10 ? `${value}T00:00:00` : value);

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return toDate(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = toDate(value);
  return `${formatDate(d)}, ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
}

/** "Due in 2 days", "Due in 3 hours", "Overdue by 1 day" … */
export function dueLabel(value: string): string {
  const diff = new Date(value).getTime() - Date.now();
  const abs = Math.abs(diff);
  const hours = Math.floor(abs / 3_600_000);
  const days = Math.floor(hours / 24);
  const text =
    days >= 1
      ? `${days} day${days === 1 ? '' : 's'}`
      : hours >= 1
        ? `${hours} hour${hours === 1 ? '' : 's'}`
        : `${Math.max(1, Math.floor(abs / 60_000))} min`;
  return diff >= 0 ? `Due in ${text}` : `Overdue by ${text}`;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Date → "YYYY-MM-DD HH:mm" in local time (the format used in forms). */
export function toInputString(value: string | Date): string {
  const d = toDate(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Parse "YYYY-MM-DD" or "YYYY-MM-DD HH:mm" (local time). Returns null when invalid. */
export function parseInputDate(text: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?$/.exec(text.trim());
  if (!m) return null;
  const [y, mo, d, h = '23', mi = '59'] = m.slice(1);
  const date = new Date(+y, +mo - 1, +d, +h, +mi);
  // Reject overflowed dates such as 2026-02-31
  return date.getMonth() === +mo - 1 && date.getDate() === +d ? date : null;
}
