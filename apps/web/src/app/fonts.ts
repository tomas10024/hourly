import { Geist_Mono, Inter, Instrument_Serif, Tiny5 } from "next/font/google";

/*
 * The four typefaces of the design system. `next/font` downloads them at build
 * time and serves them from our own domain, so the browser makes no request to
 * Google and the text does not jump when a font arrives. `latin-ext` carries
 * the Lithuanian letters (ąčęėįšųūž).
 *
 * Each font exposes a CSS variable; `globals.css` maps the variables onto the
 * Tailwind font tokens (`font-serif`, `font-sans`, `font-mono`, `font-pixel`).
 */

/** Headings (Resend). */
export const serif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-instrument-serif",
});

/** Running text, forms, tables. */
export const sans = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-inter",
});

/** Timer, amounts, identifiers, terminal-style messages. */
export const mono = Geist_Mono({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-geist-mono",
});

/**
 * Short pixel labels (Watch Dogs accent). Tiny5 rather than Silkscreen:
 * Silkscreen claims `latin-ext` but lacks Ą Č Ę Ė Į Ų Ū Ž (only Š is there),
 * so Lithuanian labels fell back to another font letter by letter.
 */
export const pixel = Tiny5({
  weight: "400",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-tiny5",
});

export const fontVariables = [serif, sans, mono, pixel].map((font) => font.variable).join(" ");
