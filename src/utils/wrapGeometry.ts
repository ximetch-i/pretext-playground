export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; width: number; height: number };
export type Interval = { left: number; right: number };

export type Silhouette = {
  points: Point[];
  naturalWidth: number;
  naturalHeight: number;
};

const silhouetteCache = new Map<string, Promise<Silhouette>>();

//extrae la silueta (contorno alfa) de una imagen, con cache por src
export function getSilhouette(src: string, smoothRadius = 3): Promise<Silhouette> {
  const key = `${src}::${smoothRadius}`;
  const cached = silhouetteCache.get(key);
  if (cached) return cached;
  const promise = computeSilhouette(src, smoothRadius);
  silhouetteCache.set(key, promise);
  return promise;
}

async function computeSilhouette(src: string, smoothRadius: number): Promise<Silhouette> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = src;
  await image.decode();

  const maxDim = 256;
  const aspect = image.naturalWidth / image.naturalHeight;
  const width = aspect >= 1 ? maxDim : Math.max(48, Math.round(maxDim * aspect));
  const height = aspect >= 1 ? Math.max(48, Math.round(maxDim / aspect)) : maxDim;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  const { data } = ctx.getImageData(0, 0, width, height);
  const lefts: (number | null)[] = new Array(height).fill(null);
  const rights: (number | null)[] = new Array(height).fill(null);
  const alphaThreshold = 24;

  for (let y = 0; y < height; y++) {
    let left = -1;
    let right = -1;
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3]!;
      if (alpha < alphaThreshold) continue;
      if (left === -1) left = x;
      right = x;
    }
    if (left !== -1) {
      lefts[y] = left;
      rights[y] = right + 1;
    }
  }

  const validRows: number[] = [];
  for (let y = 0; y < height; y++) if (lefts[y] !== null) validRows.push(y);
  if (validRows.length === 0) {
    //sin píxeles opacos (imagen vacía) -> devolvemos un rectángulo completo
    return {
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ],
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
    };
  }

  let boundLeft = Infinity;
  let boundRight = -Infinity;
  const boundTop = validRows[0]!;
  const boundBottom = validRows[validRows.length - 1]!;
  for (const y of validRows) {
    boundLeft = Math.min(boundLeft, lefts[y]!);
    boundRight = Math.max(boundRight, rights[y]!);
  }
  const boundWidth = Math.max(1, boundRight - boundLeft);
  const boundHeight = Math.max(1, boundBottom - boundTop);

  //suaviza el contorno promediando filas vecinas
  const smoothedLefts: number[] = new Array(height).fill(0);
  const smoothedRights: number[] = new Array(height).fill(0);
  for (const y of validRows) {
    let leftSum = 0;
    let rightSum = 0;
    let count = 0;
    for (let offset = -smoothRadius; offset <= smoothRadius; offset++) {
      const sample = y + offset;
      if (sample < 0 || sample >= height) continue;
      const left = lefts[sample];
      const right = rights[sample];
      if (left == null || right == null) continue;
      leftSum += left;
      rightSum += right;
      count++;
    }
    if (count === 0) {
      smoothedLefts[y] = lefts[y]!;
      smoothedRights[y] = rights[y]!;
    } else {
      smoothedLefts[y] = leftSum / count;
      smoothedRights[y] = rightSum / count;
    }
  }

  //muestrea ~60 filas para no cargar un polígono gigantesco
  const step = Math.max(1, Math.floor(validRows.length / 60));
  const sampledRows: number[] = [];
  for (let i = 0; i < validRows.length; i += step) sampledRows.push(validRows[i]!);
  const lastRow = validRows[validRows.length - 1]!;
  if (sampledRows[sampledRows.length - 1] !== lastRow) sampledRows.push(lastRow);

  const points: Point[] = [];
  for (const y of sampledRows) {
    points.push({ x: (smoothedLefts[y]! - boundLeft) / boundWidth, y: (y - boundTop) / boundHeight });
  }
  for (let i = sampledRows.length - 1; i >= 0; i--) {
    const y = sampledRows[i]!;
    points.push({ x: (smoothedRights[y]! - boundLeft) / boundWidth, y: (y - boundTop) / boundHeight });
  }

  return { points, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight };
}

//polígono normalizado (0..1) a coordenadas reales, dado el rect y rotación actual del dibujo
export function transformSilhouette(points: Point[], rect: Rect, angleRad: number): Point[] {
  if (angleRad === 0) {
    return points.map((p) => ({ x: rect.x + p.x * rect.width, y: rect.y + p.y * rect.height }));
  }
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return points.map((p) => {
    const localX = (p.x - 0.5) * rect.width;
    const localY = (p.y - 0.5) * rect.height;
    return { x: cx + localX * cos - localY * sin, y: cy + localX * sin + localY * cos };
  });
}

function getPolygonXsAtY(points: Point[], y: number): number[] {
  const xs: number[] = [];
  let a = points[points.length - 1];
  if (!a) return xs;
  for (const b of points) {
    if ((a.y <= y && y < b.y) || (b.y <= y && y < a.y)) {
      xs.push(a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y));
    }
    a = b;
  }
  xs.sort((m, n) => m - n);
  return xs;
}

export function getPolygonIntervalForBand(
  points: Point[],
  bandTop: number,
  bandBottom: number,
  padding: number
): Interval | null {
  let left = Infinity;
  let right = -Infinity;
  const startY = Math.floor(bandTop);
  const endY = Math.ceil(bandBottom);
  for (let y = startY; y <= endY; y++) {
    const xs = getPolygonXsAtY(points, y + 0.5);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      left = Math.min(left, xs[i]!);
      right = Math.max(right, xs[i + 1]!);
    }
  }
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  return { left: left - padding, right: right + padding };
}

export function carveTextLineSlots(base: Interval, blocked: Interval[], minSlotWidth = 20): Interval[] {
  let slots: Interval[] = [base];
  for (const b of blocked) {
    const next: Interval[] = [];
    for (const slot of slots) {
      if (b.right <= slot.left || b.left >= slot.right) {
        next.push(slot);
        continue;
      }
      if (b.left > slot.left) next.push({ left: slot.left, right: b.left });
      if (b.right < slot.right) next.push({ left: b.right, right: slot.right });
    }
    slots = next;
  }
  return slots.filter((s) => s.right - s.left >= minSlotWidth);
}