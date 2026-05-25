/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Note, User, Comment, Attachment } from '../types.ts';
import { Fetcher } from '../utils/fetcher.ts';
import { useNoteSocket } from '../hooks/useNoteSocket.ts';
import { 
  Save, Share2, Paperclip, MessageSquare, Clock, LucideIcon,
  Globe, Lock, ArrowLeft, ArrowUpRight, FolderHeart, Trash2, Send,
  FileCheck, Calendar, RefreshCw, Pin, Archive, Link2, Sparkles, FileImage 
} from 'lucide-react';

const getCursorColor = (userId: string) => {
  const colors = [
    { text: 'text-emerald-400', border: 'border-emerald-500/80 shadow-emerald-500/20', bg: 'bg-emerald-500' },
    { text: 'text-rose-400', border: 'border-rose-500/80 shadow-rose-500/20', bg: 'bg-rose-500' },
    { text: 'text-blue-400', border: 'border-blue-500/80 shadow-blue-500/20', bg: 'bg-blue-500' },
    { text: 'text-amber-400', border: 'border-amber-500/80 shadow-amber-500/20', bg: 'bg-amber-500' },
    { text: 'text-fuchsia-400', border: 'border-fuchsia-500/80 shadow-fuchsia-500/20', bg: 'bg-fuchsia-500' },
    { text: 'text-cyan-400', border: 'border-cyan-500/80 shadow-cyan-500/20', bg: 'bg-cyan-500' },
    { text: 'text-violet-400', border: 'border-violet-500/80 shadow-violet-500/20', bg: 'bg-violet-500' }
  ];
  let sum = 0;
  for (let i = 0; i < userId.length; i++) {
    sum += userId.charCodeAt(i);
  }
  return colors[sum % colors.length];
};

interface RichEditorProps {
  noteId: string;
  currentUser: User;
  onBack: () => void;
}

