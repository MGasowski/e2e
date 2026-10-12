/**
 * The bundled agent skills: `e2e` with one reference file per `e2e guide`
 * topic, and one sibling skill per job big enough to install on its own,
 * whose topic is its name without the `e2e-` prefix.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Every skill the package ships, the runner's own first; `e2e init` installs each. */
export const BUNDLED_SKILLS = ['e2e', 'e2e-mcp', 'e2e-bug-bash'] as const;

type SkillName = (typeof BUNDLED_SKILLS)[number];

/**
 * Files an earlier version of a skill shipped and this one does not. `e2e init`
 * removes them when it updates a copy, so a topic that became its own skill
 * leaves no stale duplicate behind.
 */
const RETIRED_FILES: { readonly [Name in SkillName]?: readonly string[] } = {
  e2e: ['references/mcp.md', 'references/bug-bash.md'],
};

/** Printed when a build or an install left the skill files out of the package. */
export const MISSING_SKILL_MESSAGE = 'this installation ships no skill files; reinstall e2e';

const TOPIC_PREFIX = 'references/';
const SIBLING_PREFIX = 'e2e-';

/**
 * The published package ships each skill at `<package>/skills/<name>`, copied
 * from the repository's `skills/<name>` by the build. That copy is tried first
 * so a user project's own `skills/` directory is never mistaken for it; inside
 * the repository the source directory is read directly, so nothing here needs
 * a build. Undefined only for a broken installation.
 */
function skillDirectory(name: SkillName): string | undefined {
  for (const candidate of [`../../skills/${name}/`, `../../../../skills/${name}/`]) {
    const dir = fileURLToPath(new URL(candidate, import.meta.url));
    if (existsSync(path.join(dir, 'SKILL.md'))) return dir;
  }
  return undefined;
}

export interface SkillFile {
  /** Path relative to the skill root with `/` separators. */
  readonly relative: string;
  readonly content: string;
}

export interface BundledSkill {
  readonly name: SkillName;
  /** Every file of the skill, `SKILL.md` first. */
  readonly files: readonly SkillFile[];
  /** Paths relative to the skill root, with `/` separators, of files earlier versions shipped. */
  readonly retired: readonly string[];
}

/** Every file of one skill, `SKILL.md` first, or none when the installation lacks it. */
function readSkillFiles(name: SkillName): readonly SkillFile[] {
  const root = skillDirectory(name);
  if (root === undefined) return [];
  const files: SkillFile[] = [];
  const walk = (dir: string): void => {
    const entries = readdirSync(dir, { withFileTypes: true }).toSorted((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else files.push({ relative: path.relative(root, absolute).split(path.sep).join('/'), content: readFileSync(absolute, 'utf8') });
    }
  };
  walk(root);
  return [...files.filter((file) => file.relative === 'SKILL.md'), ...files.filter((file) => file.relative !== 'SKILL.md')];
}

/** Every bundled skill with its files, or none when the installation lacks any of them. */
export function readBundledSkills(): readonly BundledSkill[] {
  const skills = BUNDLED_SKILLS.map((name) => ({ name, files: readSkillFiles(name), retired: RETIRED_FILES[name] ?? [] }));
  return skills.some((skill) => skill.files.length === 0) ? [] : skills;
}

/** A skill's `SKILL.md` without its frontmatter, as `e2e guide` prints it. */
function skillBody(files: readonly SkillFile[]): string | undefined {
  return files.find((file) => file.relative === 'SKILL.md')?.content.replace(/^---\n[\s\S]*?\n---\n+/, '');
}

/** Topics `e2e guide <topic>` accepts, sorted: one per `references/<topic>.md` of `e2e` and one per sibling skill. */
export function skillTopics(): readonly string[] {
  const references = readSkillFiles('e2e')
    .filter((file) => file.relative.startsWith(TOPIC_PREFIX) && file.relative.endsWith('.md'))
    .map((file) => file.relative.slice(TOPIC_PREFIX.length, -'.md'.length));
  const siblings = BUNDLED_SKILLS.filter((name) => name !== 'e2e' && skillDirectory(name) !== undefined)
    .map((name) => name.slice(SIBLING_PREFIX.length));
  return [...references, ...siblings].toSorted();
}

/**
 * The overview (the `e2e` skill without its frontmatter) or one topic's text:
 * a reference file verbatim, or a sibling skill without its frontmatter.
 * Undefined for an unknown topic.
 */
export function readGuide(topic: string | undefined): string | undefined {
  if (topic === undefined) return skillBody(readSkillFiles('e2e'));
  const reference = readSkillFiles('e2e').find((file) => file.relative === `${TOPIC_PREFIX}${topic}.md`);
  if (reference !== undefined) return reference.content;
  const sibling = BUNDLED_SKILLS.find((name) => name === `${SIBLING_PREFIX}${topic}`);
  return sibling === undefined ? undefined : skillBody(readSkillFiles(sibling));
}
