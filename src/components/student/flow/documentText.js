// Pulls plain text out of a study document in the browser, so the file itself is never uploaded.
// Only the extracted text (trimmed to keep within the daily AI budget) goes to /api/chat.
export const MAX_DOCUMENT_CHARS = 8000;
const MAX_FILE_BYTES = 15 * 1024 * 1024;

export const acceptedDocumentTypes = ".pdf,.docx,.txt,.md,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// The error message is an i18n key so the page can show it in the student's language.
const documentError = (key) => Object.assign(new Error(key), { i18nKey: key });

async function readPdf(file) {
  const [pdfjs, { default: workerUrl }] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = [];
  let length = 0;
  // Stop once there is more text than we will send anyway.
  for (let number = 1; number <= pdf.numPages && length <= MAX_DOCUMENT_CHARS; number += 1) {
    const page = await pdf.getPage(number);
    const content = await page.getTextContent();
    const text = content.items.map((item) => `${item.str || ""}${item.hasEOL ? "\n" : " "}`).join("");
    pages.push(text);
    length += text.length;
  }
  return pages.join("\n\n");
}

async function readDocx(file) {
  const mammoth = await import("mammoth");
  const { value } = await (mammoth.default || mammoth).extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return value;
}

export async function readDocumentText(file) {
  const name = file.name.toLowerCase();
  if (file.size > MAX_FILE_BYTES) throw documentError("docTooLarge");

  let text;
  try {
    if (name.endsWith(".pdf")) text = await readPdf(file);
    else if (name.endsWith(".docx")) text = await readDocx(file);
    else if (name.endsWith(".txt") || name.endsWith(".md")) text = await file.text();
    else throw documentError("docUnsupported");
  } catch (error) {
    throw error.i18nKey ? error : documentError("docReadFail");
  }

  const cleaned = text.replace(/[ \t\f\v]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  // Scanned PDFs are images with no text layer.
  if (cleaned.length < 40) throw documentError("docNoText");
  return { text: cleaned.slice(0, MAX_DOCUMENT_CHARS), truncated: cleaned.length > MAX_DOCUMENT_CHARS };
}
