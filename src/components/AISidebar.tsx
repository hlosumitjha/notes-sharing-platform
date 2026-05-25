/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Note } from '../types.ts';
import { Fetcher } from '../utils/fetcher.ts';
import { Sparkles, FileText, Gift, Lightbulb, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

interface AISidebarProps {
  activeNote: Note | null;
}

export function AISidebar({ activeNote }: AISidebarProps) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [studyGuide, setStudyGuide] = useState('');
  const [openedAccordion, setOpenedAccordion] = useState<string | null>(null);

  const triggerSummary = async () => {
    if (!activeNote) return;
    setLoading(true);
    setSummary('');
    try {
      const res = await Fetcher.post(`/api/notes/${activeNote.id}/ai-summary`, {});
      setSummary(res.summary);
    } catch (err: any) {
      setSummary(`AI Error: ${err.message || 'Summarizer unavailable.'}`);
    } finally {
      setLoading(false);
    }
  };

  const triggerStudyGuide = async () => {
    if (!activeNote) return;
    setLoading(true);
    setStudyGuide('');
    try {
      const res = await Fetcher.post(`/api/notes/${activeNote.id}/ai-study-guide`, {});
      setStudyGuide(res.studyGuide);
    } catch (err: any) {
      setStudyGuide(`AI Error: ${err.message || 'Study guide failed.'}`);
    } finally {
      setLoading(false);
    }
  };

  // Custom regex markdown formatter for nice looking styling
  const formatMarkdown = (md: string) => {
    if (!md) return null;
    const lines = md.split('\n');
    return lines.map((line, idx) => {
      // Header 1
      if (line.startsWith('# ')) {
        return <h3 key={idx} className="text-md font-bold text-slate-100 border-b border-slate-900 pb-1 mt-4 mb-2">{line.replace('# ', '')}</h3>;
      }
      // Header 2 Or 3
      if (line.startsWith('## ') || line.startsWith('### ')) {
        return <h4 key={idx} className="text-sm font-semibold text-indigo-400 mt-3 mb-1.5">{line.replace('## ', '').replace('### ', '')}</h4>;
      }
      // ChecklistItem
      if (line.trim().startsWith('- [ ] ') || line.trim().startsWith('- [x] ')) {
        const checked = line.includes('[x]');
        return (
          <div key={idx} className="flex items-center gap-2 text-xs text-slate-300 py-1 font-sans">
            <input type="checkbox" checked={checked} readOnly className="w-3.5 h-3.5 rounded border-slate-800 bg-slate-950 focus:ring-0 text-indigo-500 rounded" />
            <span>{line.replace('- [ ] ', '').replace('- [x] ', '')}</span>
          </div>
        );
      }
      // Bullet lists
      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        return (
          <li key={idx} className="text-xs text-slate-300 list-disc list-inside ml-2 py-0.5 font-sans leading-relaxed">
            {line.replace('* ', '').replace('- ', '')}
          </li>
        );
      }
      // Paragraph line
      if (line.trim()) {
        // Highlight some bold parts
        const boldRegex = /\*\*(.*?)\*\*/g;
        const parts = [];
        let lastIdx = 0;
        let match;
        while ((match = boldRegex.exec(line)) !== null) {
          if (match.index > lastIdx) {
            parts.push(line.substring(lastIdx, match.index));
          }
          parts.push(<strong key={match.index} className="text-slate-100 font-semibold">{match[1]}</strong>);
          lastIdx = boldRegex.lastIndex;
        }
        if (lastIdx < line.length) {
          parts.push(line.substring(lastIdx));
        }

        return <p key={idx} className="text-xs text-slate-400 font-sans leading-relaxed py-1">{parts.length > 0 ? parts : line}</p>;
      }
      return <div key={idx} className="h-2" />;
    });
  };

  if (!activeNote) {
    return (
      <div className="h-full flex flex-col justify-center items-center text-center p-6 bg-slate-950/20 border border-slate-900 rounded-2xl">
        <Sparkles className="w-6 h-6 text-slate-600 mb-3 animate-pulse" />
        <p className="text-xs font-mono text-slate-500">Pick or create a study note to engage Google Gemini tutors.</p>
      </div>
    );
  }

  return (
    <div id="ai-sidebar-container" className="bg-slate-950/20 border border-slate-900 p-5 rounded-2xl flex flex-col space-y-4 h-full overflow-y-auto">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-900">
        <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
        <div>
          <h3 className="font-sans font-bold text-sm text-slate-200">Gemini Academic Assistant</h3>
          <p className="text-[10px] text-slate-500 font-mono">Powered by gemini-3.5-flash</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">ACTIVE NOTE PROFILE</p>
        <div className="bg-slate-900/40 border border-slate-800/60 p-3 rounded-xl">
          <p className="font-sans font-bold text-xs text-slate-200 truncate">{activeNote.title}</p>
          <p className="text-[10px] font-mono text-slate-500 mt-1">{activeNote.category} • {activeNote.content.length} characters</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={triggerSummary}
          disabled={loading}
          className="px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-mono text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer shadow-indigo-600/10"
        >
          <FileText className="w-3.5 h-3.5" /> SUMMARIZE
        </button>

        <button
          onClick={triggerStudyGuide}
          disabled={loading}
          className="px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 text-white font-mono text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer shadow-indigo-600/10"
        >
          <Lightbulb className="w-3.5 h-3.5" /> STUDY GUIDE
        </button>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-10 bg-slate-900/10 rounded-xl border border-slate-900 animate-pulse col-span-2">
          <div className="w-5 h-5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
          <p className="text-[10px] font-mono text-indigo-400">Gemini is synthesising study materials...</p>
        </div>
      )}

      {/* Structured Reports Output */}
      {!loading && summary && (
        <div id="summary-output-card" className="bg-slate-950 border border-indigo-500/10 p-4 rounded-xl space-y-2 shadow-inner">
          <div className="flex items-center justify-between border-b border-slate-900 pb-1 mb-2">
            <span className="text-[10px] text-indigo-400 font-mono tracking-wider font-semibold uppercase flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Core Summary
            </span>
            <button onClick={() => setSummary('')} className="text-slate-600 hover:text-slate-400 text-[10px] font-mono">Dismiss</button>
          </div>
          <div className="prose prose-invert max-w-none text-slate-300">
            {formatMarkdown(summary)}
          </div>
        </div>
      )}

      {!loading && studyGuide && (
        <div id="study-guide-output-card" className="bg-slate-950 border border-blue-500/10 p-4 rounded-xl space-y-2 shadow-inner">
          <div className="flex items-center justify-between border-b border-slate-900 pb-1 mb-2">
            <span className="text-[10px] text-blue-400 font-mono tracking-wider font-semibold uppercase flex items-center gap-1">
              <Lightbulb className="w-3 h-3" /> STUDY GLOSSARY & QUIZZES
            </span>
            <button onClick={() => setStudyGuide('')} className="text-slate-600 hover:text-slate-400 text-[10px] font-mono">Dismiss</button>
          </div>
          <div className="prose prose-invert max-w-none text-slate-300">
            {formatMarkdown(studyGuide)}
          </div>
        </div>
      )}
    </div>
  );
}
