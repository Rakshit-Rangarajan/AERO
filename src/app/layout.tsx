import type { Metadata } from "next";
import "./globals.css";
import "./agents-chat.css";

export const metadata: Metadata = {
  title: "AERO — Engineering Operations",
  description: "Engineering work, knowledge, and agent activity in one control room.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
