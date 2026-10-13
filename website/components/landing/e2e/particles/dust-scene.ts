import { prefersReducedMotion } from "../media";
import { listenForBursts } from "./burst";

type Dot = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  tone: number;
};

/**
 * Mounts a click-triggered dust puff on `canvas`, covering its parent: bursts
 * landing inside the canvas spray dither squares outward from the button
 * footprint around the click, then dissolve. Idle between bursts and inert
 * under prefers-reduced-motion. `density` is the share of grid cells that
 * emit a grain. Returns a dispose function.
 */
export function mountDustScene(canvas: HTMLCanvasElement, density: number): () => void {
  const ctx = canvas.getContext("2d");
  const host = canvas.parentElement;
  if (!ctx || !host || prefersReducedMotion()) return () => {};

  const lifetime = new AbortController();
  let dots: Dot[] = [];
  let raf = 0;
  let dpr = 1;

  const resize = () => {
    const rect = host.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(host);

  let last = 0;
  const tick = (now: number) => {
    const dt = Math.min((now - last) / 1000, 1 / 30) || 0.016;
    last = now;
    const Q = Math.max(2, Math.round(2.5 * dpr));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const drag = Math.exp(-1.6 * dt);
    dots = dots.filter((dot) => (dot.life -= dt) > 0);
    for (const dot of dots) {
      dot.vx *= drag;
      dot.vy *= drag;
      dot.x += dot.vx * dt;
      dot.y += dot.vy * dt;
      const t = dot.life / dot.maxLife;
      ctx.globalAlpha = t * t;
      ctx.fillStyle = `rgb(${dot.tone}, ${dot.tone}, ${dot.tone})`;
      ctx.fillRect(dot.x - Q / 2, dot.y - Q / 2, Q, Q);
    }
    ctx.globalAlpha = 1;
    raf = dots.length > 0 ? requestAnimationFrame(tick) : 0;
  };

  listenForBursts(({ x, y }) => {
    const bounds = canvas.getBoundingClientRect();
    const ax = (x - bounds.left) * dpr;
    const ay = (y - bounds.top) * dpr;
    if (ax < 0 || ay < 0 || ax > canvas.width || ay > canvas.height) return;
    const P = Math.max(4, Math.round(5.5 * dpr));
    const SPAWN_X = 195 * dpr;
    const SPAWN_Y = 46 * dpr;
    const SPRAY = 620 * dpr;
    const x0 = Math.max(0, Math.floor((ax - SPAWN_X) / P));
    const x1 = Math.ceil(Math.min(canvas.width, ax + SPAWN_X) / P);
    const y0 = Math.max(0, Math.floor((ay - SPAWN_Y) / P));
    const y1 = Math.ceil(Math.min(canvas.height, ay + SPAWN_Y) / P);
    for (let cy = y0; cy < y1; cy++) {
      for (let cx = x0; cx < x1; cx++) {
        if (Math.random() > density) continue;
        const gx = cx * P + P / 2;
        const gy = cy * P + P / 2;
        const dx = gx - ax;
        const dy = gy - ay;
        const d = Math.hypot(dx, dy) || 1;
        const fall = 0.5 + 0.5 * Math.min(1, d / SPAWN_X);
        const maxLife = 0.55 + Math.random() * 0.7;
        dots.push({
          x: gx,
          y: gy,
          vx: (dx / d) * SPRAY * fall + (Math.random() - 0.5) * 160 * dpr,
          vy: (dy / d) * SPRAY * fall + (Math.random() - 0.5) * 160 * dpr,
          life: maxLife,
          maxLife,
          tone: Math.round(60 + Math.random() * 80),
        });
      }
    }
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
  }, lifetime.signal);

  return () => {
    lifetime.abort();
    cancelAnimationFrame(raf);
    observer.disconnect();
  };
}