export function RichEditor({ noteId, currentUser, onBack }: RichEditorProps) {
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Auto-Save Management
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Shares Form Overlay
  const [shareOpen, setShareOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState<'view' | 'comment' | 'edit' | 'admin'>('edit');
  const [shareStatus, setShareStatus] = useState('');

  // Comment Thread Panel
  const [commentsOpen, setCommentsOpen] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');

  // Collaborative side section tab
  const [collaborativeTab, setCollaborativeTab] = useState<'comments' | 'livechat' | 'reviews'>('livechat');
  const [liveChatText, setLiveChatText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Teacher Review inputs
  const [reviewStatusInput, setReviewStatusInput] = useState<'pending' | 'reviewed' | 'approved' | 'rejected'>('pending');
  const [reviewScoreInput, setReviewScoreInput] = useState('');
  const [reviewCommentInput, setReviewCommentInput] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState('');

  // Initialize review inputs when note is loaded
  useEffect(() => {
    if (note) {
      setReviewStatusInput(note.reviewStatus || 'pending');
      setReviewScoreInput(note.reviewScore || '');
      setReviewCommentInput(note.reviewFeedback || '');
    }
  }, [note]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingReview(true);
    setReviewSuccessMsg('');
    try {
      const response = await Fetcher.put(`/api/notes/${noteId}`, {
        reviewStatus: reviewStatusInput,
        reviewScore: reviewScoreInput,
        reviewFeedback: reviewCommentInput,
        reviewedBy: currentUser.name,
        reviewedAt: new Date().toISOString()
      });
      setNote(response);
      setReviewSuccessMsg('Academic review updated successfully!');
      setTimeout(() => setReviewSuccessMsg(''), 3000);
    } catch (err: any) {
      console.error('Failed submitting academic review:', err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Attachment Management
  const [dragActive, setDragActive] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadMime, setUploadMime] = useState('');

  // Version Timeline State
  const [versionsOpen, setVersionsOpen] = useState(false);

  // Reference container for cursor coords tracking
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [collaborativeTab]);

  // WS Real-Time Coordination Setup
  const handleRemoteTextSync = (newText: string) => {
    setContent(newText);
  };

  const {
    presenceUsers,
    remoteCursors,
    typingUsers,
    isConnected,
    chatMessages,
    sendCursorMovement,
    sendTypingStatus,
    sendNoteEdit,
    sendChatMessage
  } = useNoteSocket(noteId, currentUser, handleRemoteTextSync);

  // Scroll to bottom when new messages stream in
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Fetch note initially
  const loadNote = async () => {
    try {
      setLoading(true);
      const data = await Fetcher.get(`/api/notes/${noteId}`);
      setNote(data);
      setTitle(data.title);
      setContent(data.content);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch note.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNote();
  }, [noteId]);

  // Load comments
  const loadComments = async () => {
    if (!noteId) return;
    try {
      const data = await Fetcher.get(`/api/notes/${noteId}/comments`);
      setComments(data);
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  useEffect(() => {
    if (commentsOpen) {
      loadComments();
    }
  }, [commentsOpen, noteId]);

  // Handle local keystrokes with typing statuses and auto save debouncers
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    
    // Broadcast text change to remote sockets instantly
    sendNoteEdit(val);

    // Keep active typing statuses
    sendTypingStatus(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(false);
      triggerAutoSave(val);
    }, 2000);
  };

  const triggerAutoSave = async (textToSave: string) => {
    setIsSaving(true);
    try {
      await Fetcher.put(`/api/notes/${noteId}`, { content: textToSave, title });
    } catch (err) {
      console.error('Failed auto-saving notes:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTitleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    try {
      await Fetcher.put(`/api/notes/${noteId}`, { title: val });
    } catch (err) {
      console.error('Title sync lost:', err);
    }
  };

  // Mouse move events coordinates tracking
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    // Compute percentage relative offsets
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    sendCursorMovement(x, y);
  };

  // Post Peer Invite Share
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareEmail.trim()) return;
    setShareStatus('Inviting...');
    try {
      const updated = await Fetcher.post(`/api/notes/${noteId}/collaborators`, {
        email: shareEmail,
        permission: sharePermission
      });
      setNote(updated);
      setShareEmail('');
      setShareStatus('Collaborator added successfully!');
      setTimeout(() => setShareStatus(''), 3000);
    } catch (err: any) {
      setShareStatus(`Error: ${err.message || 'Failed share invite.'}`);
    }
  };

  // Submit Comments
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    try {
      const added = await Fetcher.post(`/api/notes/${noteId}/comments`, { text: newCommentText });
      setComments(prev => [...prev, added]);
      setNewCommentText('');
    } catch (err: any) {
      alert(err.message || 'Comment failed.');
    }
  };

  // File drag & drops, reading base64 on client
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file) return;
    setUploadName(file.name);
    setUploadMime(file.type);

    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadPreview) return;
    try {
      const added = await Fetcher.post('/api/upload', {
        name: uploadName,
        base64: uploadPreview,
        mimeType: uploadMime,
        noteId
      });
      // Append attachment visually
      setNote(prev => prev ? { ...prev, attachments: [...(prev.attachments || []), added] } : prev);
      setUploadPreview(null);
      setUploadName('');
    } catch (err: any) {
      alert(err.message || 'Upload failed.');
    }
  };

  // Restore Historic note version
  const handleRestoreVersion = async (vIndex: number, versionContent: string, versionTitle: string) => {
    if (!window.confirm('Are you certain you wish to revert active document text to this historical checkpoint?')) return;
    try {
      setContent(versionContent);
      setTitle(versionTitle);
      // Sync on cloud
      const updated = await Fetcher.put(`/api/notes/${noteId}`, { content: versionContent, title: versionTitle });
      setNote(updated);
      sendNoteEdit(versionContent); // WS emit to live peers
      setVersionsOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed restoring version checkpoint.');
    }
  };

  // Pin / Archive toggles
  const handleTogglePin = async () => {
    if (!note) return;
    try {
      const updated = await Fetcher.put(`/api/notes/${noteId}`, { pinned: !note.pinned });
      setNote(updated);
    } catch (err: any) {
      alert(err.message || 'Action failed.');
    }
  };

  const handleToggleArchive = async () => {
    if (!note) return;
    try {
      const updated = await Fetcher.put(`/api/notes/${noteId}`, { archived: !note.archived });
      setNote(updated);
    } catch (err: any) {
      alert(err.message || 'Action failed.');
    }
  };

  const togglePublicLink = async () => {
    if (!note) return;
    try {
      const updated = await Fetcher.put(`/api/notes/${noteId}`, { isPublic: !note.isPublic });
      setNote(updated);
    } catch (err: any) {
      alert(err.message || 'Visibility toggle failed.');
    }
  };

  // Quick insertion helpers for editor
  const insertTextHelper = (markup: string) => {
    const el = document.getElementById('note-writing-canvas') as HTMLTextAreaElement;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const inserted = before + markup + after;
    setContent(inserted);
    sendNoteEdit(inserted);
    triggerAutoSave(inserted);
    el.focus();
  };

  // Quick checks to view user roles
  const isOwner = note?.ownerId === currentUser.id;
  const canModifyShares = isOwner || currentUser.role === 'admin';

  if (loading) {
    return <div className="text-center py-20 font-mono text-xs text-slate-500 animate-pulse">Establishing collaborative socket pipelines...</div>;
  }

  if (error || !note) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl space-y-4 max-w-md mx-auto text-center">
        <p className="text-sm font-mono text-red-400">{error || 'Unable to load studies note workspace.'}</p>
        <button onClick={onBack} className="px-4 py-2 bg-slate-900 font-mono text-xs text-slate-300 rounded hover:bg-slate-800 transition">BACK TO DASHBOARD</button>
      </div>
    );
  }

  return (
    <div ref={containerRef} onMouseMove={handleMouseMove} className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative min-h-[600px]">
      
      {/* Remote Live Cursor Overlays */}
      {Object.values(remoteCursors).map((cur: any) => {
        const uColor = getCursorColor(cur.userId);
        return (
          <div 
            key={cur.userId} 
            className="absolute z-50 pointer-events-none flex flex-col text-xs font-mono transition-all duration-75"
            style={{ left: `${cur.x}%`, top: `${cur.y}%` }}
          >
            <svg className={`w-4 h-4 ${uColor.text} drop-shadow`} fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
            <span className={`bg-slate-950 text-white border ${uColor.border} px-1.5 py-0.5 rounded text-[8px] whitespace-nowrap mt-1 shadow-lg`}>
              ⚡ {cur.userName}
            </span>
          </div>
        );
      })}

      {/* Primary Writing column */}
      <div className="lg:col-span-8 space-y-4 flex flex-col">
        {/* Navigation / Metadata Toolbar */}
        <div className="flex flex-wrap items-center justify-between bg-slate-900/40 p-3 rounded-xl border border-slate-800/80 gap-3">
          <button 
            onClick={onBack}
            className="p-1 px-3 bg-slate-950 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-300 rounded-lg text-xs font-mono flex items-center gap-1.5 transition select-none"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-900/90">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className="font-mono text-[9px] uppercase font-bold tracking-wider text-slate-350">
                {isConnected ? 'LIVE SESSION' : 'OFFLINE CHANNELS'}
              </span>
            </div>

            {/* Live Peer Rosters */}
            {presenceUsers.length > 0 && (
              <div className="flex items-center -space-x-1.5 overflow-visible">
                {presenceUsers.map((u) => {
                  const isUserTyping = !!typingUsers[u.userId];
                  return (
                    <div key={u.userId} className="relative group flex items-center justify-center">
                      <img 
                        src={u.userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'} 
                        alt={u.userName} 
                        className={`w-6 h-6 rounded-full object-cover border-2 ${isUserTyping ? 'border-amber-400' : 'border-emerald-500'} cursor-pointer bg-slate-900`}
                        referrerPolicy="no-referrer"
                      />
                      <span className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${isUserTyping ? 'bg-amber-400' : 'bg-emerald-500 animate-pulse'}`} />
                      
                      {/* Interactive Tooltip popup */}
                      <div className="absolute top-7 scale-0 group-hover:scale-100 transition origin-top bg-slate-950 border border-slate-800 text-slate-200 text-[8px] px-2 py-0.5 rounded font-sans whitespace-nowrap shadow-xl z-50 pointer-events-none font-medium">
                        {u.userName} {u.userId === currentUser.id ? '(You)' : ''}
                        {isUserTyping && <span className="text-amber-400 ml-1 italic font-mono">(typing...)</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Pin / Archive Actions */}
            <button
              onClick={handleTogglePin}
              className={`p-1.5 rounded-lg border transition ${note.pinned ? 'bg-amber-500/10 border-amber-500/40 text-amber-400' : 'border-slate-800 text-slate-500 hover:text-slate-300'}`}
              title="Pin study note"
            >
              <Pin className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleToggleArchive}
              className={`p-1.5 rounded-lg border transition ${note.archived ? 'bg-blue-500/10 border-blue-500/40 text-blue-400' : 'border-slate-800 text-slate-500 hover:text-slate-300'}`}
              title="Archive study note"
            >
              <Archive className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setShareOpen(true)}
              className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200"
              title="Invite Peer Collaborators"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setCommentsOpen(!commentsOpen)}
              className={`p-1.5 rounded-lg border transition ${commentsOpen ? 'bg-indigo-650/15 border-indigo-500/40 text-indigo-400' : 'border-slate-800 text-slate-500 hover:text-slate-300'}`}
              title="Co-editor discussion feeds"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setVersionsOpen(true)}
              className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200"
              title="Archived Versions History"
            >
              <Clock className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Note Editor Area */}
        <div className="bg-slate-900/30 rounded-2xl border border-slate-800/80 p-5 space-y-4 shadow-xl flex-1 flex flex-col">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            className="bg-transparent text-slate-100 font-sans font-bold text-2xl w-full border-none outline-none focus:ring-0 select-text"
            placeholder="Name your educational note..."
          />

          {/* Inline toolbar helpers for quick text inserting features */}
          <div className="flex flex-wrap items-center gap-1 border-b border-slate-800/60 pb-3 text-slate-500 text-xs font-mono">
            <button onClick={() => insertTextHelper('**Bold Text**')} className="px-2 py-1 bg-slate-950/60 rounded hover:text-slate-300 transition">B</button>
            <button onClick={() => insertTextHelper('# Heading 1\n')} className="px-2 py-1 bg-slate-950/60 rounded hover:text-slate-300 transition">H1</button>
            <button onClick={() => insertTextHelper('## Heading 2\n')} className="px-2 py-1 bg-slate-950/60 rounded hover:text-slate-300 transition">H2</button>
            <button onClick={() => insertTextHelper('\n* Bullet Item\n')} className="px-2 py-1 bg-slate-950/60 rounded hover:text-slate-300 transition">• List</button>
            <button onClick={() => insertTextHelper('\n- [ ] Task checkboxItem\n')} className="px-2 py-1 bg-slate-950/60 rounded hover:text-slate-300 transition">☑ Checklist</button>
            <button onClick={() => insertTextHelper('\n\`\`\`typescript\n// Code snippet\n\`\`\`\n')} className="px-2 py-1 bg-slate-950/60 rounded hover:text-slate-300 transition">{"</>"} Code</button>
          </div>

          <textarea
            id="note-writing-canvas"
            value={content}
            onChange={handleTextChange}
            className="w-full h-96 bg-transparent text-slate-300 font-sans text-sm border-none outline-none focus:ring-0 leading-relaxed resize-none flex-1 font-sans"
            placeholder="Draft academic formulas, insert Markdown lines, or design tasks list..."
          />

          {/* Typing indicator display */}
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 border-t border-slate-800/60 pt-3">
            <div>
              {Object.values(typingUsers).length > 0 ? (
                <span className="text-indigo-400 animate-pulse">
                  {Object.values(typingUsers).map((u: any) => u.userName).join(', ')} is editing...
                </span>
              ) : (
                <span className="text-slate-600">Document saved to institutional database.</span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {isSaving ? (
                <span className="text-blue-400 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> saving...
                </span>
              ) : (
                <span className="text-slate-600">Saved</span>
              )}
            </div>
          </div>
        </div>

        {/* Local Attachments Section */}
        <div className="bg-slate-900/20 p-4 rounded-xl border border-slate-800/60">
          <p className="text-[10px] font-mono text-slate-400 tracking-wider mb-2 uppercase">NOTE ATTACHMENTS & BIBLIOGRAPHY REFERENCES ({note.attachments?.length || 0})</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {note.attachments?.map((at, idx) => (
              <div key={idx} className="bg-slate-950 border border-slate-900 p-2.5 rounded-lg flex items-center justify-between gap-3 hover:border-slate-800 transition">
                <div className="flex items-center gap-2.5 truncate">
                  <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded">
                    <Paperclip className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs text-slate-300 font-bold truncate">{at.name}</p>
                    <p className="text-[9px] font-mono text-slate-500">MIME: {at.mimeType} • {Math.round(at.size / 1024)} KB</p>
                  </div>
                </div>
                <a 
                  href={at.url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="p-1 text-slate-500 hover:text-slate-300 bg-slate-900 rounded"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>

          {/* Drag & Drop File Loader Mock */}
          <div 
            onDragEnter={handleDrag} 
            onDragOver={handleDrag} 
            onDragLeave={handleDrag} 
            onDrop={handleDrop}
            className={`cursor-pointer border-2 border-dashed rounded-xl p-6 text-center transition ${
              dragActive ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-800 hover:border-slate-700 bg-slate-950/20'
            }`}
          >
            <input 
              type="file" 
              id="binary-file-selector" 
              className="hidden" 
              onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} 
            />
            <label htmlFor="binary-file-selector" className="cursor-pointer">
              <Paperclip className="w-6 h-6 text-slate-500 mx-auto mb-2" />
              <p className="text-xs text-slate-300">Drag & Drop references or <span className="text-indigo-400 font-semibold cursor-pointer">browse files</span></p>
              <p className="text-[10px] text-slate-500 mt-1">Image drops, syllabus PDF slides (Max size: 8MB)</p>
            </label>
          </div>

          {uploadPreview && (
            <div className="mt-3 p-3 bg-slate-950 border border-slate-900 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-900 rounded flex items-center justify-center overflow-hidden">
                  {uploadMime.startsWith('image/') ? (
                    <img src={uploadPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <FileImage className="w-5 h-5 text-slate-500" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-200 font-bold">{uploadName}</p>
                  <p className="text-[9px] font-mono text-slate-500">Mime: {uploadMime}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setUploadPreview(null)} className="px-2 py-1 text-[10px] font-mono text-slate-400 hover:text-slate-200 cursor-pointer">Cancel</button>
                <button onClick={handleUploadSubmit} className="px-3 py-1 text-[10px] font-mono bg-indigo-600 hover:bg-indigo-500 text-white rounded font-semibold cursor-pointer shadow-lg shadow-indigo-650/10">Upload File</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sharing Panel Modal */}
      {shareOpen && (
        <div id="sharing-panel" className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-900 pb-2">
              <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2"><Share2 className="w-4 h-4 text-indigo-400" /> Peer Collaboration</h3>
              <button onClick={() => setShareOpen(false)} className="text-slate-500 hover:text-slate-300 font-mono text-xs cursor-pointer">Close</button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-mono">PUBLIC WEB SHARING</span>
                <button 
                  onClick={togglePublicLink}
                  className={`px-2 py-0.5 text-[9px] font-mono font-semibold rounded uppercase cursor-pointer ${note.isPublic ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/25' : 'bg-slate-800 text-slate-400'}`}
                >
                  {note.isPublic ? '🌐 PUBLIC ACCESS ON' : '🔒 OWNERS ONLY'}
                </button>
              </div>
              {note.isPublic && (
                <div className="p-2.5 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500 select-all truncate text-[10px]">hash-hashlink</span>
                  <span className="text-slate-400 text-[10px] ml-2 flex items-center gap-1"><Link2 className="w-3 h-3 text-indigo-400" /> Shareable</span>
                </div>
              )}
            </div>

            {canModifyShares && (
              <form onSubmit={handleInvite} className="space-y-3 pt-2">
                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">INVITE STUDENT / TEACHER EMAIL</p>
                <input
                  type="email"
                  placeholder="student@technoindia.edu or teacher@technoindia.edu"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                  required
                />
                
                <div className="flex items-center justify-between text-xs font-sans">
                  <span className="text-slate-500">Permission level:</span>
                  <select
                    value={sharePermission}
                    onChange={(e) => setSharePermission(e.target.value as any)}
                    className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="view">Can Read</option>
                    <option value="comment">Can Comment</option>
                    <option value="edit">Can Edit</option>
                    <option value="admin">Owner Admin</option>
                  </select>
                </div>

                <button type="submit" className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs rounded uppercase font-bold transition cursor-pointer shadow-lg shadow-indigo-600/10">
                  Invite Peer Access
                </button>

                {shareStatus && <p className="text-[10px] font-mono text-slate-400 text-center">{shareStatus}</p>}
              </form>
            )}

            <div className="space-y-2 max-h-40 overflow-y-auto border-t border-slate-900 pt-3">
              <p className="text-[9px] font-mono text-slate-500 tracking-wider">ACTIVE ACCESS ROSTER</p>
              <div className="flex justify-between items-center text-xs bg-slate-900/40 p-2 rounded font-mono gap-2">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-slate-300 truncate">Author Owner (You)</span>
                </div>
                <span className="text-indigo-400 uppercase text-[10px] shrink-0 font-bold">creator</span>
              </div>
              {note.collaborators?.map((c, idx) => {
                // If the user name is in presenceUsers list, show them as Live
                const isLive = presenceUsers.some(p => p.userName === c.userName);
                return (
                  <div key={idx} className="flex justify-between items-center text-xs bg-slate-900/40 p-2 rounded font-mono gap-2">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                      <span className="text-slate-300 truncate font-medium">{c.userName}</span>
                    </div>
                    <span className="text-blue-400 uppercase text-[10px] shrink-0 font-bold">{c.permission}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Backwards History Versions Drawer Overlay */}
      {versionsOpen && (
        <div id="versions-drawer" className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-end">
          <div className="bg-slate-950 border-l border-slate-800 w-80 h-full p-5 space-y-4 shadow-2xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2"><Clock className="w-4 h-4 text-emerald-400" /> Versions</h3>
                <button onClick={() => setVersionsOpen(false)} className="text-slate-500 hover:text-slate-300 font-mono text-xs">Close</button>
              </div>
              <p className="text-xs text-slate-500 font-sans leading-relaxed">Each major content edit generates an archive snapshot in our node server. Select a checkpoint below to roll back.</p>

              <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
                {note.versions && note.versions.length > 0 ? (
                  note.versions.map((ver, idx) => (
                    <div key={ver.id} className="bg-slate-900/40 border border-slate-800/80 p-3 rounded-lg space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-500 font-mono">{new Date(ver.updatedAt).toLocaleTimeString()}</span>
                        <span className="px-1.5 py-0.5 text-[8px] bg-emerald-500/10 text-emerald-400 rounded uppercase font-mono">ver 0{idx+1}</span>
                      </div>
                      <p className="text-xs text-slate-300 truncate">Saved as: "{ver.title}"</p>
                      <p className="text-[10px] font-mono text-slate-500">Edited by: {ver.updatedBy}</p>
                      
                      <button
                        onClick={() => handleRestoreVersion(idx, ver.content, ver.title)}
                        className="w-full py-1 text-[10px] font-mono bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded transition uppercase"
                      >
                        REVERT TO THIS CHANGER
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs italic text-slate-600">No historic checkpoints found. Keep writing to compile backup tracks.</p>
                )}
              </div>
            </div>

            <button onClick={() => setVersionsOpen(false)} className="w-full py-2 bg-slate-900 text-slate-400 text-xs font-mono rounded hover:bg-slate-800">Close Panel</button>
          </div>
        </div>
      )}

      {/* Discussion Thread comments right sidebar panel */}
      {commentsOpen && (
        <div className="lg:col-span-4 bg-slate-900/30 rounded-2xl border border-slate-800/80 p-5 space-y-4 shadow-xl flex flex-col h-[525px] justify-between">
          <div className="flex flex-col min-h-0 flex-1">
            <h3 className="font-sans font-bold text-slate-200 border-b border-slate-800/60 pb-2 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" /> Collaborative Hub
            </h3>

            {/* Tab header selectors */}
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-900 mb-3 shrink-0">
              <button
                onClick={() => setCollaborativeTab('livechat')}
                className={`py-1.5 text-[8.5px] font-mono font-bold tracking-wider rounded-lg transition-all flex items-center justify-center gap-1 ${collaborativeTab === 'livechat' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow' : 'text-slate-500 hover:text-slate-400 border border-transparent'}`}
                type="button"
              >
                ⚡ LIVE ({presenceUsers.length})
              </button>
              <button
                onClick={() => setCollaborativeTab('comments')}
                className={`py-1.5 text-[8.5px] font-mono font-bold tracking-wider rounded-lg transition-all flex items-center justify-center gap-1 ${collaborativeTab === 'comments' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow' : 'text-slate-500 hover:text-slate-400 border border-transparent'}`}
                type="button"
              >
                💬 FEED ({comments.length})
              </button>
              <button
                onClick={() => setCollaborativeTab('reviews')}
                className={`py-1.5 text-[8.5px] font-mono font-bold tracking-wider rounded-lg transition-all flex items-center justify-center gap-1 ${collaborativeTab === 'reviews' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow' : 'text-slate-500 hover:text-slate-400 border border-transparent'}`}
                type="button"
              >
                🎓 REVIEWS
              </button>
            </div>

            {/* Tab content panel */}
            {collaborativeTab === 'livechat' ? (
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col min-h-0 justify-between">
                <div className="space-y-3 overflow-y-auto max-h-[310px] flex-1 pb-2">
                  {chatMessages.length === 0 ? (
                    <div className="py-12 text-center text-slate-550 text-xs italic font-sans px-4 animate-pulse">
                      No live party messages yet. Type below to exchange real-time words with your connected classmates!
                    </div>
                  ) : (
                    chatMessages.map((msg) => {
                      const isSelf = msg.userId === currentUser.id;
                      return (
                        <div key={msg.id} className={`flex gap-2 ${isSelf ? 'flex-row-reverse' : ''} animate-fadeIn`}>
                          <img 
                            src={msg.userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'} 
                            alt={msg.userName} 
                            className="w-6 h-6 rounded-full object-cover shrink-0 border border-slate-800"
                            referrerPolicy="no-referrer"
                          />
                          <div className={`space-y-0.5 max-w-[80%] flex flex-col ${isSelf ? 'items-end' : ''}`}>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-slate-300">{msg.userName}</span>
                              <span className="text-[8px] font-mono text-slate-500">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className={`p-2 rounded-xl text-[11px] leading-relaxed font-sans ${isSelf ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-950 border border-slate-900 text-slate-300 rounded-tl-none'}`}>
                              {msg.text}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={(e) => { e.preventDefault(); if (liveChatText.trim()) { sendChatMessage(liveChatText); setLiveChatText(''); } }} className="flex gap-1.5 pt-2 border-t border-slate-800/60 shrink-0">
                  <input
                    type="text"
                    placeholder="Send a live party ping..."
                    value={liveChatText}
                    onChange={(e) => setLiveChatText(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-sans"
                  />
                  <button
                    type="submit"
                    className="p-2 bg-indigo-600 hover:bg-indigo-550 text-white rounded-lg transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            ) : collaborativeTab === 'comments' ? (
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col min-h-0 justify-between">
                <div className="space-y-3 overflow-y-auto max-h-[310px] flex-1 pb-2">
                  {comments.length === 0 ? (
                    <div className="py-12 text-center text-slate-550 text-xs italic font-sans px-4">
                      No static notes annotations found. Author persistent remarks on this document.
                    </div>
                  ) : (
                    comments.map((co) => (
                      <div key={co.id} className="bg-slate-950 border border-slate-900/80 p-2.5 rounded-xl space-y-1">
                        <div className="flex items-center gap-2">
                          <img src={co.userAvatar} alt={co.userName} className="w-5 h-5 rounded-full object-cover border border-slate-800" referrerPolicy="no-referrer" />
                          <span className="text-xs font-bold text-slate-300">{co.userName}</span>
                          <span className="text-[9px] text-slate-500 font-mono ml-auto">{new Date(co.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{co.text}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handlePostComment} className="flex gap-1.5 pt-2 border-t border-slate-800/60 shrink-0">
                  <input
                    type="text"
                    placeholder="Add annotation thread reply..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-350 focus:outline-none focus:border-blue-500 font-sans"
                  />
                  <button
                    type="submit"
                    className="p-2 bg-blue-600 hover:bg-blue-550 text-white rounded-lg transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            ) : (
              // --- Reviews Tab Content ---
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col min-h-0 justify-between">
                {currentUser.role === 'teacher' ? (
                  // Teacher Review/Grading Form
                  <form onSubmit={handleSubmitReview} className="space-y-3 flex-1 pb-2">
                    <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">Submit Professor Evaluation:</p>
                    
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-slate-500 uppercase">Review Status</label>
                      <select
                        value={reviewStatusInput}
                        onChange={(e) => setReviewStatusInput(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 font-sans"
                      >
                        <option value="pending">⏳ Pending Review</option>
                        <option value="reviewed">📝 Under Correction / Reviewed</option>
                        <option value="approved">✅ Approved by Faculty</option>
                        <option value="rejected">❌ Needs Significant Revision</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-slate-500 uppercase">Grading / Score / Verdict</label>
                      <input
                        type="text"
                        placeholder="e.g. Grade A+, Outstanding, 9.5/10, etc."
                        value={reviewScoreInput}
                        onChange={(e) => setReviewScoreInput(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-100 rounded px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 font-sans"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-slate-500 uppercase">Critique & Peer Feedback</label>
                      <textarea
                        placeholder="Write detailed pedagogical comments here..."
                        value={reviewCommentInput}
                        onChange={(e) => setReviewCommentInput(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 min-h-[100px] font-sans resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingReview}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] font-bold rounded uppercase tracking-wider transition cursor-pointer select-none"
                    >
                      {isSubmittingReview ? 'Updating Critique...' : 'Publish Academic Review'}
                    </button>

                    {reviewSuccessMsg && (
                      <p className="text-[10px] font-mono text-emerald-400 text-center animate-pulse">{reviewSuccessMsg}</p>
                    )}
                  </form>
                ) : (
                  // Student View of Teacher review
                  <div className="space-y-4 flex-1 pb-2">
                    <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">Aesthetic Faculty Evaluation:</p>
                    {note?.reviewedBy ? (
                      <div className="bg-slate-950 border border-slate-905 rounded-xl p-4 space-y-3 antialiased">
                        <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-200">Prof. {note.reviewedBy}</span>
                            <span className="text-[8px] font-mono text-slate-500">Evaluated on {new Date(note.reviewedAt || '').toLocaleDateString()}</span>
                          </div>
                          
                          <span className={`px-2 py-0.5 text-[9px] font-mono rounded font-bold uppercase tracking-wider ${
                            note.reviewStatus === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                            note.reviewStatus === 'rejected' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 
                            'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {note.reviewStatus?.toUpperCase() || 'REVIEWED'}
                          </span>
                        </div>

                        {note.reviewScore && (
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-mono text-slate-500 uppercase">Class Grade Verdict</span>
                            <p className="text-sm font-bold font-sans text-emerald-400">{note.reviewScore}</p>
                          </div>
                        )}

                        <div className="space-y-0.5">
                          <span className="text-[9px] font-mono text-slate-500 uppercase">Pedagogical Review Comments</span>
                          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap italic">"{note.reviewFeedback || 'No description comments registered.'}"</p>
                        </div>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-slate-550 text-xs italic font-sans px-4">
                        ⏳ No academic review has been filed for this note yet. Reach out to Techno India Faculty members to evaluate your proofs!
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
