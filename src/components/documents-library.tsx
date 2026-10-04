"use client";

import { useEffect, useRef, useState } from "react";
import { Check, FileText, LoaderCircle, RefreshCw, Search, Trash2, UploadCloud } from "lucide-react";

type Document = { id: string; title: string; kind: string; source: string; createdAt: string; characters: number; vectorIndexed: number | boolean };

export function DocumentsLibrary({ sessionId, onUploaded }: { sessionId: string; onUploaded: () => void }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  async function load() {
    const response = await fetch("/api/documents", { cache: "no-store" });
    const result = await response.json();
    if (response.ok) setDocuments(result.documents);
    else setNotice(result.error ?? "Could not load documents.");
  }
  useEffect(() => {
    let active = true;
    fetch("/api/documents", { cache: "no-store" }).then(async response => ({ response, result: await response.json() })).then(({ response, result }) => {
      if (!active) return;
      if (response.ok) setDocuments(result.documents);
      else setNotice(result.error ?? "Could not load documents.");
    }).catch(() => { if (active) setNotice("Could not load documents."); });
    return () => { active = false; };
  }, []);

  async function upload(file?: File) {
    if (!file) return;
    setUploading(true); setNotice("");
    const form = new FormData(); form.set("file", file); form.set("sessionId", sessionId);
    const response = await fetch("/api/documents", { method: "POST", body: form });
    const result = await response.json();
    setUploading(false);
    setNotice(response.ok ? `${result.title} extracted (${result.characters.toLocaleString()} characters).` : result.error ?? "Document upload failed.");
    if (response.ok) { await load(); onUploaded(); }
    if (fileInput.current) fileInput.current.value = "";
  }

  async function reindex(document: Document) {
    setBusyId(document.id); setNotice("");
    const response = await fetch("/api/documents", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "reindex", id: document.id }) });
    const result = await response.json();
    setBusyId(""); setNotice(response.ok ? result.indexed ? `${document.title} reindexed in Qdrant.` : "An embedding provider must be configured before semantic indexing is available." : result.error ?? "Reindex failed.");
    await load();
  }

  async function remove(document: Document) {
    if (!window.confirm(`Delete “${document.title}” and its indexed vectors?`)) return;
    setBusyId(document.id); setNotice("");
    const response = await fetch(`/api/documents?id=${encodeURIComponent(document.id)}`, { method: "DELETE" });
    const result = await response.json();
    setBusyId(""); setNotice(response.ok ? `${document.title} deleted.` : result.error ?? "Delete failed.");
    if (response.ok) await load();
  }

  const visible = documents.filter(document => document.title.toLowerCase().includes(query.trim().toLowerCase()));
  return <section className="knowledge-page panel documents-library">
    <div className="panel-heading"><div className="panel-title-wrap"><span className="panel-icon"><FileText size={15}/></span><div><h2>Document library</h2><p>Extract, search, index, and remove local knowledge sources.</p></div></div><button className="primary-button" disabled={uploading} onClick={() => fileInput.current?.click()}>{uploading ? <LoaderCircle size={14} className="spin"/> : <UploadCloud size={14}/>} {uploading ? "Extracting…" : "Upload document"}<input ref={fileInput} hidden type="file" accept=".txt,.md,.json,.csv,.pdf,.docx" onChange={event => void upload(event.target.files?.[0])}/></button></div>
    <p className="documents-supported">TXT, Markdown, JSON, CSV, text-based PDF, and DOCX · 2 MB max · Scanned PDFs require OCR</p>
    {notice && <div className="documents-notice" role="status">{notice}</div>}
    <label className="knowledge-search documents-search"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Filter by document name…" aria-label="Filter documents"/><span>{visible.length} / {documents.length}</span></label>
    <div className="documents-list">{visible.length ? visible.map(document => <article className="document-row" key={document.id}><span className="panel-icon"><FileText size={15}/></span><div className="document-row-info"><strong>{document.title}</strong><small>{document.kind.toUpperCase()} · {document.characters.toLocaleString()} chars · {new Date(document.createdAt).toLocaleString()}</small></div><span className={`document-index-status ${document.vectorIndexed ? "indexed" : "local"}`}><i/>{document.vectorIndexed ? "SEMANTIC" : "KEYWORD"}</span><button className="icon-button" aria-label={`Reindex ${document.title}`} title="Reindex semantic vectors" disabled={Boolean(busyId)} onClick={() => void reindex(document)}>{busyId === document.id ? <LoaderCircle size={15} className="spin"/> : <RefreshCw size={15}/>}</button><button className="icon-button document-delete" aria-label={`Delete ${document.title}`} title="Delete document" disabled={Boolean(busyId)} onClick={() => void remove(document)}><Trash2 size={15}/></button></article>) : <div className="activity-empty"><span className="activity-pulse">{query ? <Search size={15}/> : <Check size={15}/>}</span><div><strong>{query ? "No matching documents" : "No documents indexed yet"}</strong><p>{query ? "Try another title." : "Upload a document to add searchable engineering knowledge."}</p></div></div>}</div>
  </section>;
}
