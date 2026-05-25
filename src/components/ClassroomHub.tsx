/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, Classroom, Note } from '../types.ts';
import { Fetcher } from '../utils/fetcher.ts';
import { BookOpen, HelpCircle, Users, Clipboard, Plus, RefreshCw, Eye, Settings } from 'lucide-react';

interface ClassroomHubProps {
  currentUser: User;
  onOpenNote: (noteId: string) => void;
}

export function ClassroomHub({ currentUser, onOpenNote }: ClassroomHubProps) {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [teachersList, setTeachersList] = useState<{ id: string; name: string; email: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Forms for Creation / Joining
  const [newClassName, setNewClassName] = useState('');
  const [newClassDesc, setNewClassDesc] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [tab, setTab] = useState<'browse' | 'create' | 'join'>('browse');

  // Editing state for Admin/Faculty
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editTeacherId, setEditTeacherId] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [allClasses, allNotes] = await Promise.all([
        Fetcher.get('/api/classrooms'),
        Fetcher.get('/api/notes')
      ]);
      setClassrooms(allClasses);
      setNotes(allNotes);
    } catch (err: any) {
      setError(err.message || 'Failed to sync academy registries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (currentUser.role === 'admin') {
      Fetcher.get('/api/teachers')
        .then(data => setTeachersList(data))
        .catch(err => console.error('Failed to load teachers list:', err));
    }
  }, [currentUser]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    try {
      const payload: any = {
        name: newClassName,
        description: newClassDesc
      };
      
      // If Admin is creating, they can assign a teacher explicitly
      if (currentUser.role === 'admin' && selectedTeacherId) {
        payload.teacherId = selectedTeacherId;
      }

      const newClass = await Fetcher.post('/api/classrooms', payload);
      setClassrooms(prev => [...prev, newClass]);
      setNewClassName('');
      setNewClassDesc('');
      setSelectedTeacherId('');
      setTab('browse');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create academic workspace.');
    }
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClassroom || !editName.trim()) return;

    try {
      const payload: any = {
        name: editName,
        description: editDesc
      };
      
      if (currentUser.role === 'admin') {
        payload.teacherId = editTeacherId;
      }

      await Fetcher.put(`/api/classrooms/${editingClassroom.id}`, payload);
      setEditingClassroom(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update academic workspace properties.');
    }
  };

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    try {
      const joined = await Fetcher.post('/api/classrooms/join', { code: joinCode });
      setClassrooms(prev => [...prev, joined]);
      setJoinCode('');
      setTab('browse');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to register into classroom space.');
    }
  };

  return (
    <div id="classroom-hub-wrapper" className="space-y-6 animate-fadeIn">
      {/* Tab select option */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h2 className="text-xl font-bold font-sans tracking-tight text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-400" /> Academic Portals
        </h2>

        <div className="flex gap-2">
          <button
            onClick={() => setTab('browse')}
            className={`px-3 py-1.5 text-xs font-mono rounded cursor-pointer transition ${tab === 'browse' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}
          >
            Syllabus Rooms
          </button>
          
          {(currentUser.role === 'teacher' || currentUser.role === 'admin') && (
            <button
              onClick={() => setTab('create')}
              className={`px-3 py-1.5 text-xs font-mono rounded flex items-center gap-1 cursor-pointer transition ${tab === 'create' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}
            >
              <Plus className="w-3.5 h-3.5" /> Course
            </button>
          )}

          {currentUser.role === 'student' && (
            <button
              onClick={() => setTab('join')}
              className={`px-3 py-1.5 text-xs font-mono rounded flex items-center gap-1 cursor-pointer transition ${tab === 'join' ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}
            >
              Enroll Code
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 font-mono text-xs text-slate-500 animate-pulse">Syncing lecture portals...</div>
      ) : error ? (
        <div className="p-4 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-xs font-mono">{error}</div>
      ) : (
        <div id="main-classroom-panels">
          {tab === 'browse' && (
            classrooms.length === 0 ? (
              <div className="text-center py-16 bg-slate-950/20 rounded-xl border border-dashed border-slate-900">
                <Users className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                <p className="text-xs font-mono text-slate-500">Unregistered. Join a course class or generate homework boards.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {classrooms.map(c => {
                  // Find syllabus notes
                  const syllabus = notes.filter(n => c.noteIds?.includes(n.id));
                  const unassignedNotes = notes.filter(n => !c.noteIds?.includes(n.id));
                  return (
                    <div key={c.id} className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 backdrop-blur-lg flex flex-col justify-between hover:border-indigo-500/30 transition shadow-lg relative overflow-hidden group">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="px-2 py-0.5 text-[9px] font-mono rounded-full bg-indigo-500/15 text-indigo-400 tracking-wider">CODE: {c.code}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-500 font-mono">Lecturer: {c.teacherName}</span>
                            {currentUser.role === 'admin' && (
                              <button
                                onClick={() => {
                                  setEditingClassroom(c);
                                  setEditName(c.name);
                                  setEditDesc(c.description || '');
                                  setEditTeacherId(c.teacherId);
                                }}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-indigo-450 hover:text-indigo-400 transition cursor-pointer flex items-center gap-0.5"
                                title="Update Course / Teacher Assignment"
                              >
                                <Settings className="w-3 h-3" /> Edit
                              </button>
                            )}
                          </div>
                        </div>
                        <h3 className="font-sans text-lg font-bold text-slate-100 mb-1">{c.name}</h3>
                        <p className="text-xs text-slate-400 mb-4 line-clamp-2">{c.description || 'No detailed abstract recorded for this syllabus module.'}</p>
                      </div>

                      <div className="border-t border-slate-800/60 pt-3 mt-4 space-y-2">
                        <p className="text-[10px] font-mono text-slate-500 tracking-wider">ASSIGNED BIBLIOGRAPHY & LECTURES ({syllabus.length})</p>
                        {syllabus.length === 0 ? (
                          <p className="text-xs font-mono italic text-slate-600">No study modules assigned yet.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {syllabus.map(n => (
                              <div key={n.id} className="flex justify-between items-center text-xs bg-slate-950/40 hover:bg-slate-950 px-2.5 py-1.5 rounded transition">
                                <span className="text-slate-300 font-medium truncate flex-1 mr-3">{n.title}</span>
                                <button
                                  onClick={() => onOpenNote(n.id)}
                                  className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono text-[10px] cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" /> Read
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Link Syllabus Note Select */}
                        {(currentUser.role === 'teacher' || currentUser.role === 'admin') && unassignedNotes.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-800/20 flex flex-col gap-1.5">
                            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">Link Bibliography Note</span>
                            <div className="flex gap-2">
                              <select
                                id={`link-note-select-${c.id}`}
                                className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none"
                                defaultValue=""
                              >
                                <option value="" disabled>Select Study Note...</option>
                                {unassignedNotes.map(n => (
                                  <option key={n.id} value={n.id}>{n.title}</option>
                                ))}
                              </select>
                              <button
                                onClick={async () => {
                                  const selectEl = document.getElementById(`link-note-select-${c.id}`) as HTMLSelectElement | null;
                                  if (selectEl && selectEl.value) {
                                    try {
                                      await Fetcher.post(`/api/classrooms/${c.id}/notes`, { noteId: selectEl.value });
                                      loadData();
                                    } catch (err: any) {
                                      alert(err.message || 'Failed to add syllabus note');
                                    }
                                  }
                                }}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-[10px] rounded hover:shadow-md transition cursor-pointer"
                              >
                                Link
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {tab === 'create' && (
            <form onSubmit={handleCreateClass} className="bg-slate-900/30 border border-slate-800 rounded-xl p-6 shadow-md max-w-lg mx-auto space-y-4">
              <h3 className="font-sans text-md font-bold text-slate-200">Construct Class Syllabus Stream</h3>
              
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-400 uppercase tracking-tight">COURSE IDENTIFIER</label>
                <input
                  type="text"
                  placeholder="e.g. CS-302: Human Computer Interaction"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-sans"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-400 uppercase tracking-tight">ABSTRACT & CURRICULUM DESCRIPTION</label>
                <textarea
                  placeholder="Summarize course goals, assignments, and exam review benchmarks."
                  value={newClassDesc}
                  onChange={(e) => setNewClassDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-sans min-h-24"
                />
              </div>

              {currentUser.role === 'admin' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-slate-400 uppercase tracking-tight">ASSIGNED LECTURER / TEACHER</label>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-sans"
                    required
                  >
                    <option value="" disabled>Select faculty member...</option>
                    {teachersList.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs rounded transition uppercase tracking-widest font-semibold cursor-pointer shadow-lg shadow-indigo-600/20"
              >
                PUBLISH LECTURE PORTAL
              </button>
            </form>
          )}

          {tab === 'join' && (
            <form onSubmit={handleJoinClass} className="bg-slate-900/30 border border-slate-800 rounded-xl p-6 shadow-md max-w-sm mx-auto space-y-4">
              <h3 className="font-sans text-md font-bold text-slate-200">Register into Course via Code</h3>
              
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-400 uppercase tracking-tight">INVITATION PIN CODE</label>
                <input
                  type="text"
                  placeholder="Enter 6-character Alpha-Numeric"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-center font-mono text-indigo-400 focus:outline-none focus:border-indigo-500 uppercase tracking-widest text-lg"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs rounded transition uppercase tracking-widest font-semibold cursor-pointer shadow-lg shadow-purple-600/20"
              >
                ENROLL ACADEMICALLY
              </button>
            </form>
          )}
        </div>
      )}

      {/* Modern Overlay Modal Dialog for updating syllabus classroom properties */}
      {editingClassroom && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-900 pb-3">
              <div>
                <h3 className="font-sans font-bold text-slate-100 text-base">Update Classroom Module</h3>
                <p className="text-[10px] text-slate-500 font-mono">Modifying syllabus identifier room: {editingClassroom.code}</p>
              </div>
              <button 
                type="button"
                onClick={() => setEditingClassroom(null)}
                className="text-slate-400 hover:text-slate-200 text-xs font-mono"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleUpdateClass} className="space-y-4 font-sans text-left">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">COURSE IDENTIFIER</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-sans"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">CURRICULUM DESCRIPTION</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-sans min-h-20"
                />
              </div>

              {currentUser.role === 'admin' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">ASSIGNED LECTURER / TEACHER</label>
                  <select
                    value={editTeacherId}
                    onChange={(e) => setEditTeacherId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                    required
                  >
                    <option value="" disabled>Select faculty member...</option>
                    {teachersList.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="border-t border-slate-900 pt-4 flex gap-3 justify-end leading-none">
                <button
                  type="button"
                  onClick={() => setEditingClassroom(null)}
                  className="px-3 py-1.5 text-slate-450 hover:text-slate-300 transition bg-transparent text-xs font-mono"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs rounded transition uppercase font-semibold cursor-pointer shadow-indigo-600/20"
                >
                  Save Parameters
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
