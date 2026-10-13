import { searchIndex } from "@/lib/docs/feeds";

/** The search dialog's index, fetched the first time it opens. */
export async function GET() {
  return Response.json(await searchIndex(), {
    headers: { "Cache-Control": "public, max-age=300, s-maxage=300" },
  });
}
