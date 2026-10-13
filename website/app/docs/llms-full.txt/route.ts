import { llmsFull, originOf } from "@/lib/docs/feeds";

/** Every docs page in full, as markdown, in navigation order. */
export async function GET(request: Request) {
  return new Response(await llmsFull(originOf(request)), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=300, s-maxage=300" },
  });
}
