import type { Metadata } from "next";
import { NotFoundContent } from "@/components/docs/not-found-content";
import { DocsShell } from "@/components/docs/shell";
import { navigation, promo } from "@/lib/docs/navigation";
import "./docs/docs.css";

export const metadata: Metadata = { title: "Page not found - e2e", robots: { index: false } };

/** Every unknown path, docs or not (`proxy.ts` sends unknown docs paths here), inside the docs frame. */
export default function NotFound() {
  return (
    <DocsShell nav={navigation()} promo={promo()}>
      <NotFoundContent />
    </DocsShell>
  );
}
