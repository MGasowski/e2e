import type { Metadata } from "next";
import { GithubLink } from "@/components/docs/github-link";
import { DocsShell } from "@/components/docs/shell";
import { navigation, promo } from "@/lib/docs/navigation";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/docs/source";
import "./docs.css";

export const metadata: Metadata = {
  title: { default: SITE_NAME, template: `%s - ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  icons: {
    icon: [
      { url: "/docs/favicon-black.png", media: "(prefers-color-scheme: light)" },
      { url: "/docs/favicon-white.png", media: "(prefers-color-scheme: dark)" },
    ],
  },
  alternates: { types: { "text/plain": "/docs/llms.txt" } },
};

export default function DocsLayout({ children }: LayoutProps<"/docs">) {
  return (
    <DocsShell nav={navigation()} promo={promo()} github={<GithubLink />}>
      {children}
    </DocsShell>
  );
}
