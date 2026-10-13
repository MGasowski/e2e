import { llmsIndex, originOf } from "@/lib/docs/feeds";

/** Every docs page with its markdown URL, for agents (https://llmstxt.org). */
export async function GET(request: Request) {
  return new Response(await llmsIndex(originOf(request)), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=300, s-maxage=300" },
  });
}
