import type { Metadata } from "next";
import { Geist, Geist_Mono, Orbitron } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display face for the wordmark and screen headings (SIL Open Font License; self-hosted by next/font).
const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["500", "700", "900"],
});

export const metadata: Metadata = {
  title: "Voyage",
  description:
    "A playable story about NASA's abandoned Mars rovers — NASA Space Apps Challenge 2026, team AI'm not sure.",
  // AI acknowledgment in page metadata (Space Apps 2026 submission guide); details in CREDITS.md.
  other: {
    "ai-generated-content":
      "Pixel-art sprites: AI-generated (watermarked in-game). Narration voices: ElevenLabs (elevenlabs.io). Rover chat: Google Gemini. Code: AI-assisted (Claude). Real NASA photos are unaltered and credited.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
