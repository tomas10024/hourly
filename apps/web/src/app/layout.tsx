import type { Metadata } from "next";
import { fontVariables } from "./fonts";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: { default: "Hourly", template: "%s · Hourly" },
  description:
    "Darbų aikštelė ir skaidri atliktų darbų laiko apskaita užsakovams bei specialistams.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="lt" className={`${fontVariables} h-full`}>
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
