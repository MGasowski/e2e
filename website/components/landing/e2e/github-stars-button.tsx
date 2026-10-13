import { StarIcon } from "lucide-react";
import { Suspense } from "react";
import { GithubIcon } from "@/components/icons/github-icon";
import { formatCompactNumber, formatWholeNumber } from "@/lib/open-source/format";
import { getGithubRepoStars } from "@/lib/open-source/stars";
import { cn } from "@/lib/utils";
import { E2E_GITHUB_REPO, E2E_GITHUB_URL } from "./links";
import { E2E_OUTLINE_BUTTON } from "./outline-button";

export function GithubStarsButton() {
  return (
    <Suspense fallback={<GithubStarsLink stars={null} />}>
      <LiveGithubStarsLink />
    </Suspense>
  );
}

async function LiveGithubStarsLink() {
  return <GithubStarsLink stars={await getGithubRepoStars(E2E_GITHUB_REPO)} />;
}

function GithubStarsLink({ stars }: { stars: number | null }) {
  return (
    <a
      href={E2E_GITHUB_URL}
      target="_blank"
      rel="noreferrer"
      aria-label={
        stars === null ? "e2e on GitHub" : `e2e on GitHub, ${formatWholeNumber(stars)} stars`
      }
      className={cn(E2E_OUTLINE_BUTTON, "flex h-9 items-center whitespace-nowrap text-sm")}
    >
      <span className="flex items-center gap-2 px-3">
        <GithubIcon aria-hidden="true" className="size-4" />
        <span className="hidden sm:inline">GitHub</span>
      </span>
      {stars !== null && (
        <span className="flex h-full items-center gap-1.5 border-l-[0.5px] border-white/50 px-3 tabular-nums">
          <StarIcon aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
          {formatCompactNumber(stars)}
        </span>
      )}
    </a>
  );
}
