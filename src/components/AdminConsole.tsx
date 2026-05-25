/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, ActivityLog, Report, UserRole } from '../types.ts';
import { Fetcher } from '../utils/fetcher.ts';
import { 
  Shield, UserMinus, UserCheck, AlertTriangle, RefreshCw, 
  FileText, Activity, Edit2, Key, Trash2, X, Plus 
} from 'lucide-react';
import { motion } from 'motion/react';

interface AdminConsoleProps {
  currentUser: User;
}

export function AdminConsole({ currentUser }: AdminConsoleProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'users' | 'reports' | 'logs'>('users');

  // Core detail modal selector state
  const [activeDetail, setActiveDetail] = useState<'students' | 'teachers' | 'reports_detail' | 'logs_detail' | null>(null);

  // User Administration management states
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [changingPasswordUser, setChangingPasswordUser] = useState<User | null>(null);

  // Form input states
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState<'student' | 'teacher' | 'admin'>('student');
  const [addBio, setAddBio] = useState('');
  const [addPassword, setAddPassword] = useState('');

  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'student' | 'teacher' | 'admin'>('student');
  const [editBio, setEditBio] = useState('');

  const [newPassword, setNewPassword] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [allUsers, allLogs, allReports] = await Promise.all([
        Fetcher.get('/api/admin/users'),
        Fetcher.get('/api/admin/activity'),
        Fetcher.get('/api/admin/reports')
      ]);
      setUsers(allUsers);
      setLogs(allLogs);
      setReports(allReports);
    } catch (err: any) {
      setError(err.message || 'Failed to sync administrator tables.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (editingUser) {
      setEditName(editingUser.name);
      setEditEmail(editingUser.email);
      setEditRole(editingUser.role);
      setEditBio(editingUser.bio || '');
    }
  }, [editingUser]);

  const handleToggleBlock = async (user: User) => {
    try {
      const updatedUser = await Fetcher.put(`/api/admin/users/${user.id}/block`, { blocked: !user.blocked });
      setUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));
      loadData(); // Sync logs
    } catch (err: any) {
      alert(err.message || 'Failed to modify account blocking status.');
    }
  };

  const handleResolveReport = async (reportId: string) => {
    try {
      await Fetcher.put(`/api/admin/reports/${reportId}/resolve`, {});
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'resolved' as const } : r));
      loadData(); // Sync logs
    } catch (err: any) {
      alert(err.message || 'Failed to resolve academic report.');
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addEmail.trim() || !addPassword) return;

    try {
      const newUser = await Fetcher.post('/api/admin/users', {
        name: addName,
        email: addEmail,
        role: addRole,
        bio: addBio,
        password: addPassword
      });
      setUsers(prev => [...prev, newUser]);
      setIsAddingUser(false);
      // Reset
      setAddName('');
      setAddEmail('');
      setAddRole('student');
      setAddBio('');
      setAddPassword('');
      loadData(); // Sync logs
    } catch (err: any) {
      alert(err.message || 'Failed to establish new user credentials.');
    }
  };

  const handleUpdateUserDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const updated = await Fetcher.put(`/api/admin/users/${editingUser.id}`, {
        name: editName,
        email: editEmail,
        role: editRole,
        bio: editBio
      });
      setUsers(prev => prev.map(u => u.id === editingUser.id ? updated : u));
      setEditingUser(null);
      loadData(); // Sync logs
    } catch (err: any) {
      alert(err.message || 'Failed to update user profile parameters.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changingPasswordUser || !newPassword) return;

    try {
      await Fetcher.put(`/api/admin/users/${changingPasswordUser.id}/password`, {
        password: newPassword
      });
      alert(`Successfully reset password for student/faculty card of: "${changingPasswordUser.name}".`);
      setChangingPasswordUser(null);
      setNewPassword('');
      loadData(); // Sync logs
    } catch (err: any) {
      alert(err.message || 'Failed to update passwords.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const candidate = users.find(u => u.id === userId);
    if (!candidate) return;
    if (!confirm(`Are you sure you want to permanently delete the profile and student directories of "${candidate.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await Fetcher.delete(`/api/admin/users/${userId}`);
      setUsers(prev => prev.filter(u => u.id !== userId));
      loadData(); // Sync logs
    } catch (err: any) {
      alert(err.message || 'Failed to delete user.');
    }
  };

  // Compute stats on fly
  const totalStudents = users.filter(u => u.role === 'student').length;
  const totalTeachers = users.filter(u => u.role === 'teacher').length;
  const activeLogsCount = logs.length;
  const pendingReportsCount = reports.filter(r => r.status === 'pending').length;

  return (
    <div id="admin-console-wrapper" className="space-y-6">
      {/* Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* STUDENTS CARD */}
        <div 
          id="stat-students-card" 
          onClick={() => setActiveDetail('students')}
          className="bg-slate-900/60 hover:bg-slate-900/80 hover:border-blue-500/40 hover:shadow-blue-500/10 cursor-pointer scale-100 hover:scale-[1.02] active:scale-95 transition-all duration-150 backdrop-blur-md p-4 rounded-xl border border-blue-500/20 shadow-blue-500/5 shadow-md flex items-center justify-between group"
          title="Click to view detailed Student directory"
        >
          <div>
            <p className="text-xs text-slate-400 font-mono group-hover:text-blue-300 transition">TOTAL STUDENTS</p>
            <p className="text-3xl font-bold font-sans text-blue-400 tracking-tight mt-1">{totalStudents}</p>
            <span className="text-[10px] text-slate-500 font-mono group-hover:text-slate-400 transition">Click for details →</span>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400 group-hover:bg-blue-500/25 transition">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        {/* TEACHERS CARD */}
        <div 
          id="stat-teachers-card" 
          onClick={() => setActiveDetail('teachers')}
          className="bg-slate-900/60 hover:bg-slate-900/80 hover:border-emerald-500/40 hover:shadow-emerald-500/10 cursor-pointer scale-100 hover:scale-[1.02] active:scale-95 transition-all duration-150 backdrop-blur-md p-4 rounded-xl border border-emerald-500/20 shadow-emerald-500/5 shadow-md flex items-center justify-between group col-span-1"
          title="Click to view detailed Faculty roster"
        >
          <div>
            <p className="text-xs text-slate-400 font-mono group-hover:text-emerald-300 transition">CERTIFIED TEACHERS</p>
            <p className="text-3xl font-bold font-sans text-emerald-400 tracking-tight mt-1">{totalTeachers}</p>
            <span className="text-[10px] text-slate-500 font-mono group-hover:text-slate-400 transition">Click for details →</span>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400 group-hover:bg-emerald-500/25 transition">
            <Shield className="w-5 h-5" />
          </div>
        </div>

        {/* PENDING REPORTS CARD */}
        <div 
          id="stat-reports-card" 
          onClick={() => setActiveDetail('reports_detail')}
          className="bg-slate-900/60 hover:bg-slate-900/80 hover:border-red-500/40 hover:shadow-red-500/10 cursor-pointer scale-100 hover:scale-[1.02] active:scale-95 transition-all duration-150 backdrop-blur-md p-4 rounded-xl border border-red-500/20 shadow-red-500/5 shadow-md flex items-center justify-between group"
          title="Click to resolve pending Plagiarism & misconduct reports"
        >
          <div>
            <p className="text-xs text-slate-400 font-mono group-hover:text-red-300 transition">PENDING REPORTS</p>
            <p className="text-3xl font-bold font-sans text-red-400 tracking-tight mt-1">{pendingReportsCount}</p>
            <span className="text-[10px] text-slate-500 font-mono group-hover:text-slate-400 transition">Click for details →</span>
          </div>
          <div className="p-3 bg-red-500/10 rounded-lg text-red-400 group-hover:bg-red-500/25 transition animate-pulse">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* AUDIT LOGS CARD */}
        <div 
          id="stat-logs-card" 
          onClick={() => setActiveDetail('logs_detail')}
          className="bg-slate-900/60 hover:bg-slate-900/80 hover:border-violet-500/40 hover:shadow-violet-500/10 cursor-pointer scale-100 hover:scale-[1.02] active:scale-95 transition-all duration-150 backdrop-blur-md p-4 rounded-xl border border-violet-500/20 shadow-violet-500/5 shadow-md flex items-center justify-between group"
          title="Click to view raw system Activity logs"
        >
          <div>
            <p className="text-xs text-slate-400 font-mono group-hover:text-violet-300 transition">AUDIT ACTIONS</p>
            <p className="text-3xl font-bold font-sans text-violet-400 tracking-tight mt-1">{activeLogsCount}</p>
            <span className="text-[10px] text-slate-500 font-mono group-hover:text-slate-400 transition">Click for details →</span>
          </div>
          <div className="p-3 bg-violet-500/10 rounded-lg text-violet-400 group-hover:bg-violet-500/25 transition">
            <FileText className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* SVG Analytics Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 backdrop-blur-lg">
          <h3 className="font-sans font-medium text-sm text-slate-300 mb-4 tracking-tight flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" /> Note Growth Distribution over semesters
          </h3>
          <div className="h-44 w-full flex items-end justify-between px-4 pb-2 border-b border-slate-800">
            {[45, 68, 90, 110, 145, 178, 220].map((val, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2 w-10">
                <div 
                  className="w-8 rounded-t bg-gradient-to-t from-emerald-600 to-teal-400 shadow-teal-500/20 shadow-lg relative group transition"
                  style={{ height: `${(val / 250) * 120}px` }}
                >
                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-950 text-[10px] text-emerald-300 font-mono px-1 rounded border border-emerald-500/30 opacity-0 group-hover:opacity-100 transition shadow">
                    {val}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Wk 0{idx+1}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 backdrop-blur-lg">
          <h3 className="font-sans font-medium text-sm text-slate-300 mb-4 tracking-tight flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-400" /> Active Platform Sessions / Load
          </h3>
          <div className="h-44 w-full relative flex items-center justify-center border-b border-slate-800 pb-2">
            <svg className="w-full h-full" viewBox="0 0 400 150">
              <defs>
                <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M 10 120 C 50 110, 100 80, 150 95 C 200 110, 250 50, 300 35 C 350 20, 390 10, 390 10 L 390 150 L 10 150 Z"
                fill="url(#blueGrad)"
                stroke="none"
              />
              <path
                d="M 10 120 C 50 110, 100 80, 150 95 C 200 110, 250 50, 300 35 C 350 20, 390 10, 390 10"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx="150" cy="95" r="5" fill="#3b82f6" stroke="#fff" strokeWidth="2" />
              <circle cx="300" cy="35" r="5" fill="#3b82f6" stroke="#fff" strokeWidth="2" />
            </svg>
            <div className="absolute bottom-1 w-full flex justify-between px-4 text-[10px] text-slate-500 font-mono">
              <span>08:00</span>
              <span>12:00</span>
              <span>16:00</span>
              <span>20:00</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-slate-900/30 p-1 rounded-lg border border-slate-800 inline-flex">
        <button
          onClick={() => setTab('users')}
          className={`px-4 py-1.5 text-xs font-mono rounded-md transition ${tab === 'users' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
        >
          ACADEMIC ROSTER ({users.length})
        </button>
        <button
          onClick={() => setTab('reports')}
          className={`px-4 py-1.5 text-xs font-mono rounded-md transition ${tab === 'reports' ? 'bg-red-600/90 text-white' : 'text-slate-400 hover:text-slate-200'}`}
        >
          FLAGGED PLAGIARISM ({reports.length})
        </button>
        <button
          onClick={() => setTab('logs')}
          className={`px-4 py-1.5 text-xs font-mono rounded-md transition ${tab === 'logs' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
        >
          AUDIT STREAM
        </button>
      </div>

      {/* Panel View */}
      {loading ? (
        <div className="text-center py-10 font-mono text-xs text-slate-500 animate-pulse">Syncing administrator database lists...</div>
      ) : error ? (
        <div className="p-4 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-xs font-mono">{error}</div>
      ) : (
        <div className="bg-slate-950/40 border border-slate-900 rounded-xl overflow-hidden backdrop-blur-xl">
          {tab === 'users' && (
            <div>
              <div className="p-4 bg-slate-900/60 border-b border-slate-800 flex justify-between items-center flex-wrap gap-3">
                <div>
                  <h4 className="font-sans font-bold text-slate-200 text-sm">Academic Faculty & Student Roster</h4>
                  <p className="text-[10px] text-slate-400 font-mono">Manage accounts, override passwords and adjust registration states.</p>
                </div>
                <button
                  onClick={() => setIsAddingUser(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs rounded-lg flex items-center gap-1.5 font-bold cursor-pointer transition shadow shadow-blue-500/10"
                >
                  <Plus className="w-3.5 h-3.5" /> ADD NEW PROFILE
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-900/75 border-b border-slate-800 text-slate-400 font-mono text-[10px]">
                    <tr>
                      <th className="py-3 px-4">USER PROFILE</th>
                      <th className="py-3 px-4">INSTITUTIONAL EMAIL</th>
                      <th className="py-3 px-4">ROLE</th>
                      <th className="py-3 px-4">STATUS</th>
                      <th className="py-3 px-4 text-center">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-slate-900/30">
                        <td className="py-3 px-4 flex items-center gap-3 font-sans">
                          <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full border border-slate-700 object-cover" referrerPolicy="no-referrer" />
                          <div>
                            <p className="font-semibold text-slate-100">{u.name}</p>
                            <p className="text-[10px] text-slate-400 line-clamp-1">{u.bio || 'No bio specified.'}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-400">{u.email}</td>
                        <td className="py-3 px-4 font-sans">
                          <span className={`px-2 py-0.5 text-[10px] font-mono font-semibold rounded-full uppercase ${
                            u.role === 'admin' ? 'bg-red-500/15 text-red-400 border border-red-500/20' : 
                            u.role === 'teacher' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 
                            'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs font-sans">
                          {u.blocked ? (
                            <span className="text-red-400 font-medium">Suspended</span>
                          ) : (
                            <span className="text-emerald-400 font-medium font-mono text-[10px]">ACTIVE</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {u.id !== currentUser.id ? (
                              <>
                                <button
                                  onClick={() => handleToggleBlock(u)}
                                  className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                    u.blocked 
                                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25' 
                                      : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/25'
                                  }`}
                                  title={u.blocked ? "De-suspend Access" : "Suspend Account"}
                                >
                                  {u.blocked ? <UserCheck className="w-3.5 h-3.5" /> : <UserMinus className="w-3.5 h-3.5" />}
                                </button>

                                <button
                                  onClick={() => setEditingUser(u)}
                                  className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white hover:border-slate-700 transition cursor-pointer"
                                  title="Edit Profile Details"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => setChangingPasswordUser(u)}
                                  className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white hover:border-slate-700 transition cursor-pointer"
                                  title="Reset Password PIN"
                                >
                                  <Key className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="p-1.5 rounded-lg border border-red-500/10 bg-red-500/5 text-red-400 hover:bg-red-500/20 hover:border-red-500/30 transition cursor-pointer"
                                  title="Permanently Terminate Account"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <span className="text-xs font-mono text-slate-500">You (Global Root)</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'reports' && (
            <div className="overflow-x-auto">
              {reports.length === 0 ? (
                <div className="p-10 text-center font-mono text-xs text-slate-500">No current system integrity alerts submitted.</div>
              ) : (
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-900/75 border-b border-slate-800 text-slate-400 font-mono text-[10px]">
                    <tr>
                      <th className="py-3 px-4">REPORTED BY</th>
                      <th className="py-3 px-4">STUDY REFERENCE MATERIAL</th>
                      <th className="py-3 px-4">REASON DETAILS</th>
                      <th className="py-3 px-4">STATUS</th>
                      <th className="py-3 px-4 text-center">MODERATION ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {reports.map(r => (
                      <tr key={r.id} className="hover:bg-slate-900/30 font-sans">
                        <td className="py-3 px-4 font-semibold text-slate-200">{r.reportedByName}</td>
                        <td className="py-3 px-4 animate-fadeIn">
                          <p className="font-semibold text-slate-100">{r.noteTitle || 'Untitled Note'}</p>
                          <span className="text-[10px] text-slate-500 font-mono">{r.noteId}</span>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-400">{r.reason}</td>
                        <td className="py-3 px-4 font-mono text-xs">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${r.status === 'resolved' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                            {r.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {r.status === 'pending' ? (
                            <button
                              onClick={() => handleResolveReport(r.id)}
                              className="px-3 py-1 font-mono text-xs text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-md transition cursor-pointer"
                            >
                              DISMISS
                            </button>
                          ) : (
                            <span className="text-slate-500 font-mono text-xs">Case Resolved</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === 'logs' && (
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-900 p-4 space-y-3">
              {logs.map(l => (
                <div key={l.id} className="flex gap-4 text-xs font-mono py-2 hover:bg-slate-900/10">
                  <span className="text-slate-500 text-[10px]">{new Date(l.timestamp).toLocaleTimeString()}</span>
                  <span className={`px-1.5 py-0.5 h-fit text-[9px] rounded font-bold ${
                    l.action === 'LOGIN' ? 'bg-blue-500/20 text-blue-400' :
                    l.action === 'CREATE_NOTE' ? 'bg-emerald-500/20 text-emerald-400' :
                    l.action === 'AI_SUMMARIZE' ? 'bg-violet-500/20 text-violet-400' :
                    'bg-slate-700/20 text-slate-400'
                  }`}>
                    {l.action}
                  </span>
                  <div className="flex-1 font-sans">
                    <span className="text-slate-300 font-semibold font-sans">{l.userName}</span>{' '}
                    <span className="text-slate-400 font-sans">{l.details}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CORE STAT DETAILS OVERLAYS */}
      {activeDetail && (activeDetail === 'students' || activeDetail === 'teachers') && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-900 pb-3">
              <div>
                <h3 className="font-sans font-bold text-slate-100 text-lg flex items-center gap-2">
                  {activeDetail === 'students' ? (
                    <><Activity className="w-5 h-5 text-blue-400" /> Techno India Student Registry</>
                  ) : (
                    <><Shield className="w-5 h-5 text-emerald-400" /> Certified Academic Faculty Directory</>
                  )}
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">Institutional records registered via NotesNode network.</p>
              </div>
              <button 
                onClick={() => setActiveDetail(null)} 
                className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {users.filter(u => u.role === (activeDetail === 'students' ? 'student' : 'teacher')).map(u => (
                <div key={u.id} className="bg-slate-900/40 p-4 rounded-xl border border-slate-850 flex items-start gap-4 hover:border-slate-800 transition">
                  <img src={u.avatar} alt={u.name} className="w-12 h-12 rounded-xl object-cover border border-slate-800 shadow referrer-policy" referrerPolicy="no-referrer" />
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="font-bold text-slate-200">{u.name}</p>
                      <span className="text-[10px] font-mono text-slate-500">Registered {new Date(u.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="font-mono text-xs text-indigo-400 truncate">{u.email}</p>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans mt-0.5">{u.bio || 'This academic member has not recorded a biography portfolio sketch yet.'}</p>
                    <div className="pt-2 flex gap-2 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${u.blocked ? 'bg-red-500/10 text-red-400 border border-red-500/15' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'}`}>
                        {u.blocked ? 'Account Closed/Blocked' : 'Status: Active'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {users.filter(u => u.role === (activeDetail === 'students' ? 'student' : 'teacher')).length === 0 && (
                <p className="text-center text-xs font-mono text-slate-500 py-10">No accounts recorded under this institutional registry file.</p>
              )}
            </div>
            <div className="border-t border-slate-900 pt-3 flex justify-end">
              <button onClick={() => setActiveDetail(null)} className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-300 font-mono text-xs rounded hover:text-white transition uppercase font-semibold cursor-pointer">Dismiss View</button>
            </div>
          </div>
        </div>
      )}

      {activeDetail === 'reports_detail' && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-900 pb-3">
              <div>
                <h3 className="font-sans font-bold text-slate-100 text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" /> Academic Integrity & Moderation Queue
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">Detailed moderation flags submitted by study hall peers.</p>
              </div>
              <button 
                onClick={() => setActiveDetail(null)} 
                className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {reports.map(r => (
                <div key={r.id} className="bg-slate-900/40 p-4 rounded-xl border border-slate-850 space-y-3 hover:border-slate-800 transition animate-fadeIn">
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <span className="text-[9px] font-mono uppercase bg-red-500/10 text-red-400 border border-red-500/15 px-1.5 py-0.5 rounded">MODERATION CASE: {r.id}</span>
                      <h4 className="font-bold text-slate-200 text-sm mt-1.5">Note Title: "{r.noteTitle}"</h4>
                      <p className="text-[10px] text-slate-500 font-mono">Note Hash: {r.noteId}</p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-900 text-xs font-sans">
                    <p className="font-mono text-slate-500 text-[9px] uppercase tracking-wider mb-1">COMPLAINT STATEMENT</p>
                    <p className="text-slate-300 italic">"{r.reason}"</p>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-900">
                    <p className="text-xs text-slate-400 font-sans">Flagged by: <strong className="text-slate-300">{r.reportedByName}</strong></p>
                    <div className="flex gap-2">
                      {r.status === 'pending' ? (
                        <button
                          onClick={async () => {
                            await handleResolveReport(r.id);
                            loadData();
                          }}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] rounded hover:shadow-md transition cursor-pointer"
                        >
                          DISMISS COMPLAINT
                        </button>
                      ) : (
                        <span className="text-slate-500 text-[10px] font-mono">RESOLVED CASE</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {reports.length === 0 && (
                <p className="text-center text-xs font-mono text-slate-500 py-10">No safety reports submitted to the queue.</p>
              )}
            </div>
            <div className="border-t border-slate-900 pt-3 flex justify-end">
              <button onClick={() => setActiveDetail(null)} className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-300 font-mono text-xs rounded hover:text-white transition uppercase font-semibold cursor-pointer">Close Panel</button>
            </div>
          </div>
        </div>
      )}

      {activeDetail === 'logs_detail' && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-900 pb-3">
              <div>
                <h3 className="font-sans font-bold text-slate-100 text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-violet-400" /> Institutional Academic Audit Logs
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">Immutable ledger logs tracking actions across NotesNode university platform.</p>
              </div>
              <button 
                onClick={() => setActiveDetail(null)} 
                className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-[11px]">
              {logs.map(l => (
                <div key={l.id} className="bg-slate-900/20 p-3 rounded-lg border border-slate-900 flex gap-3 hover:bg-slate-905 transition">
                  <span className="text-slate-500 text-[10px] shrink-0 mt-0.5">{new Date(l.timestamp).toLocaleTimeString()}</span>
                  <div className="space-y-1 flex-1 min-w-0 font-sans">
                    <div className="flex justify-between flex-wrap gap-2 items-center font-mono">
                      <span className={`px-1 rounded text-[9px] font-bold ${
                        l.action === 'LOGIN' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/15' :
                        l.action === 'CREATE_NOTE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' :
                        l.action === 'AI_SUMMARIZE' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/15' :
                        l.action.includes('USER') || l.action.includes('PASSWORD') || l.action.includes('DELETE') ? 'bg-red-500/10 text-red-400 border border-red-500/15' :
                        'bg-slate-700/10 text-slate-400 border border-slate-700/15'
                      }`}>
                        {l.action}
                      </span>
                      <span className="text-slate-600 text-[9px] shrink-0">{l.id}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed font-sans text-xs">
                      <strong className="text-slate-400 uppercase font-mono text-[10px]">{l.userName}</strong> ({l.userRole}): {l.details}
                    </p>
                  </div>
                </div>
              ))}
              {logs.length === 0 && (
                <p className="text-center font-mono text-xs text-slate-500 py-10">Audit logging ledger empty.</p>
              )}
            </div>
            <div className="border-t border-slate-900 pt-3 flex justify-end">
              <button onClick={() => setActiveDetail(null)} className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-300 font-mono text-xs rounded hover:text-white transition uppercase font-semibold cursor-pointer">Dismiss Trail</button>
            </div>
          </div>
        </div>
      )}

      {/* USER ADDS/EDITS/CREDENTIALS MODALS */}
      {isAddingUser && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddUser} className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-slate-900 pb-3">
              <div>
                <h3 className="font-sans font-bold text-slate-100 text-lg">Generate Academic Profile</h3>
                <p className="text-[11px] text-slate-500 font-mono">Create study hall accounts for student/faculty personnel.</p>
              </div>
              <button type="button" onClick={() => setIsAddingUser(false)} className="p-1.5 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">FULL NAME</label>
                <input
                  type="text"
                  placeholder="e.g. Snehansu Sekhar Panda"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 font-sans"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">INSTITUTIONAL EMAIL</label>
                <input
                  type="email"
                  placeholder="name@technoindia.edu"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 font-sans"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">PASSWORD PIN</label>
                <input
                  type="text"
                  placeholder="Minimum 6 characters"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 font-sans"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">ROLE</label>
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher (Faculty)</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">ACADEMIC BIO (OPTIONAL)</label>
                <textarea
                  placeholder="Record campus department research topic outline..."
                  value={addBio}
                  onChange={(e) => setAddBio(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 font-sans min-h-16"
                />
              </div>
            </div>

            <div className="border-t border-slate-900 pt-4 flex gap-3 justify-end">
              <button type="button" onClick={() => setIsAddingUser(false)} className="px-4 py-2 text-slate-400 font-mono text-xs rounded hover:text-slate-200 transition bg-transparent border border-transparent">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs rounded-lg transition uppercase font-semibold cursor-pointer">Generate Profile</button>
            </div>
          </form>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <form onSubmit={handleUpdateUserDetails} className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-900 pb-3">
              <div>
                <h3 className="font-sans font-bold text-slate-100 text-lg">Modify Account Details</h3>
                <p className="text-[11px] text-slate-500 font-mono">Update campus variables for ID: {editingUser.id}</p>
              </div>
              <button type="button" onClick={() => setEditingUser(null)} className="p-1.5 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">DISPLAY NAME</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 font-sans"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">EMAIL ADDRESS</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 font-sans"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">ROLE</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher (Faculty)</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">BIO SKETCH</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 font-sans min-h-16"
                />
              </div>
            </div>

            <div className="border-t border-slate-900 pt-4 flex gap-3 justify-end">
              <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 text-slate-400 font-mono text-xs rounded hover:text-slate-200 transition bg-transparent border border-transparent">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs rounded-lg transition uppercase font-semibold cursor-pointer">Save parameters</button>
            </div>
          </form>
        </div>
      )}

      {changingPasswordUser && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleChangePassword} className="bg-slate-950 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-slate-900 pb-3">
              <div>
                <h3 className="font-sans font-bold text-slate-100 text-lg">Change Credentials Pin</h3>
                <p className="text-[11px] text-slate-500 font-mono">Explicit password reset for: "{changingPasswordUser.name}"</p>
              </div>
              <button type="button" onClick={() => setChangingPasswordUser(null)} className="p-1.5 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">NEW PASSCODE PIN</label>
              <input
                type="text"
                placeholder="Submit secure passcode pin"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-sans"
                required
              />
            </div>

            <div className="border-t border-slate-900 pt-4 flex gap-3 justify-end">
              <button type="button" onClick={() => setChangingPasswordUser(null)} className="px-4 py-2 text-slate-400 font-mono text-xs rounded hover:text-slate-200 transition bg-transparent border border-transparent">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs rounded-lg transition uppercase font-semibold cursor-pointer">Change Passcode</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
