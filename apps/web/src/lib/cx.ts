/** Joins class names, skipping the falsy ones: `cx("btn", active && "on")`. */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
