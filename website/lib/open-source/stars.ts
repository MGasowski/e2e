import { cacheLife } from "next/cache";

/**
 * The repository's stargazer count, or null when GitHub can't be reached.
 * Unauthenticated requests share a 60-per-hour limit per IP, so a
 * `GITHUB_TOKEN` raises it to 5,000 where one is set.
 */
export async function getGithubRepoStars(repo: string): Promise<number | null> {
  "use cache";
  cacheLife("hours");
  try {
    const token = process.env.GITHUB_TOKEN;
    const response = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: {
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { stargazers_count?: unknown };
    return typeof body.stargazers_count === "number" ? body.stargazers_count : null;
  } catch {
    return null;
  }
}
