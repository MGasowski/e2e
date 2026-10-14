import { canvasBufferSize, reportCanvasFailure } from "../canvas-buffer";
import { prefersReducedMotion } from "../media";
import { listenForBursts } from "./burst";
import { ParticleField } from "./particle-field";

const CAPACITY = 40000;
/** Every dot shares one color; shading comes from dot density alone. */
const DOT_COLOR = "rgb(238, 238, 238)";
const FLICKER_COLOR = "rgb(255, 255, 255)";
/** 4x4 Bayer matrix for ordered dithering, row-major. */
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

type PortraitCloud = {
  cols: number;
  rows: number;
  cells: number[];
  /** Per-cell reveal threshold in [0, 1); lower materializes earlier. */
  revealAt: Float32Array;
};

export type PortraitSceneOptions = {
  /** Duration of the dot-by-dot materialize pass; 0 draws instantly. */
  revealMs: number;
  /** Cursor ripple after the reveal; the bar thumbnail renders static. */
  interactive: boolean;
  /** Extra zoom past cover-fit, so small hosts crop in on the face. */
  zoom?: number;
  /** Image-height fraction to center vertically when zoomed (0 = top). */
  focusY?: number;
};

/* Minimize/expand remounts the canvases, so the decoded photo and each
   sampled cloud are memoized: toggling must not refetch or resample. */
const imageCache = new Map<string, Promise<HTMLImageElement>>();
const cloudCache = new Map<string, PortraitCloud>();

function loadPortraitImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached) return cached;
  const image = new Image();
  image.decoding = "async";
  image.src = src;
  const loading = image.decode().then(() => image);
  loading.catch(() => imageCache.delete(src));
  imageCache.set(src, loading);
  return loading;
}

/**
 * Samples the host portrait as a halftone point cloud, one cell per device
 * pixel: ordered dithering renders the photo's luminance as dot density
 * without sampling noise, so the face stays crisp while every dot keeps the
 * same color. A gentle unsharp mask keeps the eyes and feature edges legible,
 * a small share of dots is displaced outward for a dust halo, and a very
 * sparse sprinkle keeps the dark background from reading as a hard cutout.
 */
function samplePortrait(
  image: HTMLImageElement,
  width: number,
  height: number,
  zoom: number,
  focusY: number,
): PortraitCloud | null {
  const raster = document.createElement("canvas");
  raster.width = width;
  raster.height = height;
  try {
    const rctx = raster.getContext("2d");
    if (!rctx) return null;
    // Tiny hosts (the bar thumbnail) have so few dots that every pixel must
    // carry information: they skip the smoothing pass, blur the unsharp base
    // less, and push edges and density harder than the card-size portrait.
    const detail = width < 200;
    // the photo passes through a half-size canvas so sampling reads smooth
    // luminance instead of the photo's own pixel noise
    const small = document.createElement("canvas");
    small.width = Math.max(1, Math.ceil(width / (detail ? 1 : 2)));
    small.height = Math.max(1, Math.ceil(height / (detail ? 1 : 2)));
    const sctx = small.getContext("2d");
    if (!sctx) return null;
    const scale =
      Math.max(small.width / image.naturalWidth, small.height / image.naturalHeight) * zoom;
    const dw = image.naturalWidth * scale;
    const dh = image.naturalHeight * scale;
    const dx = Math.min(0, Math.max(small.width - dw, (small.width - dw) / 2));
    const dy = Math.min(0, Math.max(small.height - dh, small.height / 2 - focusY * dh));
    sctx.drawImage(image, dx, dy, dw, dh);
    rctx.imageSmoothingEnabled = true;
    rctx.drawImage(small, 0, 0, width, height);
    const src = rctx.getImageData(0, 0, width, height).data;
    const tiny = document.createElement("canvas");
    tiny.width = Math.max(1, Math.ceil(width / (detail ? 8 : 12)));
    tiny.height = Math.max(1, Math.ceil(height / (detail ? 8 : 12)));
    const tctx = tiny.getContext("2d");
    if (!tctx) return null;
    tctx.imageSmoothingEnabled = true;
    tctx.drawImage(small, 0, 0, tiny.width, tiny.height);
    rctx.clearRect(0, 0, width, height);
    rctx.drawImage(tiny, 0, 0, width, height);
    const base = rctx.getImageData(0, 0, width, height).data;
    small.width = 0;
    small.height = 0;
    tiny.width = 0;
    tiny.height = 0;

    const cols = width;
    const rows = height;
    const cells: number[] = [];
    const revealAt = new Float32Array(cols * rows);
    const taken = new Uint8Array(cols * rows);
    let seed = 20261022;
    const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

    // Normalizing to the 98.5th-percentile luminance maps the photo's
    // highlights to full dot density regardless of exposure.
    const lums = new Float32Array(cols * rows);
    const histogram = new Uint32Array(256);
    for (let c = 0; c < cols * rows; c++) {
      const k = c * 4;
      const a = src[k + 3] / 255;
      const sharp = ((src[k] * 0.2126 + src[k + 1] * 0.7152 + src[k + 2] * 0.0722) / 255) * a;
      const blurred =
        ((base[k] * 0.2126 + base[k + 1] * 0.7152 + base[k + 2] * 0.0722) / 255) *
        (base[k + 3] / 255);
      const lum = Math.min(1, Math.max(0, sharp + (sharp - blurred) * (detail ? 0.85 : 0.5)));
      lums[c] = lum;
      histogram[Math.min(255, Math.round(lum * 255))]++;
    }
    let remaining = Math.ceil(cols * rows * 0.015);
    let normBin = 255;
    while (normBin > 1 && remaining > 0) remaining -= histogram[normBin--];
    const norm = Math.max(0.05, normBin / 255);

    // Ordered dithering instead of random acceptance: the halftone pattern
    // renders tones without sampling noise, which is what keeps the face
    // crisp; randomness survives only in the dust halo and background.
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const lum = Math.min(1, Math.pow(lums[y * cols + x] / norm, detail ? 1.1 : 1.25));
        if (lum < 0.05) {
          if (rand() >= 0.0003) continue;
        } else {
          const threshold = (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16 + (rand() - 0.5) * 0.05;
          if (lum * (detail ? 0.82 : 0.72) <= threshold) continue;
        }
        let c = y * cols + x;
        if (rand() < 0.008) {
          const sx = x + Math.round((rand() - 0.5) * 18);
          const sy = y + Math.round((rand() - 0.5) * 18);
          if (sx < 0 || sy < 0 || sx >= cols || sy >= rows) continue;
          c = sy * cols + sx;
        }
        if (taken[c]) continue;
        taken[c] = 1;
        cells.push(c);
        revealAt[c] = rand();
      }
    }
    if (cells.length === 0) return null;
    return { cols, rows, cells, revealAt };
  } finally {
    raster.width = 0;
    raster.height = 0;
  }
}

