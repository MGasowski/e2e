import type { Metadata, Viewport } from "next";
import { E2eLandingPage } from "@/components/landing/e2e/e2e-landing-page";
import { LANDING_CANONICAL } from "@/lib/site";

const TITLE = "e2e: The open source AI testing framework";
const DESCRIPTION = "Customizable TypeScript testing framework for web, mobile apps and more.";
const IMAGE = {
  url: "/e2e/og-image.png",
  width: 1200,
  height: 630,
  alt: "e2e by TesterArmy: The open source AI testing framework.",
};

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: LANDING_CANONICAL, types: { "text/markdown": "/e2e.md" } },
  openGraph: {
    type: "website",
    url: LANDING_CANONICAL,
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
};

export default function Page() {
  return <E2eLandingPage />;
}
