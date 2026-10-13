import { prefersReducedMotion } from "../media";
import { listenForBursts } from "./burst";
import { ParticleField } from "./particle-field";

const ARTWORK_SRC = "/e2e/firefly-bayer.png";
const INK = "rgb(17, 17, 17)";
/** The artwork is dithered on a 2x2 pixel grid; one cell = one square. */
const P = 2;
const CAPACITY = 90000;

type Artwork = {
  width: number;
  height: number;
  cols: number;
  palette: string[];
  cellColor: Uint8Array;
  stars: number[];
};

/**
 * Samples the bayer artwork, flipped so light waves sit at the bottom and
 * darkness above, into a palette-indexed grid and a sparse starfield: brighter
 * colors are kept more often, seeded so the field is identical on every load.
 */
function sampleArtwork(image: HTMLImageElement): Artwork | null {
  const W = image.naturalWidth;
  const H = image.naturalHeight;
  const off = document.createElement("canvas");
  off.width = W;
  off.height = H;
  const octx = off.getContext("2d");
  if (!octx) return null;
  octx.translate(W, H);
  octx.rotate(Math.PI);
  octx.drawImage(image, 0, 0);
  const src = octx.getImageData(0, 0, W, H).data;

  const cols = Math.ceil(W / P);
  const rows = Math.ceil(H / P);
  const keyToIdx = new Map<number, number>();
  const palette: string[] = [];
  const keepChance: number[] = [];
  const cellColor = new Uint8Array(cols * rows);
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const i = (Math.min(cy * P, H - 1) * W + Math.min(cx * P, W - 1)) * 4;
      const [r, g, b] = [src[i], src[i + 1], src[i + 2]];
      const key = (r << 16) | (g << 8) | b;
      let idx = keyToIdx.get(key);
      if (idx === undefined) {
        idx = palette.length;
        keyToIdx.set(key, idx);
        palette.push(`rgb(${r},${g},${b})`);
        const L = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const p = L * L * 1.05;
        keepChance.push(p < 0.06 ? 0 : Math.min(1, p));
      }
      cellColor[cy * cols + cx] = idx;
    }
  }

  let seed = 20260921;
  const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const stars: number[] = [];
  for (let c = 0; c < cols * rows; c++) {
    if (rand() < keepChance[cellColor[c]]) stars.push(c);
  }
  return { width: W, height: H, cols, palette, cellColor, stars };
}

/** Pre-renders the resting starfield; each frame only moving squares get patched over it. */
function renderRestingField({ width, height, cols, palette, cellColor, stars }: Artwork) {
  const field = document.createElement("canvas");
  field.width = width;
  field.height = height;
  const fctx = field.getContext("2d");
  if (!fctx) return null;
  fctx.fillStyle = INK;
  fctx.fillRect(0, 0, width, height);
  for (let k = 0; k < palette.length; k++) {
    fctx.fillStyle = palette[k];
    for (const c of stars) {
      if (cellColor[c] !== k) continue;
      fctx.fillRect((c % cols) * P, ((c / cols) | 0) * P, P, P);
    }
  }
  return field;
}

/**
 * Mounts the /e2e hero starfield on `canvas`, covering its parent. Physics run
 * in artwork-pixel space; the view scales it to cover the canvas. Returns a
 * dispose function.
 *
 * Rendering contract: per frame only displaced squares are patched (ink erase
 * snapped to whole device pixels, otherwise antialiasing leaves a ghost grid),
 * so everything self-heals pixel-perfectly when the cursor leaves.
 */
export function mountFireflyScene(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext("2d");
  const host = canvas.parentElement;
  if (!ctx || !host) return () => {};

  const lifetime = new AbortController();
  const { signal } = lifetime;
  let raf = 0;
  let observer: ResizeObserver | undefined;

  const start = (art: Artwork) => {
    const field = renderRestingField(art);
    if (!field) return;
    const { width: W, height: H, cols, palette, cellColor } = art;
    const particles = new ParticleField({
      cols,
      rows: Math.ceil(H / P),
      cellSize: P,
      homes: art.stars,
      capacity: CAPACITY,
      unit: 1,
      maxDisplacement: 48,
      radius: 100,
      blast: { radiusScale: 4.5, strength: 1600, jitter: 200 },
      rainPerSecond: 12,
    });

    let dpr = 1;
    let S = 1;
    let ox = 0;
    let oy = 0;
    const resize = () => {
      const rect = host.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      S = Math.max(canvas.width / W, canvas.height / H);
      ox = (canvas.width - W * S) / 2;
      oy = (canvas.height - H * S) / 2;
      particles.exitY = -oy / S - 4;
      particles.radius = (Math.max(55, Math.min(120, (canvas.width / dpr) * 0.065)) * dpr) / S;
      ctx.imageSmoothingEnabled = false;
    };
    resize();
    window.addEventListener("resize", resize, { signal });
    observer = new ResizeObserver(resize);
    observer.observe(host);

    const toField = (clientX: number, clientY: number): [number, number] => {
      const rect = canvas.getBoundingClientRect();
      return [((clientX - rect.left) * dpr - ox) / S, ((clientY - rect.top) * dpr - oy) / S];
    };
    window.addEventListener(
      "pointermove",
      (event) => particles.pointerMove(...toField(event.clientX, event.clientY), performance.now()),
      { passive: true, signal },
    );
    const pointerLeave = () => particles.pointerLeave();
    document.documentElement.addEventListener("mouseleave", pointerLeave, { signal });
    window.addEventListener("blur", pointerLeave, { signal });
    window.addEventListener(
      "pointerup",
      (event) => {
        if (event.pointerType !== "mouse") pointerLeave();
      },
      { signal },
    );
    listenForBursts(({ x, y }) => {
      if (!prefersReducedMotion()) particles.blast(...toField(x, y));
    }, signal);

    const ambient = !prefersReducedMotion();
    const byColor = palette.map(() => new Float32Array(CAPACITY * 2));
    const byColorN = new Int32Array(palette.length);
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      if (ambient) particles.rain(dt);
      particles.step(dt, now);

      ctx.drawImage(field, 0, 0, W, H, ox, oy, W * S, H * S);
      byColorN.fill(0);
      ctx.fillStyle = INK;
      particles.forEachDisplaced((c, x, y) => {
        const cx = c % cols;
        const cy = (c / cols) | 0;
        const x0 = Math.round(ox + cx * P * S);
        const y0 = Math.round(oy + cy * P * S);
        const x1 = Math.round(ox + (cx + 1) * P * S);
        const y1 = Math.round(oy + (cy + 1) * P * S);
        ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        const k = cellColor[c];
        const n = byColorN[k]++;
        byColor[k][n * 2] = x;
        byColor[k][n * 2 + 1] = y;
      });
      const cellS = P * S;
      for (let k = 0; k < palette.length; k++) {
        const n = byColorN[k];
        if (!n) continue;
        ctx.fillStyle = palette[k];
        const list = byColor[k];
        for (let j = 0; j < n; j++) {
          ctx.fillRect(
            ox + (list[j * 2] - P / 2) * S,
            oy + (list[j * 2 + 1] - P / 2) * S,
            cellS,
            cellS,
          );
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  };

  const image = new Image();
  image.src = ARTWORK_SRC;
  image
    .decode()
    .then(() => {
      if (signal.aborted) return;
      const art = sampleArtwork(image);
      if (art) start(art);
    })
    .catch(() => {});

  return () => {
    lifetime.abort();
    cancelAnimationFrame(raf);
    observer?.disconnect();
  };
}
