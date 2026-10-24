// Measures observable handwriting difficulties from the ink marks found in a photo (see findWriting in
// handwritingAnalysis.js): uneven letter size, letters not sitting on a line, lines drifting or bending,
// uneven gaps between words and crowded writing. Pure functions, so they can be tested without a browser.
// These are things a mentor can see and support; they are not a diagnosis.

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  if (!sorted.length) return 0;
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const quantile = (values, q) => {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const position = (sorted.length - 1) * q;
  const low = Math.floor(position);
  return sorted[low] + (sorted[Math.min(low + 1, sorted.length - 1)] - sorted[low]) * (position - low);
};

// Splits values into two groups at the point that best separates them (Otsu's method). Returns the
// boundary and each group's average.
const naturalBreak = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const total = sorted.reduce((sum, value) => sum + value, 0);
  let best = { boundary: Infinity, score: -1, lowMean: 0, highMean: 0 };
  let lowSum = 0;
  for (let i = 1; i < sorted.length; i += 1) {
    lowSum += sorted[i - 1];
    const lowMean = lowSum / i;
    const highMean = (total - lowSum) / (sorted.length - i);
    const score = i * (sorted.length - i) * (highMean - lowMean) ** 2;
    if (score > best.score) best = { boundary: (sorted[i - 1] + sorted[i]) / 2, score, lowMean, highMean };
  }
  return best;
};

// Theil-Sen line fit: the median of the slopes between pairs of points, so a few letters with
// descenders (g, p, y) or a stray mark can't tilt it the way a least-squares fit would.
const robustFit = (points, minDx) => {
  const slopes = [];
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const dx = points[j].x - points[i].x;
      if (Math.abs(dx) >= minDx) slopes.push((points[j].y - points[i].y) / dx);
    }
  }
  const slope = median(slopes);
  const intercept = median(points.map((point) => point.y - slope * point.x));
  return { slope, intercept };
};

// The tilt of the whole photo: the angle at which the letters' centres line up into the sharpest rows.
// Straightening by it first means a phone held at a slant isn't mistaken for drifting lines.
const pageTilt = (letters, typical) => {
  let best = { slope: 0, score: -1 };
  for (let degrees = -12; degrees <= 12; degrees += 0.5) {
    const slope = Math.tan((degrees * Math.PI) / 180);
    const bins = new Map();
    letters.forEach((mark) => {
      const bin = Math.round((mark.cy - slope * mark.cx) / (typical * 0.5));
      bins.set(bin, (bins.get(bin) || 0) + 1);
    });
    let score = 0;
    bins.forEach((count) => { score += count * count; });
    if (score > best.score) best = { slope, score };
  }
  return best.slope;
};

// Where a line of writing is expected at x, from the trend of its most recent letters.
const predictY = (marks, x) => {
  const recent = marks.slice(-8);
  if (recent.length < 3) return median(recent.map((mark) => mark.cy));
  const mx = recent.reduce((sum, mark) => sum + mark.cx, 0) / recent.length;
  const my = recent.reduce((sum, mark) => sum + mark.cy, 0) / recent.length;
  const spreadX = recent.reduce((sum, mark) => sum + (mark.cx - mx) ** 2, 0);
  const slope = spreadX ? Math.max(-0.3, Math.min(0.3, recent.reduce((sum, mark) => sum + (mark.cx - mx) * (mark.cy - my), 0) / spreadX)) : 0;
  return my + slope * (x - mx);
};

// Groups letter-sized marks into lines of writing, left to right, following each line's own trend so a
// line that slopes or wanders is still kept together.
const groupLines = (letters, typical) => {
  const lines = [];
  [...letters].sort((a, b) => a.minX - b.minX).forEach((mark) => {
    let best = null;
    let bestDistance = Infinity;
    for (const line of lines) {
      const distance = Math.abs(predictY(line.marks, mark.cx) - mark.cy);
      const gap = mark.minX - line.right;
      if (distance < typical * 1.05 && gap > -typical && gap < typical * 10 && distance < bestDistance) {
        best = line;
        bestDistance = distance;
      }
    }
    if (best) {
      best.marks.push(mark);
      best.right = Math.max(best.right, mark.maxX);
    } else {
      lines.push({ marks: [mark], right: mark.maxX });
    }
  });
  return lines.map((line) => line.marks).filter((marks) => marks.length >= 5);
};

