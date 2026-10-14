import localFont from "next/font/local";

const inter = localFont({
  src: "../public/fonts/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

const stackSansNotch = localFont({
  src: "../public/fonts/stack-sans-notch-latin-wght-normal.woff2",
  variable: "--font-stack-sans-notch",
  weight: "100 900",
  display: "swap",
});

const dmMono = localFont({
  src: [
    { path: "../public/fonts/dm-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/dm-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-dm-mono",
  display: "swap",
});

/** The docs' type, as on Mintlify (`fonts` in docs/docs.json, Geist Mono in docs/style.css). */
const geist = localFont({
  src: "../public/fonts/geist-latin-wght-normal.woff2",
  variable: "--font-geist",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "../public/fonts/geist-mono-latin-wght-normal.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

export const fontVariables = `${inter.variable} ${stackSansNotch.variable} ${dmMono.variable} ${geist.variable} ${geistMono.variable}`;
