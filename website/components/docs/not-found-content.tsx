import Link from "next/link";

export function NotFoundContent() {
  return (
    <div className="docs-not-found">
      <p className="docs-not-found-code">404</p>
      <h1 className="docs-title">Page not found</h1>
      <p className="docs-description">This page moved or never existed. Search the docs, or start from the introduction.</p>
      <Link href="/docs" className="docs-button">
        Back to the docs
      </Link>
    </div>
  );
}
