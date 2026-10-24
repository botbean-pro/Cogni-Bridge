import { fetchWithAuth } from "./components/student/flow/flowApi";
import { hasEnoughWriting, measureMarks, signsFromMetrics } from "./handwritingSigns";

const loadImage = (dataUrl) => new Promise((resolve, reject) => {
  const image = new Image();
  image.onerror = () => reject(new Error("Could not read image"));
  image.onload = () => resolve(image);
  image.src = dataUrl;
});

const canvasFor = (width, height) => {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
};

// Finds the handwriting in a photo. Each pixel is compared with the paper around it (a heavily blurred copy),
// so shadows, tinted paper and a table at the edge aren't mistaken for ink. Marks taller than
// `maxMarkHeight` of the image are dropped as not writing (a close crop of the writing allows taller ones).
const findWriting = (image, { maxSize = 900, maxMarkHeight = 0.3 } = {}) => {
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const canvas = canvasFor(image.width * scale, image.height * scale);
  const { width, height } = canvas;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas unavailable");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;

  const small = canvasFor(width / 24, height / 24);
  const smallContext = small.getContext("2d", { willReadFrequently: true });
  smallContext.imageSmoothingQuality = "high";
  smallContext.drawImage(canvas, 0, 0, small.width, small.height);
  // Marks right beside a much darker area (the table around the sheet) are the sheet's edge, not writing.
  // Even dense writing only darkens a patch of paper a little, so it never trips this.
  const blocks = smallContext.getImageData(0, 0, small.width, small.height).data;
  const blockLightness = (x, y) => {
    const offset = (y * small.width + x) * 4;
    return blocks[offset] + blocks[offset + 1] + blocks[offset + 2];
  };
  const besideDarkArea = new Uint8Array(small.width * small.height);
  for (let y = 0; y < small.height; y += 1) {
    for (let x = 0; x < small.width; x += 1) {
      let darkest = Infinity, lightest = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (x + dx < 0 || y + dy < 0 || x + dx >= small.width || y + dy >= small.height) continue;
          const value = blockLightness(x + dx, y + dy);
          darkest = Math.min(darkest, value);
          lightest = Math.max(lightest, value);
        }
      }
      besideDarkArea[y * small.width + x] = darkest < lightest * 0.6 ? 1 : 0;
    }
  }
  const paperCanvas = canvasFor(width, height);
  const paperContext = paperCanvas.getContext("2d", { willReadFrequently: true });
  paperContext.imageSmoothingQuality = "high";
  paperContext.drawImage(small, 0, 0, width, height);
  const paper = paperContext.getImageData(0, 0, width, height).data;

  const ink = new Uint8Array(width * height);
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    const lightness = pixels[offset] + pixels[offset + 1] + pixels[offset + 2];
    const surround = paper[offset] + paper[offset + 1] + paper[offset + 2];
    const x = index % width, y = (index - x) / width;
    const block = Math.min(small.height - 1, Math.floor(y * small.height / height)) * small.width
      + Math.min(small.width - 1, Math.floor(x * small.width / width));
    // Ink is clearly darker than the paper next to it.
    if (!besideDarkArea[block] && surround > 180 && lightness < surround * 0.72) ink[index] = 1;
  }

  // Keep letter-sized marks only: the edge of the sheet against a dark table also looks darker than its
  // surroundings, but it forms one long line far bigger than any word.
  const rows = new Uint32Array(height);
  const columns = new Uint32Array(width);
  const stack = new Int32Array(width * height);
  const component = [];
  const marks = [];
  let inkPixels = 0;
  for (let start = 0; start < width * height; start += 1) {
    if (ink[start] !== 1) continue;
    ink[start] = 2;
    let size = 0, minX = width, maxX = 0, minY = height, maxY = 0;
    stack[size++] = start;
    component.length = 0;
    while (size) {
      const index = stack[--size];
      const x = index % width, y = (index - x) / width;
      component.push(index);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x > 0 && ink[index - 1] === 1) { ink[index - 1] = 2; stack[size++] = index - 1; }
      if (x < width - 1 && ink[index + 1] === 1) { ink[index + 1] = 2; stack[size++] = index + 1; }
      if (y > 0 && ink[index - width] === 1) { ink[index - width] = 2; stack[size++] = index - width; }
      if (y < height - 1 && ink[index + width] === 1) { ink[index + width] = 2; stack[size++] = index + width; }
    }
    const keep = maxX - minX < width * 0.5 && maxY - minY < height * maxMarkHeight;
    if (keep && component.length >= 6) marks.push({ minX, maxX, minY, maxY });
    for (const index of component) {
      if (!keep) { ink[index] = 0; continue; }
      inkPixels += 1;
      rows[Math.floor(index / width)] += 1;
      columns[index % width] += 1;
    }
  }
  if (inkPixels < 80) throw new Error("No clear writing found");

  // Trim the outer 0.5% of ink on each side so stray specks don't stretch the writing area.
  const bounds = (counts) => {
    const trim = inkPixels * 0.005;
    let start = 0, end = counts.length - 1, seen = 0;
    while (start < end && (seen += counts[start]) <= trim) start += 1;
    seen = 0;
    while (end > start && (seen += counts[end]) <= trim) end -= 1;
    return [start, end];
  };
  const [top, bottom] = bounds(rows);
  const [left, right] = bounds(columns);
  let inside = 0;
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) inside += ink[y * width + x] ? 1 : 0;
  }
  return {
    box: { left: left / scale, top: top / scale, right: (right + 1) / scale, bottom: (bottom + 1) / scale },
    density: inside / ((right - left + 1) * (bottom - top + 1)),
    marks,
  };
};

