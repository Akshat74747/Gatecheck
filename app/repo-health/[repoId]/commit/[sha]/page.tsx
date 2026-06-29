'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, ZoomIn, ZoomOut, ExternalLink, FileCode } from 'lucide-react';
import DashboardLayout from '../../../../components/DashboardLayout';

interface CommitFile {
  filename: string;
  additions: number;
  deletions: number;
  status: string;
  patch?: string;
}

interface CommitData {
  sha: string;
  message: string;
  author: string;
  date: string;
  htmlUrl: string;
  files: CommitFile[];
}

function DiffLine({ line, fontSize }: { line: string; fontSize: number }) {
  const isAdd = line.startsWith('+') && !line.startsWith('+++');
  const isDel = line.startsWith('-') && !line.startsWith('---');
  const isHunk = line.startsWith('@@');

  let bg = 'transparent';
  let color = '#94a3b8';
  if (isAdd) { bg = 'rgba(74,222,128,0.08)'; color = '#4ade80'; }
  if (isDel) { bg = 'rgba(248,113,113,0.08)'; color = '#f87171'; }
  if (isHunk) { color = '#818cf8'; }

  return (
    <div
      style={{
        background: bg,
        color,
        fontSize,
        fontFamily: 'monospace',
        padding: '1px 12px',
        whiteSpace: 'pre',
        lineHeight: '1.6',
      }}
    >
      {line || ' '}
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export default function CommitDiffPage({
  params,
}: {
  params: Promise<{ repoId: string; sha: string }>;
}) {
  const { repoId, sha } = use(params);
  const [data, setData] = useState<CommitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<CommitFile | null>(null);
  const [fontSize, setFontSize] = useState(12);

  useEffect(() => {
    fetch(`/api/repo-health/${repoId}/commit/${sha}`)
      .then(r => r.json())
      .then((d: CommitData) => {
        setData(d);
        if (d.files?.length > 0) setSelectedFile(d.files[0]);
        setLoading(false);
      });
  }, [repoId, sha]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === '=') { e.preventDefault(); setFontSize(f => Math.min(f + 1, 18)); }
      if ((e.metaKey || e.ctrlKey) && e.key === '-') { e.preventDefault(); setFontSize(f => Math.max(f - 1, 10)); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout>
        <div className="clay p-12 text-center">
          <p className="text-muted-foreground">Commit not found or GitHub API error.</p>
          <Link href={`/repo-health/${repoId}`}>
            <button className="mt-4 text-primary text-sm hover:underline">← Back to Repo Health</button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const diffLines = selectedFile?.patch?.split('\n') ?? [];

  return (
    <DashboardLayout>
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <Link
            href={`/repo-health/${repoId}`}
            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" /> Back to Repo Health
          </Link>
          <span className="text-muted-foreground/30">·</span>
          <span className="text-sm font-mono text-muted-foreground">Commit {sha.slice(0, 7)}</span>
          {data.htmlUrl && (
            <a href={data.htmlUrl} target="_blank" rel="noreferrer" className="text-muted-foreground/50 hover:text-muted-foreground">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFontSize(f => Math.max(f - 1, 10))}
            className="clay-pill p-1.5 text-muted-foreground hover:text-foreground"
            title="Zoom out (Ctrl -)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs text-muted-foreground font-mono">{fontSize}px</span>
          <button
            onClick={() => setFontSize(f => Math.min(f + 1, 18))}
            className="clay-pill p-1.5 text-muted-foreground hover:text-foreground"
            title="Zoom in (Ctrl +)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] text-muted-foreground/40">{formatDate(data.date)}</span>
        </div>
      </div>

      {/* Commit message */}
      <div className="clay-sm px-4 py-3 mb-4">
        <p className="text-sm font-semibold">{data.message.split('\n')[0]}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{data.author}</p>
      </div>

      {/* Two-panel layout */}
      <div className="flex gap-3" style={{ minHeight: '60vh' }}>
        {/* Left: file list */}
        <div className="clay-sm w-64 flex-shrink-0 overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 border-b border-white/[0.04]">
            <p className="text-xs font-semibold text-muted-foreground">
              Changed Files ({data.files.length})
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {data.files.map((f, i) => {
              const parts = f.filename.split('/');
              const name = parts.pop() ?? f.filename;
              const path = parts.join('/');
              const isSelected = selectedFile?.filename === f.filename;
              return (
                <button
                  key={i}
                  onClick={() => setSelectedFile(f)}
                  className={`w-full text-left px-4 py-2.5 border-b border-white/[0.02] transition-colors ${
                    isSelected ? 'bg-primary/10' : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <FileCode className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="min-w-0 flex-1">
                      {path && <p className="text-[9px] text-muted-foreground/50 truncate">{path}</p>}
                      <p className={`text-xs font-mono truncate ${isSelected ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                        {name}
                      </p>
                      <div className="flex gap-1.5 mt-0.5">
                        {f.additions > 0 && (
                          <span className="text-[9px] text-[#4ade80] font-mono">+{f.additions}</span>
                        )}
                        {f.deletions > 0 && (
                          <span className="text-[9px] text-[#f87171] font-mono">-{f.deletions}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: diff viewer */}
        <div className="clay-sm flex-1 overflow-hidden flex flex-col min-w-0">
          {selectedFile ? (
            <>
              <div className="px-4 py-2.5 border-b border-white/[0.04] flex items-center justify-between">
                <p className="text-xs font-mono text-muted-foreground">{selectedFile.filename}</p>
                <div className="flex gap-2 text-[10px]">
                  <span className="text-[#4ade80]">+{selectedFile.additions}</span>
                  <span className="text-[#f87171]">-{selectedFile.deletions}</span>
                </div>
              </div>
              {selectedFile.patch ? (
                <div className="flex-1 overflow-auto">
                  {diffLines.map((line, i) => (
                    <DiffLine key={i} line={line} fontSize={fontSize} />
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">
                    {selectedFile.status === 'renamed' ? 'File renamed — no patch available.' :
                     selectedFile.status === 'binary' ? 'Binary file — diff not shown.' :
                     'No diff available for this file.'}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Select a file to view its diff.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
