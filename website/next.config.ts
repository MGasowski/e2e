import { readFileSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

const DISCORD_INVITE_URL = "https://discord.gg/2b2Y8apb8V";

/** Old docs paths from `docs/docs.json`, under `/docs`, for the pages and their markdown twins. */
function docsRedirects() {
  const { redirects } = JSON.parse(readFileSync(path.join(process.cwd(), "../docs/docs.json"), "utf8")) as {
    redirects: { source: string; destination: string }[];
  };
  const page = (to: string) => (to === "/" ? "/docs" : `/docs${to}`);
  return redirects.flatMap(({ source, destination }) => {
    const [pathname, hash] = destination.split("#", 2);
    const markdown = `${pathname === "/" ? "/docs/index" : `/docs${pathname}`}.md${hash ? `#${hash}` : ""}`;
    return [
      { source: `/docs${source}`, destination: page(destination), permanent: true },
      { source: `/docs${source}.md`, destination: markdown, permanent: true },
    ];
  });
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // The docs pages are read from ../docs, outside this app, when a markdown twin or `llms.txt` renders.
  outputFileTracingIncludes: {
    "/**": ["../docs/docs.json", "../docs/*.mdx", "../docs/{ci,integrations,migrate,reference}/*.mdx", "../docs/snippets/*.jsx"],
  },
  async redirects() {
    return [
      { source: "/", destination: "/docs", permanent: true },
      { source: "/discord", destination: DISCORD_INVITE_URL, permanent: false },
      ...docsRedirects(),
    ];
  },
  async headers() {
    return [
      {
        // Social cards are fetched cross-origin by link unfurlers.
        source: "/:path(e2e/og-image.png|docs/images/.*)",
        headers: [{ key: "Cross-Origin-Resource-Policy", value: "cross-origin" }],
      },
    ];
  },
};

export default nextConfig;
