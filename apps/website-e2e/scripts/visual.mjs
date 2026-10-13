#!/usr/bin/env node
// Runs the visual suite (`--tag visual`) where its baselines live: Linux.
// Stored screenshots are per OS and CI runs Linux, so only *-linux.png files
// are committed. On Linux this runs the suite in place; anywhere else it runs
// it in Playwright's Linux image and copies the screenshots back.
//
//   pnpm test:visual                       compare against the baselines
//   pnpm test:visual -u                    write new or changed baselines
//   pnpm test:visual tests/docs --target desktop
//
// E2E_LANDING_URL, E2E_DOCS_URL, and E2E_BYPASS_HEADER pass through to the
// container, and a loopback port they name is forwarded to the host, so a
// local build (E2E_LANDING_URL=http://127.0.0.1:4390/e2e) works unchanged.
// E2E_VISUAL_NATIVE=1 runs in place on any OS, writing that OS's
// screenshots, which are git-ignored scratch.
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(app, '../..');
const args = ['run', '--tag', 'visual', ...process.argv.slice(2)];
// Keep in step with playwright-core in packages/web/package.json.
const image = 'mcr.microsoft.com/playwright:v1.63.0-noble';

function exit(child) {
  child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 1)));
}

if (process.platform === 'linux' || process.env.E2E_VISUAL_NATIVE === '1') {
  exit(spawn(process.execPath, ['node_modules/e2e/dist/cli/bin.js', ...args], { cwd: app, stdio: 'inherit' }));
} else {
  if (spawnSync('docker', ['info'], { stdio: 'ignore' }).status !== 0) {
    console.error('The visual baselines are Linux screenshots; start Docker, or run on Linux.');
    process.exit(2);
  }
  mkdirSync(path.join(app, '.linux'), { recursive: true });
  const quoted = args.map((arg) => `'${arg.replaceAll("'", "'\\''")}'`).join(' ');
  // A site served on the host (a local build at http://127.0.0.1:4390) keeps
  // its URL inside the container: each loopback port is forwarded to the host,
  // since the runner allows plain HTTP to loopback hosts only.
  const hostPorts = [
    ...new Set(
      ['E2E_LANDING_URL', 'E2E_DOCS_URL'].flatMap((name) => {
        const raw = process.env[name];
        if (!raw) return [];
        const url = new URL(raw);
        if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return [];
        return [url.port || (url.protocol === 'https:' ? '443' : '80')];
      }),
    ),
  ];
  const forward = hostPorts.map(
    (port) =>
      `node -e "const net=require('net');net.createServer((c)=>{const s=net.connect(${port},'host.docker.internal');c.pipe(s).pipe(c);c.on('error',()=>s.destroy());s.on('error',()=>c.destroy())}).listen(${port})" &`,
  );
  // The container builds from a copy of the working tree, so uncommitted
  // changes count, and installs Linux binaries without touching the host's
  // node_modules. The pnpm store lives in a named volume between runs.
  const script = [
    'set -e',
    ...forward,
    'mkdir -p /work && tar -xf - -C /work && cd /work',
    'corepack enable >/dev/null',
    'pnpm install --frozen-lockfile --filter @e2e-dev/website-e2e... >/dev/null',
    'pnpm --filter e2e --filter @e2e-dev/web run build >/dev/null',
    'cd apps/website-e2e',
    'set +e',
    `node node_modules/e2e/dist/cli/bin.js ${quoted}`,
    'code=$?',
    // Bring back every Linux screenshot and this run's report and diffs.
    "find tests -name '*-linux.png' -path '*-snapshots/*' -exec cp --parents {} /out/ \\;",
    'rm -rf /out/.linux/.e2e && cp -r .e2e /out/.linux/.e2e 2>/dev/null',
    'exit $code',
  ].join('\n');
  const passthrough = ['E2E_LANDING_URL', 'E2E_DOCS_URL', 'E2E_BYPASS_HEADER'].flatMap((name) =>
    process.env[name] ? ['-e', name] : [],
  );
  const docker = spawn(
    'docker',
    [
      'run', '--rm', '-i', '--init', '--ipc=host',
      // CI runs x86_64; glyph rendering can differ on arm64, so emulate it on Apple silicon.
      '--platform', 'linux/amd64',
      // Docker Desktop resolves this name already; Linux hosts need it mapped.
      '--add-host', 'host.docker.internal:host-gateway',
      '-v', `${app}:/out`,
      '-v', 'e2e-website-e2e-pnpm-store-amd64:/root/.local/share/pnpm/store',
      ...passthrough,
      image, 'bash', '-c', script,
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  );
  const tar = spawn(
    'tar',
    [
      '-c', '-C', repo,
      '--exclude=node_modules', '--exclude=.git', '--exclude=dist', '--exclude=.e2e', '--exclude=.linux',
      '--exclude=.next', '--exclude=examples', '--exclude=docs/images', '--exclude=*.mp4',
      // Host screenshots stay home; the container writes its own.
      '--exclude=*-darwin.png', '--exclude=*-win32.png',
      '.',
    ],
    { stdio: ['ignore', 'pipe', 'inherit'], env: { ...process.env, COPYFILE_DISABLE: '1' } },
  );
  tar.stdout.pipe(docker.stdin);
  exit(docker);
}
