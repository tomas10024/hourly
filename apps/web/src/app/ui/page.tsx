import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Showcase } from "./showcase";

export const metadata: Metadata = { title: "Dizaino sistema" };

/**
 * Every UI component in every state on one page - for building the screens
 * and for the lab defence ("where is the animation, the breakpoint, the
 * SVG?"). Development only; production answers 404.
 */
export default function UiPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Showcase />;
}
