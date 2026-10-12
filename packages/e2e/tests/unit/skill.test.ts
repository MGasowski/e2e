import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BUNDLED_SKILLS, readBundledSkills, readGuide, skillTopics } from '../../src/cli/skill.ts';

const packageJson = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
  files: string[];
};

/** One bundled skill's files by name; every bundled skill is present in the repository. */
function filesOf(name: (typeof BUNDLED_SKILLS)[number]): ReturnType<typeof readBundledSkills>[number]['files'] {
  return readBundledSkills().find((skill) => skill.name === name)?.files ?? [];
}

describe('the bundled agent skills', () => {
  it('each start with a SKILL.md whose frontmatter names the skill after its directory', () => {
    expect(readBundledSkills().map((skill) => skill.name)).toEqual([...BUNDLED_SKILLS]);
    for (const { name, files } of readBundledSkills()) {
      const [skill] = files;
      expect(skill?.relative, name).toBe('SKILL.md');
      expect(skill?.content, name).toMatch(new RegExp(`^---\\nname: ${name}\\ndescription: .+\\n---\\n`));
      const description = /^description: (.+)$/m.exec(skill?.content ?? '')?.[1] ?? '';
      expect(description.length, name).toBeLessThanOrEqual(1024);
      expect(description, name).not.toContain(': ');
    }
    expect(filesOf('e2e-mcp').map((file) => file.relative)).toEqual(['SKILL.md']);
    expect(filesOf('e2e-bug-bash').map((file) => file.relative)).toEqual(['SKILL.md']);
  });

  it('offers a topic per reference file and per sibling skill, and links every topic from SKILL.md', () => {
    const topics = skillTopics();
    expect(topics).toEqual(['agent', 'bug-bash', 'debugging', 'explore', 'mcp', 'running', 'setup', 'writing-tests']);
    const overview = readGuide(undefined) ?? '';
    const references = [...overview.matchAll(/\[references\/([a-z-]+)\.md\]\(references\/\1\.md\)/g)].map((match) => match[1]);
    // A sibling may be installed without this skill, and this one without it, so no relative link between them.
    const siblings = [...overview.matchAll(/The `e2e-([a-z-]+)` skill, or `npx e2e guide \1`/g)].map((match) => match[1]);
    expect(overview).not.toContain('../');
    expect([...references, ...siblings].toSorted()).toEqual([...topics]);
    for (const topic of topics) expect(overview).toContain(`| \`${topic}\` |`);
  });

  it('prints the overview and each sibling skill without frontmatter, and each reference verbatim', () => {
    const overview = readGuide(undefined) ?? '';
    expect(overview.startsWith('# e2e')).toBe(true);
    expect(overview).not.toContain('\n---\n');
    expect(overview).toContain('npx e2e guide <topic>');
    for (const topic of skillTopics()) {
      const text = readGuide(topic) ?? '';
      expect(text.startsWith('# '), topic).toBe(true);
      const reference = filesOf('e2e').find((file) => file.relative === `references/${topic}.md`);
      const sibling = readBundledSkills().find((skill) => skill.name === `e2e-${topic}`)?.files[0];
      expect(reference?.content ?? sibling?.content.replace(/^---\n[\s\S]*?\n---\n+/, ''), topic).toBe(text);
    }
    expect(readGuide('nope')).toBeUndefined();
    expect(readGuide('../SKILL')).toBeUndefined();
    expect(readGuide('../e2e-mcp/SKILL')).toBeUndefined();
  });

  it('runs the installed CLI as npx e2e, without --no-install or the scoped package name', () => {
    for (const { name, files } of readBundledSkills()) {
      for (const file of files) {
        expect(file.content, `${name}/${file.relative}`).not.toMatch(/--no-install/);
        expect(file.content, `${name}/${file.relative}`).not.toMatch(/npx @e2edev\/e2e (run|guide)\b/);
      }
    }
  });

  it('ships the docs pages in the published package through the build copy', () => {
    expect(packageJson.files).toContain('docs');
  });
});

/** Every `.md` and `.mdx` file under `dir`, relative to `root`, never descending into `node_modules`. */
function markdownFiles(root: URL, dir: string): string[] {
  return readdirSync(new URL(dir, root), { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : markdownFiles(root, `${path}/`);
    return /\.mdx?$/.test(entry.name) ? [path] : [];
  });
}

/** The skill sources and the docs pages, relative to the repository root, each with its text. */
function userFacingPages(): { file: string; text: string }[] {
  const root = new URL('../../../../', import.meta.url);
  return ['skills/', 'docs/']
    .flatMap((dir) => markdownFiles(root, dir))
    .map((file) => ({ file, text: readFileSync(new URL(file, root), 'utf8') }));
}

describe('the skill and the docs', () => {
  it('pass --artifacts only in a paragraph that says the flag is gone', () => {
    for (const { file, text } of userFacingPages()) {
      for (const paragraph of text.split(/\n\s*\n/).filter((block) => block.includes('--artifacts'))) {
        expect(paragraph, file).toMatch(/removed|gone/);
      }
    }
  });
});
