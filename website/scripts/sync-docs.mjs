#!/usr/bin/env node
// Brings what the site serves from `docs/` into place before `next dev` and
// `next build` (both run it as their `pre` script). The pages themselves are
// read from `docs/` at build time; this covers the parts that cannot be:
// - `docs/images`, the logos, and the favicons go to `public/docs/`, the paths
//   the pages use under `/docs`;
// - each `docs/snippets/*.jsx` component becomes a client component in
//   `components/docs/snippets/`. Mintlify runs the snippets with React and its
//   own components as globals; the copies import them instead.
// - `lib/docs/paths.generated.json` lists every page path, so `proxy.ts` can
//   answer an unknown one with a 404 status before rendering starts.
// The outputs are gitignored, so `docs/` stays the one source.
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docs = path.resolve(site, '../docs');

const publicDocs = path.join(site, 'public/docs');
rmSync(publicDocs, { recursive: true, force: true });
mkdirSync(publicDocs, { recursive: true });
cpSync(path.join(docs, 'images'), path.join(publicDocs, 'images'), {
  recursive: true,
  filter: (source) => !source.endsWith('.md'),
});
for (const file of ['logo-black.png', 'logo-white.png', 'favicon-black.png', 'favicon-white.png']) {
  cpSync(path.join(docs, file), path.join(publicDocs, file));
}

const snippetsOut = path.join(site, 'components/docs/snippets');
rmSync(snippetsOut, { recursive: true, force: true });
mkdirSync(snippetsOut, { recursive: true });
const snippets = readdirSync(path.join(docs, 'snippets')).filter((file) => file.endsWith('.jsx'));
for (const file of snippets) {
  const source = readFileSync(path.join(docs, 'snippets', file), 'utf8')
    // Mintlify's image zoom opt-out; React would warn about the unknown attribute.
    .replaceAll(' noZoom', '');
  writeFileSync(
    path.join(snippetsOut, file),
    `"use client";
// Generated from docs/snippets/${file} by scripts/sync-docs.mjs; edit the original.
import React, { useEffect, useRef, useState } from "react";
import { CodeBlock } from "../snippet-globals";

${source}`,
  );
}
const { navigation } = JSON.parse(readFileSync(path.join(docs, 'docs.json'), 'utf8'));
const paths = navigation.tabs
  .flatMap((tab) => (tab.groups ?? [{ pages: tab.pages }]).flatMap((group) => group.pages))
  .map((source) => (source === 'index' ? '/docs' : `/docs/${source.replace(/\/index$/, '')}`));
writeFileSync(path.join(site, 'lib/docs/paths.generated.json'), `${JSON.stringify(paths, null, 2)}\n`);

console.log(`synced docs assets and ${snippets.length} snippets`);
