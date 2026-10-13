import { originOf, sitemap } from "@/lib/docs/feeds";

export async function GET(request: Request) {
  return new Response(await sitemap(originOf(request)), {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300, s-maxage=300" },
  });
}
