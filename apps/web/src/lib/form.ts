/*
 * Small helpers for forms built from native inputs. Values are kept as the
 * strings the inputs hold and converted once, on submit.
 */

/** `""` -> null, `"12,5"` or `"12.5"` -> 12.5; anything unreadable -> NaN (caught by validation). */
export function toNumber(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  return trimmed === "" ? null : Number(trimmed);
}

/** `""` -> null, otherwise the trimmed text. */
export function toText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** A money amount the API accepts: 0 to 99 999 999.99 with at most two decimals. */
export function moneyError(value: number | null, required = false): string | undefined {
  if (value === null) return required ? "Įveskite sumą." : undefined;
  if (!Number.isFinite(value) || value < 0) return "Įveskite teigiamą skaičių.";
  if (value > 99_999_999.99) return "Per didelė suma.";
  if (Math.round(value * 100) !== value * 100) return "Ne daugiau kaip du skaitmenys po kablelio.";
  return undefined;
}

/** `YYYY-MM-DD` from a date input -> ISO at local midnight; empty -> null. */
export function dateInputToIso(value: string): string | null {
  return value ? new Date(`${value}T00:00:00`).toISOString() : null;
}

/** ISO -> `YYYY-MM-DD` for a date input, in the browser's time zone. */
export function isoToDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
