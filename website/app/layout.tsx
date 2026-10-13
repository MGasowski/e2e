import type { Metadata, Viewport } from "next";
import { Analytics } from "@/components/analytics";
import { fontVariables } from "@/lib/fonts";
import { siteUrl } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: siteUrl,
};

export const viewport: Viewport = {
  maximumScale: 5,
};

/**
 * Applies the docs theme before the first paint: `localStorage.theme` is
 * `light`, `dark`, or `system` (the default, which follows the OS).
 */
const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);var e=document.documentElement;e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light"}catch(_){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fontVariables} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
