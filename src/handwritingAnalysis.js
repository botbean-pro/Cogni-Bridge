// A small, transparent image heuristic. It measures ink coverage in the
// writing area; it does not infer personality, intelligence, or diagnosis.
export const analyzeHandwritingSample = (dataUrl) => new Promise((resolve, reject) => {
  const image = new Image();
  image.onerror = () => reject(new Error("Could not read image"));
  image.onload = () => {
    try {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 900 / Math.max(image.width, image.height));
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Canvas unavailable");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
      let minX = width, minY = height, maxX = -1, maxY = -1, inkPixels = 0;
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const offset = (y * width + x) * 4;
          const lightness = (data[offset] + data[offset + 1] + data[offset + 2]) / 3;
          if (data[offset + 3] > 32 && lightness < 145) {
            inkPixels += 1;
            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y);
          }
        }
      }
      if (inkPixels < 80 || maxX < minX || maxY < minY) throw new Error("No clear writing found");
      const area = (maxX - minX + 1) * (maxY - minY + 1);
      const density = inkPixels / area;
      const patternKey = density < 0.12 ? "handwritingPatternOpen" : density > 0.27 ? "handwritingPatternCompact" : "handwritingPatternBalanced";
      const meaningKey = density < 0.12 ? "handwritingMeaningOpen" : density > 0.27 ? "handwritingMeaningCompact" : "handwritingMeaningBalanced";
      resolve({ type: patternKey === "handwritingPatternOpen" ? "Open spacing" : patternKey === "handwritingPatternCompact" ? "Compact spacing" : "Balanced spacing", patternKey, meaningKey, inkDensity: density });
    } catch (error) { reject(error); }
  };
  image.src = dataUrl;
});
