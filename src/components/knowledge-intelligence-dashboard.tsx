"use client";

import { useState } from "react";
import { Database, FileText, Search as SearchIcon, Zap, Layers, Network, Plus, Pencil, ArrowRight } from "lucide-react";
import { useRecordComposer } from "@/components/records/record-composer";
import { RecordStatus } from "@/components/records/record-status";
import { matchesSearch, metricNumber, metricText, relativeTime, useRecords } from "@/components/records/use-records";

type SearchResult = { id: string; title: string; kind: string; source: string; excerpt: string; score?: number; match?: string };

export function KnowledgeIntelligenceDashboard() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searchMode, setSearchMode] = useState("");
  const [searchError, setSearchError] = useState("");
  const state = useRecords("vector-index");
  const { composer, openNew, openEdit } = useRecordComposer("vector-index", state);

  const filtered = state.records.filter(record => matchesSearch(record, query, [record.metrics.chunks, record.metrics.collection]));

  const documents = state.records.length;
  const chunks = state.records.reduce((sum, record) => sum + metricNumber(record, "chunks"), 0);
  const indexing = state.records.filter(record => record.status !== "synced").length;

  async function runSearch() {
    if (query.trim().length < 2) return;
    setSearching(true);
    setSearchError("");
    const response = await fetch(`/api/knowledge/search?q=${encodeURIComponent(query.trim())}`).catch(() => null);
    setSearching(false);
    if (!response || !response.ok) { setSearchError("That search could not be completed."); return; }
    const payload = await response.json().catch(() => null) as { results?: SearchResult[]; mode?: string } | null;
    setResults(payload?.results ?? []);
    setSearchMode(payload?.mode ?? "local-keyword");
  }

  return (
    <div className="repos-dashboard">
      {composer}
      <div className="repos-header">
        <div className="repos-title">
          <h2>Knowledge Intelligence</h2>
          <p>Monitor indexed documents, semantic chunks, and cross-document search.</p>
        </div>
        <div className="repos-actions">
          <button className="primary-button" onClick={openNew}><Plus size={14}/> Track document</button>
        </div>
      </div>

      {state.records.length > 0 && (
        <div className="test-overview">
          <div className="test-metric-card">
            <span>Indexed Documents</span>
            <strong>{documents}</strong>
            <Database size={16} className="text-purple"/>
          </div>
          <div className="test-metric-card">
            <span>Semantic Chunks</span>
            <strong>{chunks.toLocaleString()}</strong>
            <Layers size={16} className="text-mint"/>
          </div>
          <div className="test-metric-card">
            <span>Pending Indexing</span>
            <strong style={{color: indexing > 0 ? '#e7cf9e' : undefined}}>{indexing}</strong>
            <Network size={16} className="text-blue"/>
          </div>
        </div>
      )}

      <RecordStatus
        loading={state.loading}
        error={state.error}
        count={state.records.length}
        noun="indexed documents"
        icon={FileText}
        emptyTitle="No indexed documents"
        emptyBody="Documents you add to the knowledge workspace appear here with their chunk counts and index status."
      />

      <div className="ki-main-grid">
        <div className="panel ki-search-panel">
          <div className="ki-search-header">
            <h3>Semantic Search</h3>
            <span className="status-chip"><span/> {searchMode === "hybrid" ? "HYBRID RETRIEVAL" : "LOCAL KEYWORD INDEX"}</span>
          </div>
          <div className="ki-search-box">
            <Zap size={16} className="text-mint"/>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") void runSearch(); }}
              placeholder="Ask a complex engineering question (e.g. 'How does the auth proxy handle token refresh?')"
              aria-label="Search the knowledge workspace"
            />
            <button className="primary-button" disabled={searching || query.trim().length < 2} onClick={() => void runSearch()}>
              {searching ? "Searching…" : "Query"}
            </button>
          </div>
          {searchError && <p className="record-status record-status-error">{searchError}</p>}
          {results === null ? (
            <div className="ki-search-empty">
              <SearchIcon size={32} className="ki-empty-icon"/>
              <p>Search spans tickets, codebases, and docs simultaneously.<br/>Results come from this workspace only.</p>
            </div>
          ) : results.length === 0 ? (
            <div className="ki-search-empty">
              <SearchIcon size={28} className="ki-empty-icon"/>
              <p>No documents match “{query}”.<br/>Add knowledge documents or widen the search.</p>
            </div>
          ) : (
            <div className="ki-results">
              {results.map(result => (
                <article className="ki-result" key={result.id}>
                  <div className="ki-result-head">
                    <strong>{result.title}</strong>
                    <span className="pr-badge" style={{background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line)', color: 'var(--muted)'}}>{result.kind}</span>
                    {result.match && <span className="pr-badge" style={{background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--line)', color: '#a0acb3'}}>{result.match}</span>}
                  </div>
                  <p>{result.excerpt}</p>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="panel ki-index-panel">
          <div className="rail-heading"><h2>Vector Index Pipeline</h2></div>
          <div className="ki-index-list">
            {filtered.map(record => (
              <div key={record.id} className="ki-index-row">
                <FileText size={14} className="text-muted"/>
                <div className="ki-index-main">
                  <strong>{record.title}</strong>
                  <span>{record.subtitle || "Document"} • {metricNumber(record, "chunks")} chunks{metricText(record, "collection", "") !== "" ? ` • ${metricText(record, "collection")}` : ""}</span>
                </div>
                <div className="ki-index-status">
                  <button
                    className="record-status-cycle"
                    data-tone={record.status === "synced" ? "good" : record.status === "failed" ? "bad" : "warn"}
                    title="Cycle index status"
                    onClick={() => void state.setStatus(record, record.status === "synced" ? "indexing" : record.status === "indexing" ? "failed" : "synced")}
                  >
                    {record.status === "synced" ? `Synced ${relativeTime(record.updatedAt)}` : record.status}
                  </button>
                  <button className="record-row-action" onClick={() => openEdit(record)} aria-label="Edit document"><Pencil size={13}/></button>
                </div>
              </div>
            ))}
          </div>
          <button className="activity-footer" style={{marginTop: 'auto', borderTop: '1px solid var(--line)'}} onClick={openNew}>
            Track another document <ArrowRight size={13}/>
          </button>
        </div>
      </div>
    </div>
  );
}