/** Runs one portrait simulation at a fixed canvas size; returns its stop function. */
function runPortrait(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  cloud: PortraitCloud,
  dpr: number,
  { revealMs, interactive }: PortraitSceneOptions,
): () => void {
  const { cols, rows, cells, revealAt } = cloud;
  const { width, height } = canvas;

  const field = document.createElement("canvas");
  field.width = width;
  field.height = height;
  const fctx = field.getContext("2d");
  if (!fctx) {
    field.width = 0;
    field.height = 0;
    canvas.width = 0;
    canvas.height = 0;
    return () => {};
  }
  fctx.fillStyle = DOT_COLOR;
  for (const c of cells) fctx.fillRect(c % cols, (c / cols) | 0, 1, 1);

  if (prefersReducedMotion()) {
    ctx.drawImage(field, 0, 0);
    field.width = 0;
    field.height = 0;
    return () => {};
  }

  if (!interactive) {
    // reveal only: the loop ends on a final draw and the thumbnail holds still
    let staticRaf = 0;
    let staticBorn = 0;
    const staticTick = (now: number) => {
      if (!staticBorn) staticBorn = now;
      const t = revealMs <= 0 ? 1 : Math.min(1, (now - staticBorn) / revealMs);
      if (t >= 1) {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(field, 0, 0);
        field.width = 0;
        field.height = 0;
        return;
      }
      const eased = t * t * (3 - 2 * t);
      ctx.clearRect(0, 0, width, height);
      for (const c of cells) {
        const at = revealAt[c];
        if (at > eased) continue;
        ctx.fillStyle = eased - at < 0.05 ? FLICKER_COLOR : DOT_COLOR;
        ctx.fillRect(c % cols, (c / cols) | 0, 1, 1);
      }
      staticRaf = requestAnimationFrame(staticTick);
    };
    staticRaf = requestAnimationFrame(staticTick);
    return () => {
      cancelAnimationFrame(staticRaf);
      field.width = 0;
      field.height = 0;
    };
  }

  // Deliberately gentle: a small cursor radius and a short displacement leash
  // ripple a few dots that spring straight back home, so the likeness never
  // breaks. No ambient rain detaches anything.
  const particles = new ParticleField({
    cols,
    rows,
    cellSize: 1,
    homes: cells,
    capacity: CAPACITY,
    unit: dpr,
    maxDisplacement: 7 * dpr,
    radius: 26 * dpr,
    blast: { radiusScale: 3, strength: 280, jitter: 50 },
    rainPerSecond: 0,
  });

  const lifetime = new AbortController();
  const { signal } = lifetime;
  const toField = (clientX: number, clientY: number): [number, number] => {
    const bounds = canvas.getBoundingClientRect();
    return [(clientX - bounds.left) * dpr, (clientY - bounds.top) * dpr];
  };
  window.addEventListener(
    "pointermove",
    (event) => particles.pointerMove(...toField(event.clientX, event.clientY), performance.now()),
    { passive: true, signal },
  );
  document.documentElement.addEventListener("mouseleave", () => particles.pointerLeave(), {
    signal,
  });
  listenForBursts(({ x, y }) => particles.blast(...toField(x, y)), signal);

  let raf = 0;
  let born = 0;
  let last = performance.now();

  // Materialize pass: dots pop in by per-cell threshold in random order,
  // sparking white for their first moments before settling into tone.
  const drawAssembly = (now: number) => {
    const t = revealMs <= 0 ? 1 : Math.min(1, (now - born) / revealMs);
    const eased = t * t * (3 - 2 * t);
    ctx.clearRect(0, 0, width, height);
    for (const c of cells) {
      const at = revealAt[c];
      if (at > eased) continue;
      ctx.fillStyle = eased - at < 0.05 ? FLICKER_COLOR : DOT_COLOR;
      ctx.fillRect(c % cols, (c / cols) | 0, 1, 1);
    }
  };

  const tick = (now: number) => {
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    if (!born) born = now;
    if (now - born < revealMs + 40) {
      drawAssembly(now);
      raf = requestAnimationFrame(tick);
      return;
    }
    particles.step(dt, now);

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(field, 0, 0);
    ctx.fillStyle = DOT_COLOR;
    particles.forEachDisplaced((c, x, y) => {
      ctx.clearRect(c % cols, (c / cols) | 0, 1, 1);
      ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
    });
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return () => {
    lifetime.abort();
    cancelAnimationFrame(raf);
    field.width = 0;
    field.height = 0;
  };
}

/**
 * Mounts the webinar banner's host portrait on `canvas`, covering its parent:
 * the photo becomes a halftone point cloud of same-color dots whose density
 * carries the shading, materializing dot by dot and stirring only slightly
 * under the cursor before springing back. Returns a dispose function.
 */
export function mountPortraitScene(
  canvas: HTMLCanvasElement,
  src: string,
  options: PortraitSceneOptions,
): () => void {
  const host = canvas.parentElement;
  if (!host) return () => {};

  let disposed = false;
  let generation = 0;
  let stop = () => {};

  const rebuild = async () => {
    const current = ++generation;
    stop();
    stop = () => {};
    canvas.width = 0;
    canvas.height = 0;
    try {
      const image = await loadPortraitImage(src);
      if (disposed || current !== generation) return;

      const rect = host.getBoundingClientRect();
      if (rect.width < 24 || rect.height < 24) return;
      const size = canvasBufferSize(
        rect.width,
        rect.height,
        Math.min(window.devicePixelRatio || 1, 2),
      );
      if (!size) return;
      canvas.width = size.width;
      canvas.height = size.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        canvas.width = 0;
        canvas.height = 0;
        return;
      }
      const cloudKey = `${src}|${canvas.width}x${canvas.height}|${options.zoom ?? 1}|${options.focusY ?? 0.5}`;
      let cloud = cloudCache.get(cloudKey) ?? null;
      if (!cloud) {
        cloud = samplePortrait(
          image,
          canvas.width,
          canvas.height,
          options.zoom ?? 1,
          options.focusY ?? 0.5,
        );
        if (cloud) cloudCache.set(cloudKey, cloud);
      }
      if (cloud) stop = runPortrait(canvas, ctx, cloud, size.scale, options);
      else {
        canvas.width = 0;
        canvas.height = 0;
      }
    } catch (error) {
      if (disposed || current !== generation) return;
      canvas.width = 0;
      canvas.height = 0;
      reportCanvasFailure(error, "e2e-webinar-portrait");
    }
  };
  void rebuild();

  let lastRect = host.getBoundingClientRect();
  const observer = new ResizeObserver(() => {
    const nextRect = host.getBoundingClientRect();
    if (
      Math.abs(nextRect.width - lastRect.width) <= 1 &&
      Math.abs(nextRect.height - lastRect.height) <= 1
    ) {
      return;
    }
    lastRect = nextRect;
    void rebuild();
  });
  observer.observe(host);

  return () => {
    disposed = true;
    observer.disconnect();
    stop();
    canvas.width = 0;
    canvas.height = 0;
  };
}
