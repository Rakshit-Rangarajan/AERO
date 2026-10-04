import mammoth from "mammoth";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

// Resolve the worker at runtime so Next.js standalone bundles do not rewrite its
// relative path to a nonexistent chunk beside the server bundle.
const runtimeRequire = createRequire(path.join(process.cwd(), "package.json"));
GlobalWorkerOptions.workerSrc = pathToFileURL(runtimeRequire.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs")).href;

export const MAX_EXTRACTED_CHARACTERS = 250_000;
export const MAX_PDF_PAGES = 100;

function normalizeText(value: string) {
  return value.replace(/\u0000/g, "").replace(/\r\n?/g, "\n").replace(/[\t\u00a0]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_EXTRACTED_CHARACTERS);
}

export async function extractDocumentText(fileName: string, bytes: Uint8Array) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (["txt", "md", "json", "csv"].includes(extension ?? "")) {
    return { text: normalizeText(new TextDecoder("utf-8", { fatal: false }).decode(bytes)), pages: null as number | null };
  }
  if (extension === "docx") {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    return { text: normalizeText(result.value), pages: null as number | null };
  }
  if (extension === "pdf") {
    const loadingTask = getDocument({ data: bytes, useSystemFonts: true });
    const pdf = await loadingTask.promise;
    try {
      if (pdf.numPages > MAX_PDF_PAGES) throw new Error(`PDFs are limited to ${MAX_PDF_PAGES} pages.`);
      const pages: string[] = [];
      let length = 0;
      for (let pageNumber = 1; pageNumber <= pdf.numPages && length < MAX_EXTRACTED_CHARACTERS; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const text = content.items.map(item => "str" in item ? item.str : "").join(" ").trim();
        if (text) pages.push(`[Page ${pageNumber}]\n${text}`);
        length += text.length;
        page.cleanup();
      }
      return { text: normalizeText(pages.join("\n\n")), pages: pdf.numPages };
    } finally {
      await loadingTask.destroy();
    }
  }
  throw new Error("Supported formats are TXT, Markdown, JSON, CSV, PDF, and DOCX.");
}
