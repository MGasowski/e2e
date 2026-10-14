import type { Metadata, Viewport } from "next";
import { E2eSessionDetailPage } from "@/components/landing/e2e/sessions/session-detail-page";
import { INTRO_SESSION } from "@/components/landing/e2e/sessions/sessions-data";

const TITLE = `${INTRO_SESSION.title} · e2e live session`;
const DESCRIPTION = INTRO_SESSION.summary;
const CANONICAL = `https://tester.army${INTRO_SESSION.path}`;
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
  return <E2eSessionDetailPage />;
}
