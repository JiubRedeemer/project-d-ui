const FALLBACK_COLOR = "#131117";

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0"))
    .join("")}`;
}

function averageColor(data: Uint8ClampedArray): string | null {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count++;
  }

  if (!count) return null;

  const darken = 0.6;
  return rgbToHex((r / count) * darken, (g / count) * darken, (b / count) * darken);
}

export function extractDominantColorFromImage(img: HTMLImageElement): string {
  const canvas = document.createElement("canvas");
  const size = 48;
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d", {willReadFrequently: true});
  if (!ctx) return FALLBACK_COLOR;

  ctx.drawImage(img, 0, 0, size, size);
  const {data} = ctx.getImageData(0, 0, size, size);

  const buckets = new Map<string, {r: number; g: number; b: number; weight: number}>();

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    if (luminance < 0.06 || luminance > 0.97) continue;

    const qr = Math.round(r / 32) * 32;
    const qg = Math.round(g / 32) * 32;
    const qb = Math.round(b / 32) * 32;
    const key = `${qr},${qg},${qb}`;
    const weight = 1 + saturation * 2.5;
    const bucket = buckets.get(key);

    if (bucket) {
      bucket.r += r * weight;
      bucket.g += g * weight;
      bucket.b += b * weight;
      bucket.weight += weight;
    } else {
      buckets.set(key, {r: r * weight, g: g * weight, b: b * weight, weight});
    }
  }

  if (!buckets.size) {
    return averageColor(data) ?? FALLBACK_COLOR;
  }

  let best = {weight: 0, r: 19, g: 17, b: 23};

  for (const bucket of buckets.values()) {
    if (bucket.weight > best.weight) {
      best = {
        weight: bucket.weight,
        r: bucket.r / bucket.weight,
        g: bucket.g / bucket.weight,
        b: bucket.b / bucket.weight,
      };
    }
  }

  const darken = 0.58;
  return rgbToHex(best.r * darken, best.g * darken, best.b * darken);
}

export function extractDominantColorFromUrl(src: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      try {
        resolve(extractDominantColorFromImage(img));
      } catch {
        resolve(FALLBACK_COLOR);
      }
    };

    img.onerror = () => resolve(FALLBACK_COLOR);

    if (!src.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }

    img.src = src;
  });
}
