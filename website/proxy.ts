import { type NextRequest, NextResponse } from "next/server";
import docsPaths from "./lib/docs/paths.generated.json";

const DOCS_PATHS = new Set<string>(docsPaths);

/**
 * Markdown for agents. Every page has a markdown twin at its path plus `.md`
 * (`/docs/quickstart.md`, `/docs/index.md` for the docs home, `/e2e.md`),
 * served by `app/md/[...path]/route.ts`. A request for the page itself gets
 * the twin too when its Accept header prefers markdown over HTML, or when it
 * comes from a known AI fetcher, whose fetch tools ask for HTML.
 */

/** AI crawlers and fetchers that get the markdown twin whatever their Accept header. */
const AI_FETCHERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Bytespider",
].map((name) => name.toLowerCase());

/** The highest q-value the Accept header gives a media type, 0 when it does not accept it. */
function acceptQuality(accept: string, mediaType: string) {
  const [type, subtype] = mediaType.split("/");
  let best = 0;
  for (const raw of accept.split(",")) {
    const [candidate, ...params] = raw.trim().split(";");
    const [candType, candSubtype] = candidate.trim().toLowerCase().split("/");
    if (!((candType === type || candType === "*") && (candSubtype === subtype || candSubtype === "*"))) continue;
    let q = 1;
    for (const param of params) {
      const [name, value] = param.trim().split("=");
      if (name?.toLowerCase() === "q" && value !== undefined && !Number.isNaN(Number.parseFloat(value))) {
        q = Number.parseFloat(value);
      }
    }
    best = Math.max(best, q);
  }
  return best;
}

function wantsMarkdown(request: NextRequest) {
  const accept = request.headers.get("accept");
  if (accept) {
    const markdown = acceptQuality(accept, "text/markdown");
    if (markdown > 0 && markdown > acceptQuality(accept, "text/html")) return true;
  }
  const agent = request.headers.get("user-agent")?.toLowerCase() ?? "";
  return AI_FETCHERS.some((name) => agent.includes(name));
}

const markdownRoute = (pathname: string) => `/md${pathname === "/docs" ? "/docs/index" : pathname}`;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.endsWith(".md")) {
    return NextResponse.rewrite(new URL(markdownRoute(pathname.slice(0, -3)), request.url));
  }
  // Files under /docs (`llms.txt`, `sitemap.xml`, images) are not pages.
  const isPage = pathname === "/e2e" || pathname === "/docs" || (pathname.startsWith("/docs/") && !/\.\w+$/.test(pathname));
  if (!isPage) return NextResponse.next();
  // An unknown docs path goes to a route that does not exist, which renders
  // `app/not-found.tsx` with a 404 status. Left to the docs route, it would
  // stream the prerendered frame with a 200 before the page could say 404.
  const page = pathname.replace(/\/$/, "");
  if (page !== "/e2e" && !DOCS_PATHS.has(page)) {
    return NextResponse.rewrite(new URL("/_not-found-docs", request.url), { status: 404 });
  }
  const response = wantsMarkdown(request)
    ? NextResponse.rewrite(new URL(markdownRoute(pathname), request.url))
    : NextResponse.next();
  response.headers.set("Vary", "Accept, User-Agent");
  return response;
}

export const config = {
  // Pages and their `.md` twins; static files, images, and Next's own routes skip the proxy.
  matcher: ["/e2e", "/e2e.md", "/docs", "/docs/:path*"],
};