// Numbers describing the writing. Lengths are relative to the typical letter height, so the size of the
// writing in the photo doesn't matter.
export function measureMarks(marks) {
  const boxes = marks.map(({ minX, maxX, minY, maxY }) => ({
    minX, maxX, minY, maxY, h: maxY - minY + 1, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2,
  }));
  const roughHeight = median(boxes.filter((box) => box.h >= 4).map((box) => box.h));
  // Dots on i and j, commas and specks are far smaller than letters; leave them out.
  const found = boxes.filter((box) => box.h >= 4 && box.h >= roughHeight * 0.45);
  const typical = median(found.map((box) => box.h)) || 1;
  const tilt = pageTilt(found, typical);
  const letters = found.map((box) => ({ ...box, minY: box.minY - tilt * box.cx, maxY: box.maxY - tilt * box.cx, cy: box.cy - tilt * box.cx }));
  const lines = groupLines(letters, typical);
  const lineLetters = lines.flat();

  const sizeRatios = [];
  const offLine = [];
  const slopes = [];
  const bends = [];
  const gaps = [];
  lines.forEach((line) => {
    const lineHeight = median(line.map((mark) => mark.h));
    line.forEach((mark) => sizeRatios.push(mark.h / lineHeight));
    const points = line.map((mark) => ({ x: mark.cx, y: mark.maxY }));
    const fit = robustFit(points, typical);
    offLine.push(median(points.map((point) => Math.abs(point.y - (fit.intercept + fit.slope * point.x)))) / typical);
    slopes.push({ slope: fit.slope, weight: line.length });
    if (line.length >= 10) {
      const half = line.length >> 1;
      bends.push(Math.abs(robustFit(points.slice(0, half), typical).slope - robustFit(points.slice(half), typical).slope));
    }
  });
  // Each gap runs to the nearest mark on the right at about the same height, so a letter that didn't join
  // its line (a wobbly baseline) doesn't turn into a false wide gap.
  lineLetters.forEach((mark) => {
    let next = null;
    letters.forEach((other) => {
      if (other.cx > mark.cx && other.minX > mark.minX && Math.abs(other.cy - mark.cy) < typical * 0.9
        && (!next || other.minX < next.minX)) next = other;
    });
    const gap = next ? (next.minX - mark.maxX) / typical : Infinity;
    if (gap < 6) gaps.push(gap);
  });

  // Gaps between words are the larger of the two groups of gaps (the smaller ones are inside words),
  // split on log sizes. When the gaps don't form two clear groups, with typical word gaps over twice the
  // letter gaps (joined-up writing, where every mark is a word), they all count; a gap under a third of a
  // letter never does.
  const open = gaps.filter((gap) => gap > 0.02);
  const split = naturalBreak(open.map((gap) => Math.log(gap)));
  const boundary = Math.exp(split.highMean - split.lowMean) > 2 ? Math.exp(split.boundary) : 0;
  const wordGaps = open.filter((gap) => gap > Math.max(0.3, boundary));
  const wordGapMedian = median(wordGaps);
  const longLines = slopes.filter((item) => item.weight >= 8).map((item) => item.slope);
  return {
    letters: lineLetters.length,
    lines: lines.length,
    // Letter heights against their line's typical height: the overall range (tallest tenth against the
    // shortest tenth) and the range among the smaller letters, which in neat writing are all about the
    // same height (tall letters like l and g make the overall range wide on their own).
    sizeRange: quantile(sizeRatios, 0.9) / (quantile(sizeRatios, 0.1) || 1),
    lowerRange: quantile(sizeRatios, 0.4) / (quantile(sizeRatios, 0.05) || 1),
    // Joined-up writing: each mark is a whole word, far wider than it is tall.
    markWidth: median(lineLetters.map((mark) => (mark.maxX - mark.minX + 1) / typical)),
    // How far letters sit from their line's baseline, as a share of letter height.
    offLine: median(offLine),
    // Lines that aren't parallel to each other (tilting the photo turns them all equally, so it doesn't count).
    slopeSpread: longLines.length >= 2 ? quantile(longLines, 0.9) - quantile(longLines, 0.1) : 0,
    // Lines that bend: the slope of the second half against the first.
    bend: median(bends),
    wordGaps: wordGaps.length,
    wordGapShare: gaps.length ? wordGaps.length / gaps.length : 0,
    wordGapMedian,
    // How much the gaps between words vary: the middle half of them against the typical one.
    wordGapSpread: wordGaps.length >= 4 ? (quantile(wordGaps, 0.75) - quantile(wordGaps, 0.25)) / (wordGapMedian || 1) : 0,
  };
}

// Enough writing to judge: a couple of lines with a sentence or so in them.
export const hasEnoughWriting = (metrics) => metrics.lines >= 2 && metrics.letters >= 20;

// Set against sample writing: neat print and joined-up writing (including a tilted phone photo, ruled
// paper and tight lines) stays below every limit, and clearly uneven writing goes over. Tune them here
// once real samples are available.
export const signThresholds = {
  joinedWidth: 1.1,
  sizeRange: 2.3,
  lowerRange: 1.5,
  baseline: 0.13,
  drift: 0.1,
  bend: 0.1,
  spacing: 0.4,
  crowdedShare: 0.12,
  crowdedGap: 0.5,
};

// The signs found: "size", "baseline", "drift", "spacing" and "crowded" are difficulties; "joined" only
// notes that joined-up writing can't be checked for letter size, spacing or crowding.
export function signsFromMetrics(metrics, limits = signThresholds) {
  if (!hasEnoughWriting(metrics)) return [];
  const signs = [];
  const joined = metrics.markWidth > limits.joinedWidth;
  if (!joined && metrics.sizeRange > limits.sizeRange && metrics.lowerRange > limits.lowerRange) signs.push("size");
  if (metrics.offLine > limits.baseline) signs.push("baseline");
  if (metrics.slopeSpread > limits.drift || metrics.bend > limits.bend) signs.push("drift");
  const crowded = !joined && (metrics.wordGapShare < limits.crowdedShare || metrics.wordGapMedian < limits.crowdedGap);
  if (!joined && !crowded && metrics.wordGaps >= 6 && metrics.wordGapSpread > limits.spacing) signs.push("spacing");
  if (crowded) signs.push("crowded");
  if (joined) signs.push("joined");
  return signs;
}
