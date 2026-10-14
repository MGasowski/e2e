import type { Metadata, Viewport } from "next";
import { E2eSessionsPage } from "@/components/landing/e2e/sessions/sessions-page";
import { E2E_SESSIONS_PATH } from "@/components/landing/e2e/sessions/sessions-data";

const TITLE = "Sessions · e2e by TesterArmy";
const DESCRIPTION =
  "Live sessions and recordings on agentic testing, from the team building e2e. Join live and ask questions, or catch up on your own time.";
const CANONICAL = `https://tester.army${E2E_SESSIONS_PATH}`;
const IMAGE = {
  url: "/e2e/og-image.png",
  width: 1200,
  height: 630,
  alt: "e2e by TesterArmy: The open source AI testing framework.",
};

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL },
  openGraph: {
    type: "website",
    url: CANONICAL,
    siteName: "TesterArmy",
    title: TITLE,
    description: DESCRIPTION,
    images: [IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    site: "@TesterArmy",
    title: TITLE,
    description: DESCRIPTION,
    images: [IMAGE],
  },
  robots: { index: true, follow: true, googleBot: { "max-image-preview": "large" } },
  icons: {
    icon: [
      { url: "/e2e/favicon-black.png", media: "(prefers-color-scheme: light)" },
      { url: "/e2e/favicon-white.png", media: "(prefers-color-scheme: dark)" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "rgb(17, 17, 17)",
  maximumScale: 5,
};

export default function Page() {
  return <E2eSessionsPage />;
}
