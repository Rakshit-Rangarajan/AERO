import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { extractDocumentText } from "./document-extraction";

describe("extractDocumentText", () => {
  it("extracts normalized UTF-8 text files", async () => {
    const result = await extractDocumentText("notes.md", Buffer.from("  hello\r\n\r\n\r\nworld  "));
    expect(result.text).toBe("hello\n\nworld");
    expect(result.pages).toBeNull();
  });

  it("extracts searchable text from DOCX", async () => {
    const bytes = new Uint8Array(await readFile(new URL("./document-fixtures/text-sample.docx", import.meta.url)));
    const result = await extractDocumentText("sample.docx", bytes);
    expect(result.text).toContain("AERO DOCX extraction fixture");
    expect(result.pages).toBeNull();
  });

  it("extracts page text from text-based PDFs", async () => {
    const bytes = new Uint8Array(await readFile(new URL("./document-fixtures/text-sample.pdf", import.meta.url)));
    const result = await extractDocumentText("sample.pdf", bytes);
    expect(result.text).toContain("[Page 1]");
    expect(result.text).toContain("AERO PDF extraction fixture");
    expect(result.pages).toBe(1);
  });

  it("rejects corrupt office documents and unsupported formats", async () => {
    await expect(extractDocumentText("bad.docx", Buffer.from("not a document"))).rejects.toThrow();
    await expect(extractDocumentText("archive.zip", Buffer.from("anything"))).rejects.toThrow("Supported formats");
  });
});
