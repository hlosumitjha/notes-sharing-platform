/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Note, Folder, User } from '../types.ts';
import { Fetcher } from '../utils/fetcher.ts';
import { 
  FolderPlus, Plus, Search, FileText, Pin, MoreVertical, Trash2, 
  AlertTriangle, ExternalLink, Archive, ChevronRight, ChevronDown, CheckCircle2, Globe 
} from 'lucide-react';

interface NotesListProps {
  currentUser: User;
  onEditNote: (noteId: string) => void;
  activeNoteId: string | null;
}

export function NotesList({ currentUser, onEditNote, activeNoteId }: NotesListProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering Controls
  const [search, setSearch] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedTag, setSelectedTag] = useState<string>('All');
  
  // Folder toggling to collapse nested trees
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  // CRUD Forms
  const [newFolderName, setNewFolderName] = useState('');
  const [folderFormOpen, setFolderFormOpen] = useState(false);
  const [newNoteCategory, setNewNoteCategory] = useState('Computer Science');

  // Academic Report Forms
  const [reportingNoteId, setReportingNoteId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [allNotes, allFolders] = await Promise.all([
        Fetcher.get('/api/notes'),
        Fetcher.get('/api/folders')
      ]);
      setNotes(allNotes);
      setFolders(allFolders);
    } catch (err: any) {
      setError(err.message || 'Failed to sync studies archive.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeNoteId]);

  const handleCreateNote = async () => {
    try {
      const newNote = await Fetcher.post('/api/notes', {
        title: 'New Collaborative Study Notes',
        category: newNoteCategory,
        folderId: selectedFolder || undefined
      });
      setNotes(prev => [newNote, ...prev]);
      onEditNote(newNote.id);
    } catch (err: any) {
      alert(err.message || 'Failed establishing note container.');
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      const added = await Fetcher.post('/api/folders', { name: newFolderName });
      setFolders(prev => [...prev, added]);
      setNewFolderName('');
      setFolderFormOpen(false);
    } catch (err: any) {
      alert(err.message || 'Folder creation failed.');
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!window.confirm('Delete folder workspace? All documents inside will move to unorganized roots.')) return;
    try {
      await Fetcher.delete(`/api/folders/${folderId}`);
      setFolders(prev => prev.filter(f => f.id !== folderId));
      loadData(); // Reload notes status
    } catch (err: any) {
      alert(err.message || 'Failed deleting folder workspace.');
    }
  };

  const handleDeleteNote = async (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you certain you wish to purge this note from academic archives?')) return;
    try {
      await Fetcher.delete(`/api/notes/${noteId}`);
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err: any) {
      alert(err.message || 'Failed deleting note.');
    }
  };

  const handleAddReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingNoteId) return;

    try {
      await Fetcher.post('/api/reports', {
        noteId: reportingNoteId,
        reason: reportReason
      });
      alert('Academic policy violation submitted to administrators.');
      setReportingNoteId(null);
      setReportReason('');
    } catch (err: any) {
      alert(err.message || 'Failed to file policy report.');
    }
  };

  const toggleFolderCollapse = (fldId: string) => {
    setCollapsedFolders(prev => ({
      ...prev,
      [fldId]: !prev[fldId]
    }));
  };

  // Drag and drop folders nesting simulation
  const handleMoveToFolder = async (noteId: string, folderId: string | null) => {
    try {
      const updated = await Fetcher.put(`/api/notes/${noteId}`, { folderId: folderId || null });
      setNotes(prev => prev.map(n => n.id === noteId ? updated : n));
    } catch (err: any) {
      alert(err.message || 'Failed transitioning file nested path.');
    }
  };

  // Extract all categories of available studies notes
  const categories = ['All', ...Array.from(new Set(notes.map(n => n.category)))];
  
  // Extract all tags across all notes
  const allTags = ['All', ...Array.from(new Set(notes.flatMap(n => n.tags || [])))];

  // Filters calculation
  const filteredNotes = notes.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(search.toLowerCase()) || 
                          n.content.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || n.category === selectedCategory;
    const matchesTag = selectedTag === 'All' || n.tags?.includes(selectedTag);
    return matchesSearch && matchesCategory && matchesTag;
  });

  const pinnedNotes = filteredNotes.filter(n => n.pinned && !n.archived);
  const standardNotes = filteredNotes.filter(n => !n.pinned && !n.archived);

  return (
    <div id="notes-list-management" className="space-y-6">
      
      {/* Search and Advanced Filters layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-900/30 p-4 rounded-2xl border border-slate-800">
        <div className="md:col-span-5 relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search studies bibliography, text contents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-sans"
          />
        </div>

        <div className="md:col-span-3 flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg px-2 text-xs select-none">
          <span className="text-slate-500 text-[10px] uppercase font-mono">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-transparent text-slate-300 border-none outline-none font-sans py-1 max-w-28 text-xs font-semibold focus:ring-0 cursor-pointer"
          >
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        <div className="md:col-span-3 flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg px-2 text-xs select-none">
          <span className="text-slate-500 text-[10px] uppercase font-mono">Tag Filter:</span>
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="bg-transparent text-slate-300 border-none outline-none font-sans py-1 max-w-28 text-xs font-semibold focus:ring-0 cursor-pointer"
          >
            {allTags.map(t => <option key={t} value={t}>#{t}</option>)}
          </select>
        </div>

        <div className="md:col-span-1 flex justify-end">
          <button
            onClick={() => setFolderFormOpen(!folderFormOpen)}
            className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-slate-200 transition"
            title="Create Directory"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {folderFormOpen && (
        <form onSubmit={handleCreateFolder} className="bg-slate-950 border border-slate-900 p-4 rounded-xl flex gap-3 max-w-sm ml-auto animate-fadeIn">
          <input
            type="text"
            placeholder="New folder name..."
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
            required
          />
          <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white font-mono text-xs rounded uppercase font-semibold hover:bg-indigo-500 transition cursor-pointer">Make</button>
        </form>
      )}

      {/* Main dashboard body: side folders tree + note templates catalog */}
      {loading ? (
        <div className="text-center py-10 font-mono text-xs text-slate-500 animate-pulse">Scanning academic notes library...</div>
      ) : error ? (
        <div className="p-4 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-xs font-mono">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Folders Trees Sidebar */}
          <div className="md:col-span-4 space-y-3 bg-slate-900/10 border border-slate-905 p-4 rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-900 pb-2">
              <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider font-bold">Workspace Structures</span>
              <span className="text-[9px] text-slate-500 font-mono">Folders count: {folders.length}</span>
            </div>

            <button 
              onClick={() => setSelectedFolder(null)}
              className={`w-full text-left py-2 px-3 rounded-lg text-xs font-mono transition flex items-center justify-between cursor-pointer ${selectedFolder === null ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'}`}
            >
              <span>📂 Unorganized Ground Rootss</span>
            </button>

            <div className="space-y-1 max-h-72 overflow-y-auto">
              {folders.map(f => {
                const folderNotes = notes.filter(n => n.folderId === f.id);
                return (
                  <div key={f.id} className="space-y-0.5">
                    <div 
                      className={`w-full py-2 px-2 rounded-lg text-xs font-sans transition flex items-center justify-between cursor-pointer border ${selectedFolder === f.id ? 'bg-slate-900/80 text-indigo-400 border-slate-800' : 'text-slate-300 border-transparent hover:bg-slate-950/40'}`}
                      onClick={() => setSelectedFolder(f.id)}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <button onClick={(e) => { e.stopPropagation(); toggleFolderCollapse(f.id); }} className="p-0.5 hover:text-indigo-400">
                          {collapsedFolders[f.id] ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                        <span className="truncate">{f.name}</span>
                        <span className="text-[9px] text-slate-500 font-mono font-semibold bg-slate-950 px-1 rounded">({folderNotes.length})</span>
                      </div>

                      {currentUser.id === f.ownerId && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteFolder(f.id); }} 
                          className="p-1 hover:text-red-400 transition"
                          title="Purge folder"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {!collapsedFolders[f.id] && folderNotes.length > 0 && (
                      <div className="pl-4 border-l border-slate-900/60 ml-3.5 space-y-0.5 animate-fadeIn">
                        {folderNotes.map(n => (
                          <div
                            key={n.id}
                            onClick={() => onEditNote(n.id)}
                            className="py-1 px-2 hover:bg-slate-900/20 rounded text-[11px] text-slate-400 hover:text-slate-200 truncate cursor-pointer flex items-center gap-1.5"
                          >
                            <FileText className="w-3 h-3 text-slate-500" />
                            <span className="truncate">{n.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes display List columns */}
          <div className="md:col-span-8 space-y-4">
            
            {/* Folder context details banner */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-sans font-bold text-lg text-slate-200 tracking-tight">
                  {selectedFolder 
                    ? `Workspace Folder: ${folders.find(f => f.id === selectedFolder)?.name || 'Direct nested'}`
                    : 'Structured Ground Roots Library'
                  }
                </h3>
                <p className="text-xs text-slate-500 font-sans mt-0.5">Double click notes card to launch dynamic collaboration workspace.</p>
              </div>

              <div className="flex gap-2 items-center">
                <select
                  value={newNoteCategory}
                  onChange={(e) => setNewNoteCategory(e.target.value)}
                  className="bg-slate-950 border border-slate-900 text-slate-400 text-[10px] font-mono rounded px-2 py-1 select-none"
                >
                  <option value="Computer Science">Computer Science</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="General Studies">General Studies</option>
                </select>

                <button
                  onClick={handleCreateNote}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs rounded-xl shadow-md transition flex items-center gap-1 font-semibold cursor-pointer shadow-indigo-600/20"
                >
                  <Plus className="w-4 h-4" /> NOTE
                </button>
              </div>
            </div>

            {/* Segmented display lists: Pinned first */}
            {pinnedNotes.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-amber-400 font-mono tracking-widest flex items-center gap-1"><Pin className="w-3 h-3" /> PINNED MATERIAL ({pinnedNotes.length})</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {pinnedNotes.map(n => renderNoteCard(n))}
                </div>
              </div>
            )}

            <div className="space-y-2 pt-3">
              <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">BIBLIOGRAPHY ARCHIVE ({standardNotes.length})</p>
              
              {standardNotes.length === 0 && pinnedNotes.length === 0 ? (
                <div className="p-16 text-center bg-slate-950/20 border-2 border-dashed border-slate-900 rounded-2xl">
                  <FileText className="w-8 h-8 text-slate-700 mx-auto mb-2 animate-bounce" />
                  <p className="text-xs font-mono text-slate-500">Academic shelf empty. Tap "+ NOTE" to establish study records.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {standardNotes.map(n => renderNoteCard(n))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Reports violate cases modal overlay */}
      {reportingNoteId && (
        <div id="violation-reporter-overlay" className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAddReport} className="bg-slate-950 border border-slate-800 p-5 rounded-xl max-w-sm w-full space-y-4">
            <div className="flex justify-between items-center border-b border-slate-900 pb-2">
              <h3 className="text-slate-100 font-sans font-bold flex items-center gap-1"><AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" /> File Misconduct Flag</h3>
              <button onClick={() => setReportingNoteId(null)} className="text-slate-500 font-mono text-xs hover:text-slate-300">Close</button>
            </div>
            
            <p className="text-xs text-slate-400 font-sans leading-relaxed">Let platform moderators review plagiarism, incorrect homework proofs, or academic policy issues within this document.</p>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">DESCRIBE DEVIATION DETAIL</label>
              <textarea
                placeholder="Suggest plagiarized sources, describe violations, or clarify correction needs."
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-xs text-slate-300 focus:outline-none focus:border-red-500 min-h-24 font-sans"
                required
              />
            </div>

            <button type="submit" className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-mono text-xs rounded uppercase font-bold tracking-widest transition">
              SUBMIT ACCUSATION FOR REVIEW
            </button>
          </form>
        </div>
      )}

    </div>
  );

  // Modular helper to draw responsive glass note templates
  function renderNoteCard(n: Note) {
    const isOwner = n.ownerId === currentUser.id;
    return (
      <div 
        key={n.id}
        onDoubleClick={() => onEditNote(n.id)}
        className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between hover:border-indigo-500/40 hover:bg-slate-900/60 transition group cursor-pointer relative shadow-lg hover:shadow-indigo-500/5"
      >
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="px-2 py-0.5 text-[9px] font-mono font-semibold rounded bg-slate-950 text-slate-400 capitalize">{n.category}</span>
            <div className="flex gap-2 items-center text-slate-600">
              {n.isPublic && <Globe className="w-3.5 h-3.5 text-blue-400" title="Public note Link" />}
              {n.collaborators?.length > 0 && <span className="text-[10px] font-mono bg-blue-500/10 text-indigo-400 px-1 rounded uppercase border border-indigo-500/15">peer co-op</span>}
            </div>
          </div>

          <h4 className="font-sans font-bold text-slate-100 text-sm group-hover:text-indigo-400 transition">{n.title}</h4>
          <p className="text-xs text-slate-400 line-clamp-3 mt-1.5 leading-relaxed font-sans">{n.content.replace(/[#*`[\]]/g, ' ') || 'Blank drafts academic reference material...'}</p>
        </div>

        <div className="border-t border-slate-950/60 pt-3 mt-4 flex items-center justify-between text-[10px] font-mono text-slate-500">
          <div>
            <p className="font-semibold text-slate-400 text-[11px] truncate">By: {isOwner ? 'You (Owner)' : n.ownerName}</p>
            <p className="text-[9px] text-slate-500 font-mono mt-0.5">{new Date(n.updatedAt).toLocaleDateString()}</p>
          </div>

          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition duration-150">
            {/* Quick Actions inside Card footer */}
            <select
              title="Nest within folders"
              onChange={(e) => handleMoveToFolder(n.id, e.target.value || null)}
              value={n.folderId || ''}
              className="bg-slate-950 border border-slate-800 text-slate-400 py-0.5 px-1.5 text-[9px] font-semibold rounded outline-none select-none"
              onClick={(e) => e.stopPropagation()}
            >
              <option value="">Move folder...</option>
              {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>

            <button
              onClick={(e) => { e.stopPropagation(); setReportingNoteId(n.id); }}
              className="p-1 px-1.5 bg-slate-950 border border-slate-800 hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-400 rounded text-slate-500 transition"
              title="Report Misconduct"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
            </button>

            {isOwner && (
              <button
                onClick={(e) => handleDeleteNote(n.id, e)}
                className="p-1 px-1.5 bg-slate-950 border border-slate-800 hover:border-red-500 hover:text-red-400 rounded text-slate-500 transition"
                title="Delete note"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
