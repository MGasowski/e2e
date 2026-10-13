import { canvasBufferSize, reportCanvasFailure } from "../canvas-buffer";
import { prefersReducedMotion } from "../media";
import { listenForBursts } from "./burst";
import { ParticleField } from "./particle-field";

const WORD = "e2e";
const CAPACITY = 60000;

type WordmarkGrid = {
  cols: number;
  rows: number;
  /** Grid pitch and drawn square size, in device pixels. */
  pitch: number;
  square: number;
  cellColor: string[];
  cells: number[];
};

/**
 * Rasterizes the wordmark and samples it into a grid of squares. The bottom
 * fade is dithered into the squares themselves: a smooth CSS gradient over
 * near-black bands visibly, discrete jittered tones cannot.
 */
function sampleWordmark(
  width: number,
  height: number,
  dpr: number,
  topOverflow: number,
  family: string,
): WordmarkGrid | null {
  const extend = topOverflow * dpr;
  const base = height - extend;
  const raster = document.createElement("canvas");
  raster.width = width;
  raster.height = height;
  try {
    const rctx = raster.getContext("2d");
    if (!rctx) return null;
    const setFont = (size: number) => {
      rctx.font = `400 ${size}px ${family}, sans-serif`;
      if ("letterSpacing" in rctx) rctx.letterSpacing = `${-0.04 * size}px`;
    };
    let fontSize = base * 1.24;
    setFont(fontSize);
    const measured = rctx.measureText(WORD).width;
    if (measured > width * 0.98) {
      fontSize *= (width * 0.98) / measured;
      setFont(fontSize);
    }
    rctx.textAlign = "center";
    rctx.textBaseline = "middle";
    rctx.fillStyle = "rgb(255, 255, 255)";
    // the "2" rises above the e's; keep its cap inside the canvas so the
    // wordmark overflows the footer edge without getting cut (Chrome reports
    // the true glyph ascent relative to the middle baseline)
    let textY = height * 0.54 - Math.min(64 * dpr, height * 0.09);
    const ascent = rctx.measureText(WORD).actualBoundingBoxAscent;
    if (ascent && textY - ascent < 4 * dpr) textY = ascent + 4 * dpr;
    rctx.fillText(WORD, width / 2, textY);
    const src = rctx.getImageData(0, 0, width, height).data;

    const pitch = Math.max(1, Math.round(5.5 * dpr));
    const square = Math.max(1, Math.round(2.75 * dpr));
    const cols = Math.ceil(width / pitch);
    const rows = Math.ceil(height / pitch);
    const cellColor: string[] = Array.from({ length: cols * rows }, () => "");
    const cells: number[] = [];
    let seed = 20260923;
    const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    const fadeStart = extend + base * 0.04;
    const fadeEnd = extend + base * 0.9;
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        const x = Math.min(width - 1, cx * pitch + (pitch >> 1));
        const y = Math.min(height - 1, cy * pitch + (pitch >> 1));
        if (src[(y * width + x) * 4 + 3] <= 120 || rand() > 0.8) continue;
        const t = Math.min(1, Math.max(0, (y - fadeStart) / (fadeEnd - fadeStart)));
        const eased = t * t * (3 - 2 * t);
        if (eased > 0.95) continue;
        const tone = 34 + (17 - 34) * eased + (rand() - 0.5) * 3;
        const v = Math.round(Math.min(36, Math.max(17, tone)));
        const c = cy * cols + cx;
        cellColor[c] = `rgb(${v}, ${v}, ${v})`;
        cells.push(c);
      }
    }
    return { cols, rows, pitch, square, cellColor, cells };
  } finally {
    raster.width = 0;
    raster.height = 0;
  }
}

/** Runs one wordmark simulation at a fixed canvas size; returns its stop function. */
function runWordmark(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  grid: WordmarkGrid,
  dpr: number,
): () => void {
  const { cols, rows, pitch: P, square: Q, cellColor, cells } = grid;
  const inset = (P - Q) / 2;
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
  for (const c of cells) {
    fctx.fillStyle = cellColor[c];
    fctx.fillRect((c % cols) * P + inset, ((c / cols) | 0) * P + inset, Q, Q);
  }

  const particles = new ParticleField({
    cols,
    rows,
    cellSize: P,
    homes: cells,
    capacity: CAPACITY,
    unit: dpr,
    maxDisplacement: 34 * dpr,
    radius: 110 * dpr,
    // kept below the maxDisplacement leash: a harder shove freezes mid-flight
    // at the cap and the letters visibly hollow out
    blast: { radiusScale: 6, strength: 800, jitter: 120 },
    rainPerSecond: 8,
  });
  particles.exitY = -4 * dpr;

  const lifetime = new AbortController();
  const { signal } = lifetime;
  const reduceMotion = prefersReducedMotion();
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
  listenForBursts(({ x, y }) => {
    if (!reduceMotion) particles.blast(...toField(x, y));
  }, signal);

  let raf = 0;
  let last = performance.now();
  const tick = (now: number) => {
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    if (!reduceMotion) particles.rain(dt);
    particles.step(dt, now);

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(field, 0, 0);
    particles.forEachDisplaced((c, x, y) => {
      ctx.clearRect((c % cols) * P, ((c / cols) | 0) * P, P, P);
      ctx.fillStyle = cellColor[c];
      ctx.fillRect(x - Q / 2, y - Q / 2, Q, Q);
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
 * Mounts the footer's giant "e2e" on `canvas`, covering its parent: the
 * wordmark is rasterized in Stack Sans Notch and sampled into square particles
 * dimmed toward the design's watermark look, driven by the same physics as the
 * hero field. `topOverflow` is how far (CSS px) the canvas extends above the
 * wordmark's box. Rebuilds when the host size changes; returns a dispose
 * function.
 */
export function mountWordmarkScene(canvas: HTMLCanvasElement, topOverflow: number): () => void {
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
      const family =
        getComputedStyle(host).getPropertyValue("--font-stack-sans-notch") ||
        getComputedStyle(host).fontFamily;
      await document.fonts.ready;
      if (disposed || current !== generation) return;

      const rect = host.getBoundingClientRect();
      if (rect.width < 80 || rect.height <= topOverflow) return;
      const size = canvasBufferSize(
        rect.width,
        rect.height,
        Math.min(window.devicePixelRatio || 1, 2),
      );
      if (!size) return;
      const dpr = size.scale;
      canvas.width = size.width;
      canvas.height = size.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        canvas.width = 0;
        canvas.height = 0;
        return;
      }
      const grid = sampleWordmark(canvas.width, canvas.height, dpr, topOverflow, family);
      if (grid) stop = runWordmark(canvas, ctx, grid, dpr);
      else {
        canvas.width = 0;
        canvas.height = 0;
      }
    } catch (error) {
      if (disposed || current !== generation) return;
      canvas.width = 0;
      canvas.height = 0;
      reportCanvasFailure(error, "e2e-wordmark");
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
