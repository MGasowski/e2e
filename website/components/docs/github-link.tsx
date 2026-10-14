import { StarIcon } from "lucide-react";
import { Suspense } from "react";
import { GithubIcon } from "@/components/icons/github-icon";
import { E2E_GITHUB_REPO, E2E_GITHUB_URL } from "@/components/landing/e2e/links";
import { formatWholeNumber } from "@/lib/open-source/format";
import { getGithubRepoStars } from "@/lib/open-source/stars";

/** The navbar's GitHub link with the star count, as Mintlify's `navbar.primary` GitHub button shows it. */
export function GithubLink() {
  return (
    <Suspense fallback={<GithubStars stars={null} />}>
      <LiveGithubStars />
    </Suspense>
  );
}

async function LiveGithubStars() {
  return <GithubStars stars={await getGithubRepoStars(E2E_GITHUB_REPO)} />;
}

function GithubStars({ stars }: { stars: number | null }) {
  return (
    <a href={E2E_GITHUB_URL} target="_blank" rel="noreferrer" className="docs-github-link">
      <GithubIcon aria-hidden="true" className="size-4" />
      <span>GitHub</span>
      {stars !== null && (
        <span className="docs-github-stars" data-github-stars="">
          <StarIcon aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
          {formatWholeNumber(stars)}
        </span>
      )}
    </a>
  );
}
