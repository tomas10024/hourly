/*
 * Numbers, money, durations and dates the Lithuanian way, in one place:
 * `1 234,50 €`, `3 val. 15 min.`, `2026-10-05`. The API sends UTC timestamps
 * and plain numbers; everything the user reads passes through here.
 */

const money = new Intl.NumberFormat("lt-LT", { style: "currency", currency: "EUR" });
const number = new Intl.NumberFormat("lt-LT", { maximumFractionDigits: 1 });
const date = new Intl.DateTimeFormat("sv-SE", { year: "numeric", month: "2-digit", day: "2-digit" });
const time = new Intl.DateTimeFormat("lt-LT", { hour: "2-digit", minute: "2-digit" });

/** `1234.5` -> `1 234,50 €` */
export function formatMoney(amount: number | null | undefined): string {
  return amount == null ? "—" : money.format(amount);
}

/** A budget range: `1 200–2 000 €`, `nuo 1 200 €`, `iki 2 000 €`. */
export function formatBudget(min: number | null, max: number | null): string {
  const whole = (n: number) => `${Math.round(n).toLocaleString("lt-LT")}`;
  if (min != null && max != null) return `${whole(min)}–${whole(max)} €`;
  if (min != null) return `nuo ${whole(min)} €`;
  if (max != null) return `iki ${whole(max)} €`;
  return "—";
}

/** `9.5` -> `9,5 val.` */
export function formatHours(hours: number | null | undefined): string {
  return hours == null ? "—" : `${number.format(hours)} val.`;
}

/** Minutes of work: `195` -> `3 val. 15 min.`, `40` -> `40 min.` */
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null) return "—";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} min.`;
  if (m === 0) return `${h} val.`;
  return `${h} val. ${String(m).padStart(2, "0")} min.`;
}

/** Elapsed time on a running timer: `01:23:10`. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`;
}

/** An ISO timestamp as a local date: `2026-10-05`. */
export function formatDate(iso: string | null | undefined): string {
  return iso ? date.format(new Date(iso)) : "—";
}

/** An ISO timestamp as local date and time: `2026-10-05 14:30`. */
export function formatDateTime(iso: string | null | undefined): string {
  return iso ? `${date.format(new Date(iso))} ${time.format(new Date(iso))}` : "—";
}

/*
 * `<input type="datetime-local">` speaks local time without a zone
 * (`2026-10-05T14:30`); the API speaks UTC (`2026-10-05T11:30:00.000Z`).
 * These two functions are the only place where one becomes the other, so a
 * session entered at 14:30 in Vilnius is stored as 11:30 UTC, not 14:30 UTC.
 */

/** ISO (UTC) -> value for a `datetime-local` input, in the browser's zone. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Value of a `datetime-local` input (local time) -> ISO in UTC. */
export function fromLocalInput(value: string): string {
  return new Date(value).toISOString();
}

/** `Tomas Jankauskas` -> `TJ`; `UAB „Pavyzdys“` -> `UP`. */
export function initials(name: string): string {
  const words = name.replace(/[„“"]/g, "").trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2)).toUpperCase();
}

/** What a finished session is worth: rate × hours; null while it runs or has no rate. */
export function sessionAmount(session: { appliedRate: number | null; durationMinutes: number | null }): number | null {
  if (session.appliedRate == null || session.durationMinutes == null) return null;
  return Math.round(session.appliedRate * session.durationMinutes * (100 / 60)) / 100;
}