const resultForType = (type) => ({
  "Open spacing": { patternKey: "handwritingPatternOpen", meaningKey: "handwritingMeaningOpen" },
  "Balanced spacing": { patternKey: "handwritingPatternBalanced", meaningKey: "handwritingMeaningBalanced" },
  "Compact spacing": { patternKey: "handwritingPatternCompact", meaningKey: "handwritingMeaningCompact" },
}[type]);

// The on-device fallback: how much of the writing area is ink. It does not infer personality, intelligence, or diagnosis.
const typeForDensity = (density) => (density < 0.065 ? "Open spacing" : density > 0.14 ? "Compact spacing" : "Balanced spacing");

// Finds the letters again on a close crop of the writing, so small writing in a big photo still has
// enough pixels per letter. Falls back to the marks from the whole photo.
const cropMarks = (image, writing) => {
  let { marks } = writing;
  try {
    const { box } = writing;
    const margin = 0.04 * Math.max(box.right - box.left, box.bottom - box.top);
    const left = Math.max(0, box.left - margin);
    const top = Math.max(0, box.top - margin);
    const width = Math.min(image.width, box.right + margin) - left;
    const height = Math.min(image.height, box.bottom + margin) - top;
    const scale = Math.min(2, 1400 / Math.max(width, height));
    const crop = canvasFor(width * scale, height * scale);
    const context = crop.getContext("2d");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, crop.width, crop.height);
    context.imageSmoothingQuality = "high";
    context.drawImage(image, left, top, width, height, 0, 0, crop.width, crop.height);
    marks = findWriting(crop, { maxSize: 1400, maxMarkHeight: 0.6 }).marks;
  } catch {
    // Keep the first pass's marks.
  }
  return marks;
};

// The on-device result: the writing difficulties (see handwritingSigns.js) and the older spacing type,
// which is still stored and used by the career quiz.
const deviceResult = (image, writing) => {
  const metrics = measureMarks(cropMarks(image, writing));
  if (!hasEnoughWriting(metrics)) throw new Error("Not enough writing to measure");
  const type = typeForDensity(writing.density);
  return { type, ...resultForType(type), inkDensity: writing.density, signs: signsFromMetrics(metrics), metrics };
};

// TEMP (tuning harness): marks from the measuring pass.
export const __readWriting = async (dataUrl) => {
  const image = await loadImage(dataUrl);
  const writing = findWriting(image);
  return { density: writing.density, marks: cropMarks(image, writing) };
};

export const analyzeHandwritingSample = async (dataUrl) => {
  const image = await loadImage(dataUrl);
  return deviceResult(image, findWriting(image));
};

// Sends only the writing, cropped with a margin and scaled to fill the frame, so a phone photo of a whole desk
// doesn't look "open" just because the writing is small in it.
const cropForUpload = (image, box) => {
  const margin = 0.06 * Math.max(box.right - box.left, box.bottom - box.top);
  const left = Math.max(0, box.left - margin);
  const top = Math.max(0, box.top - margin);
  const width = Math.min(image.width, box.right + margin) - left;
  const height = Math.min(image.height, box.bottom + margin) - top;
  const scale = Math.min(2, 1280 / Math.max(width, height));
  const canvas = canvasFor(width * scale, height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingQuality = "high";
  context.drawImage(image, left, top, width, height, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.88);
};

// The writing difficulties are always measured on the device, so the writing has to be found here. If a
// vision model is set up (api/chat.js), it gives the spacing type instead of the ink-density estimate;
// when it's unreachable (no model set, `npm run dev`, offline) the device's own type is kept.
export const classifyHandwritingSample = async (dataUrl) => {
  const image = await loadImage(dataUrl);
  const writing = findWriting(image);
  const result = { ...deviceResult(image, writing), source: "device" };
  let response;
  try {
    response = await fetchWithAuth("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: "handwriting", image: cropForUpload(image, writing.box) }),
    });
  } catch {
    return result;
  }
  const data = await response.json().catch(() => ({}));
  if (data.noWriting) throw new Error("No clear writing found");
  const keys = response.ok && resultForType(data.type);
  if (!keys) return result;
  return { ...result, type: data.type, ...keys, features: data.features, source: "ai" };
};
