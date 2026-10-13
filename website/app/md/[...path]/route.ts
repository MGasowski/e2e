import { cachedPageMarkdown, originOf } from "@/lib/docs/feeds";
import { markdownSource } from "@/lib/docs/markdown";
import { landingMarkdown } from "@/lib/landing-markdown";

const headers = {
  "Content-Type": "text/markdown; charset=utf-8",
  Vary: "Accept, User-Agent",
  "Cache-Control": "public, max-age=300, s-maxage=300",
};

/**
 * The markdown twins of the pages, which `proxy.ts` rewrites here:
 * `/e2e.md` arrives as `/md/e2e`, `/docs/quickstart.md` as `/md/docs/quickstart`.
 */
export async function GET(request: Request, { params }: RouteContext<"/md/[...path]">) {
  const { path } = await params;
  if (path.length === 1 && path[0] === "e2e") return new Response(landingMarkdown(), { headers });
  if (path[0] === "docs" && path.length > 1) {
    const page = markdownSource(path.slice(1).join("/"));
    if (page) return new Response(await cachedPageMarkdown(page.source, originOf(request)), { headers });
  }
  return new Response("Not found\n", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
