// Decision log: "/e2e canvas buffers are bounded and decorative failures degrade locally".
const MAX_PIXELS = 1_048_576;
const MAX_DIMENSION = 2048;

export function canvasBufferSize(width: number, height: number, pixelRatio = 1) {
  if (![width, height, pixelRatio].every((value) => Number.isFinite(value) && value > 0)) {
    return null;
  }
  const scale = Math.min(
    pixelRatio,
    MAX_DIMENSION / width,
    MAX_DIMENSION / height,
    Math.sqrt(MAX_PIXELS / width / height),
  );
  const bufferWidth = Math.floor(width * scale);
  const bufferHeight = Math.floor(height * scale);
  if (!bufferWidth || !bufferHeight) return null;
  return { width: bufferWidth, height: bufferHeight, scale };
}

export function reportCanvasFailure(error: unknown, component: string) {
  if (error instanceof RangeError) return;
  if (
    error instanceof DOMException &&
    ["IndexSizeError", "InvalidStateError"].includes(error.name)
  ) {
    return;
  }
  console.error(`[${component}]`, error);
}
