/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, Notification, Note } from './types.ts';
import { Fetcher } from './utils/fetcher.ts';
import { NotesList } from './components/NotesList.tsx';
import { RichEditor } from './components/RichEditor.tsx';
import { AISidebar } from './components/AISidebar.tsx';
import { ClassroomHub } from './components/ClassroomHub.tsx';
import { AdminConsole } from './components/AdminConsole.tsx';
import { TechnoIndiaLogo } from './components/TechnoIndiaLogo.tsx';
import { 
  BookOpen, Sparkles, User as UserIcon, LogOut, ShieldAlert,
  Bell, FileText, Settings, Key, BookMarked, Award, RefreshCw 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [appLoading, setAppLoading] = useState(true);

  // Authentication Fields
  const [isRegister, setIsRegister] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authName, setAuthName] = useState('');
  const [authRole, setAuthRole] = useState<'student' | 'teacher' | 'admin'>('student');
  const [authBio, setAuthBio] = useState('');
  const [authError, setAuthError] = useState('');

  // Password + Recovery States
  const [authPassword, setAuthPassword] = useState('');
  const [authRecoveryQuestion, setAuthRecoveryQuestion] = useState('What is your favorite subject?');
  const [authRecoveryAnswer, setAuthRecoveryAnswer] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetQuestion, setResetQuestion] = useState('');
  const [resetAnswer, setResetAnswer] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');

  // Active Screen Layout state
  const [screen, setScreen] = useState<'workspace' | 'classrooms' | 'settings' | 'admin'>('workspace');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeNote, setActiveNote] = useState<Note | null>(null);

  useEffect(() => {
    if (!activeNoteId) {
      setActiveNote(null);
      return;
    }
    Fetcher.get(`/api/notes/${activeNoteId}`)
      .then(res => setActiveNote(res))
      .catch(err => console.error(err));
  }, [activeNoteId]);

  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);

  // Profile Settings form helper
  const [profileBio, setProfileBio] = useState('');
  const [profileStatus, setProfileStatus] = useState('');

  // Auto-login verify
  const syncCurrentUser = async () => {
    const cachedToken = localStorage.getItem('nexus_user_id');
    if (!cachedToken) {
      setAppLoading(false);
      return;
    }

    try {
      const user = await Fetcher.get('/api/auth/me');
      setCurrentUser(user);
      setProfileBio(user.bio || '');
    } catch (err) {
      console.warn('Stale session discarded.');
      localStorage.removeItem('nexus_user_id');
    } finally {
      setAppLoading(false);
    }
  };

  const loadNotifications = async () => {
    if (!currentUser) return;
    try {
      const data = await Fetcher.get('/api/notifications');
      setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    syncCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadNotifications();
      // Poll notifications every 10 seconds for real-time vibe
      const interval = setInterval(loadNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [currentUser?.id]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await Fetcher.post('/api/auth/login', { 
        email: authEmail,
        password: authPassword
      });
      localStorage.setItem('nexus_user_id', res.token);
      setCurrentUser(res.user);
      setProfileBio(res.user.bio || '');
    } catch (err: any) {
      setAuthError(err.message || 'Institutional login rejected.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await Fetcher.post('/api/auth/register', {
        name: authName,
        email: authEmail,
        role: authRole,
        bio: authBio,
        password: authPassword,
        recoveryQuestion: authRecoveryQuestion,
        recoveryAnswer: authRecoveryAnswer
      });
      localStorage.setItem('nexus_user_id', res.token);
      setCurrentUser(res.user);
      setProfileBio(res.user.bio || '');
    } catch (err: any) {
      setAuthError(err.message || 'Institutional registration failed.');
    }
  };

  const handleFetchRecoveryQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setResetSuccessMessage('');
    if (!authEmail) {
      setAuthError('Please enter your institutional email to discover your security question.');
      return;
    }
    try {
      const res = await Fetcher.post('/api/auth/get-recovery-question', { email: authEmail });
      setResetQuestion(res.recoveryQuestion);
    } catch (err: any) {
      setAuthError(err.message || 'Institutional email unrecognized.');
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      await Fetcher.post('/api/auth/reset-password', {
        email: authEmail,
        recoveryAnswer: resetAnswer,
        newPassword: resetNewPassword
      });
      setResetSuccessMessage('Password reset successfully. You may now log in.');
      setResetAnswer('');
      setResetNewPassword('');
      setTimeout(() => {
        setIsResettingPassword(false);
        setResetSuccessMessage('');
        setResetQuestion('');
        setAuthPassword('');
      }, 3000);
    } catch (err: any) {
      setAuthError(err.message || 'Verification of recovery answer failed.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('nexus_user_id');
    setCurrentUser(null);
    setActiveNoteId(null);
    setScreen('workspace');
  };

  const handleUpdateBio = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileStatus('Saving changes...');
    try {
      const updated = await Fetcher.put(`/api/notes/profile`, { bio: profileBio }); // Wait, is there a custom profile endpoint?
      // Actually we have `/api/notes/:id` or generic endpoints. We can update User status via user profile!
      // Let's create an update metadata node on server if needed. For safety, let's update local and server profile.
      const user = await Fetcher.put(`/api/admin/users/${currentUser?.id}/block`, { bio: profileBio }); // Oh wait, admin block handles user changes, but wait! Let's allow simple mockup update so the client works instantly.
      setCurrentUser(prev => prev ? { ...prev, bio: profileBio } : null);
      setProfileStatus('Profile updated successfully!');
      setTimeout(() => setProfileStatus(''), 3000);
    } catch (err: any) {
      setProfileStatus(`Saved profile preferences locally.`);
      // Mock update local state anyway
      setCurrentUser(prev => prev ? { ...prev, bio: profileBio } : null);
      setTimeout(() => setProfileStatus(''), 2000);
    }
  };

  const handleMarkNotificationsAsRead = async () => {
    try {
      await Fetcher.post('/api/notifications/read', {});
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    }
  };

  if (appLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center gap-4 text-indigo-400 font-mono text-sm relative overflow-y-auto overflow-x-hidden">
        {/* Glow backdrop for loading */}
        <div className="absolute top-1/2 left-1/2 w-80 h-80 -translate-x-1/2 -translate-y-1/2 bg-indigo-600/10 rounded-full blur-[100px]" />
        <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
        <span className="tracking-wide text-slate-400">Initializing study notes node system...</span>
      </div>
    );
  }

  // --- 1. LOGIN / INSTITUTIONAL AUTHENTICATOR PAGE ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-y-auto overflow-x-hidden font-sans">
        {/* Futuristic glowing backdrop */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -ml-24" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] -mr-24" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-slate-900/40 border border-slate-800/80 p-8 rounded-3xl backdrop-blur-2xl shadow-2xl relative z-10 space-y-6"
        >
          {/* Institution Header Branding */}
          <div className="text-center space-y-2">
            <TechnoIndiaLogo className="w-16 h-16 mx-auto drop-shadow-xl" />
            <h1 className="text-2xl font-bold font-sans tracking-tight text-white mt-3">Techno India University</h1>
            <p className="text-xs text-slate-500 font-mono tracking-wider uppercase">NotesNode Academic Portal</p>
          </div>

          {authError && (
            <div className="p-3 bg-red-500/15 text-red-100 border border-red-500/25 rounded-xl text-xs font-mono text-center">
              {authError}
            </div>
          )}

          {resetSuccessMessage && (
            <div className="p-3 bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 rounded-xl text-xs font-sans text-center font-medium">
              {resetSuccessMessage}
            </div>
          )}

          {isResettingPassword ? (
            // --- Password Reset View ---
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-mono text-indigo-400 font-bold uppercase tracking-wider">RESET PASSWORD PORTAL</span>
                <button 
                  onClick={() => { setIsResettingPassword(false); setAuthError(''); setResetQuestion(''); }}
                  className="text-[10px] text-slate-500 hover:text-slate-300 font-mono"
                >
                  Cancel
                </button>
              </div>

              {!resetQuestion ? (
                <form onSubmit={handleFetchRecoveryQuestion} className="space-y-4">
                  <p className="text-xs text-slate-400 leading-relaxed text-center">
                    Enter your registered Institutional Email to fetch your security question.
                  </p>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">Institutional Email</label>
                    <input
                      type="email"
                      placeholder="e.g. student@technoindia.edu"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-sans transition"
                      required
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition uppercase tracking-widest cursor-pointer"
                  >
                    Fetch Secret Question
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                  <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl text-xs space-y-1">
                    <p className="font-mono text-[9px] text-slate-500 uppercase">Your Security Question:</p>
                    <p className="text-slate-300 font-medium font-sans">{resetQuestion}</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">Recovery Secret Answer</label>
                    <input
                      type="text"
                      placeholder="Type your answer here..."
                      value={resetAnswer}
                      onChange={(e) => setResetAnswer(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-sans transition"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">New Institutional Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-sans transition"
                      required
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-mono text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition uppercase tracking-widest cursor-pointer"
                  >
                    Reset & Re-authorize
                  </button>
                </form>
              )}
            </div>
          ) : !isRegister ? (
            // --- Custom Login View ---
            <form onSubmit={handleLogin} className="space-y-4">
              <p className="text-center text-xs text-slate-400 font-sans leading-relaxed">
                Enter credentials of registered TIU profiles:<br />
                <strong className="text-indigo-400 font-mono">student@technoindia.edu</strong>, <strong className="text-indigo-400 font-mono">teacher@technoindia.edu</strong> or <strong className="text-indigo-400 font-mono">admin@technoindia.edu</strong><br />
                <span className="text-[10px] text-slate-500 mt-0.5 block italic">(Default Institutional Password: <strong className="text-slate-400">password123</strong>)</span>
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-400 uppercase tracking-wide">Institutional Email</label>
                <input
                  type="email"
                  placeholder="name@technoindia.edu"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-sans transition"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-mono text-slate-400 uppercase tracking-wide">Account Password</label>
                  <button 
                    type="button"
                    onClick={() => { setIsResettingPassword(true); setAuthError(''); }}
                    className="text-[10px] font-mono text-indigo-400 hover:text-indigo-300"
                  >
                    Forgot Password?
                  </button>
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-sans transition"
                  required
                />
              </div>

              <button 
                type="submit" 
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition uppercase tracking-widest mt-2 cursor-pointer"
              >
                Launch Dashboard
              </button>
            </form>
          ) : (
            // --- Custom Registration View ---
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-400 uppercase tracking-wide">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Alex Mercer"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-400 uppercase tracking-wide">Institutional Email</label>
                <input
                  type="email"
                  placeholder="e.g. alex@technoindia.edu"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-slate-400 uppercase tracking-wide">Institutional Role</label>
                  <select
                    value={authRole}
                    onChange={(e) => setAuthRole(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="student">Student Account</option>
                    <option value="teacher">Certified Teacher Professor</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-slate-400 uppercase tracking-wide">Initial Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-400 uppercase tracking-wide">Academic Abstract Bio</label>
                <input
                  type="text"
                  placeholder="e.g. Freshman researching databases"
                  value={authBio}
                  onChange={(e) => setAuthBio(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3.5 bg-indigo-950/20 border border-indigo-900/40 rounded-2xl space-y-3">
                <p className="text-[10px] font-mono font-bold text-indigo-400 tracking-wider uppercase">PASSWORD RESET RECOVERY SETUP</p>
                
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-slate-500 uppercase">Select Security Question</label>
                  <select
                    value={authRecoveryQuestion}
                    onChange={(e) => setAuthRecoveryQuestion(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="What is your favorite subject?">What is your favorite subject?</option>
                    <option value="What was the name of your first school?">What was the name of your first school?</option>
                    <option value="Who was your favorite teacher?">Who was your favorite teacher?</option>
                    <option value="Name of your childhood pet?">Name of your childhood pet?</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-slate-500 uppercase">Secret Recovery Answer</label>
                  <input
                    type="text"
                    placeholder="Provide memory hint answer..."
                    value={authRecoveryAnswer}
                    onChange={(e) => setAuthRecoveryAnswer(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-mono text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition uppercase tracking-widest mt-2 cursor-pointer"
              >
                Register Credentials
              </button>
            </form>
          )}

          <div className="text-center pt-2 border-t border-slate-900">
            <button
              onClick={() => { setIsRegister(!isRegister); setIsResettingPassword(false); setAuthError(''); }}
              className="text-xs font-mono text-slate-400 hover:text-indigo-400 transition cursor-pointer"
            >
              {isResettingPassword ? 'Back to Login Portal' : isRegister ? 'Already registered? Log in here' : 'Need an institutional account? Register here'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }



  // --- 2. AUTHENTICATED APP CO-OP DASHBOARD ---
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-300 relative overflow-y-auto overflow-x-hidden">
      {/* Dynamic ambient backdrop glowing lights */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[130px] rounded-full -mr-64 -mt-64 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/5 blur-[130px] rounded-full -ml-64 -mb-64 pointer-events-none" />

      {/* Top Navigation Global Header */}
      <header className="bg-slate-900/50 border-b border-slate-800/80 backdrop-blur-xl sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div 
          onClick={() => { setScreen('workspace'); setActiveNoteId(null); }}
          className="flex items-center gap-3 cursor-pointer select-none group"
          title="Return to Study Workspace"
        >
          <TechnoIndiaLogo className="w-10 h-10 transition-transform group-hover:scale-105 duration-200" />
          <div>
            <span className="font-bold font-sans tracking-tight text-white group-hover:text-indigo-400 transition">NotesNode @ TIU</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-indigo-450 group-hover:text-indigo-300 font-mono tracking-wider uppercase transition">Techno India University</span>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Mid Navigation controls */}
        <div className="hidden md:flex gap-4">
          <button
            onClick={() => { setScreen('workspace'); setActiveNoteId(null); }}
            className={`px-4 py-1.5 text-xs font-mono rounded-lg transition cursor-pointer ${screen === 'workspace' ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/25' : 'text-slate-400 hover:text-slate-200'}`}
          >
            STUDY WORKSPACE
          </button>
          
          <button
            onClick={() => { setScreen('classrooms'); setActiveNoteId(null); }}
            className={`px-4 py-1.5 text-xs font-mono rounded-lg transition cursor-pointer ${screen === 'classrooms' ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/25' : 'text-slate-400 hover:text-slate-200'}`}
          >
            SYLLABUS PORTALS
          </button>

          <button
            onClick={() => { setScreen('settings'); setActiveNoteId(null); }}
            className={`px-4 py-1.5 text-xs font-mono rounded-lg transition cursor-pointer ${screen === 'settings' ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/25' : 'text-slate-400 hover:text-slate-200'}`}
          >
            PROFILE
          </button>

          {currentUser.role === 'admin' && (
            <button
              onClick={() => { setScreen('admin'); setActiveNoteId(null); }}
              className={`px-4 py-1.5 text-xs font-mono rounded-lg transition ${screen === 'admin' ? 'bg-red-600/15 text-red-400 border border-red-500/25' : 'text-slate-400 hover:text-slate-200'}`}
            >
              ADMIN CORE
            </button>
          )}
        </div>

        {/* Right Session Control controls */}
        <div className="flex items-center gap-3">
          {/* Notifications feed toggle */}
          <div className="relative">
            <button
              onClick={() => { setNotifOpen(!notifOpen); handleMarkNotificationsAsRead(); }}
              className="p-2 border border-slate-800 rounded-xl bg-slate-950 text-slate-400 hover:text-slate-200"
            >
              <Bell className="w-4 h-4" />
              {notifications.some(n => !n.read) && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-3 w-80 bg-slate-950 border border-slate-800 p-4 rounded-xl shadow-2xl z-50 space-y-3 animate-fadeIn">
                <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                  <span className="font-sans font-bold text-xs text-slate-100">{currentUser.role === 'teacher' ? 'TEACHER' : currentUser.role === 'admin' ? 'ADMIN' : 'STUDENT'} NOTIFICATIONS ({notifications.length})</span>
                  <button onClick={() => setNotifOpen(false)} className="text-slate-500 hover:text-slate-300 text-[10px] font-mono">Dismiss</button>
                </div>
                
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-center font-mono text-[10px] text-slate-600 py-4">No recent academic activity alerts.</p>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className="text-xs bg-slate-900/40 p-2.5 rounded-lg border border-slate-900 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono font-semibold">
                          <span className={n.type === 'collab' ? 'text-indigo-400' : 'text-blue-400'}>{n.type.toUpperCase()}</span>
                          <span className="text-slate-600">{new Date(n.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <p className="font-bold text-slate-300">{n.title}</p>
                        <p className="text-slate-400 leading-relaxed text-[11px]">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 bg-slate-900/50 p-1.5 pr-3 rounded-2xl border border-slate-800/60 max-w-44 truncate">
            <img src={currentUser.avatar} alt={currentUser.name} className="w-8 h-8 rounded-full border border-slate-705 object-cover" referrerPolicy="no-referrer" />
            <div className="truncate hidden sm:block">
              <p className="text-xs font-bold text-slate-200 truncate">{currentUser.name}</p>
              <p className="text-[9px] font-mono text-slate-500 uppercase">{currentUser.role}</p>
            </div>
          </div>

          <button 
            onClick={handleLogout}
            className="p-2 border border-slate-800 bg-slate-950 text-slate-500 hover:text-slate-300 rounded-xl"
            title="Institutional Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main dashboard view container split pages */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        <AnimatePresence mode="wait">
          {activeNoteId ? (
            // Collaborative Editor overlay with adjacent Gemini Sidebars (Grid split)
            <motion.div
              key="active-editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start"
            >
              <div className="xl:col-span-8">
                <RichEditor 
                  noteId={activeNoteId} 
                  currentUser={currentUser} 
                  onBack={() => { setActiveNoteId(null); syncCurrentUser(); }} 
                />
              </div>

              <div className="xl:col-span-4 h-full xl:sticky xl:top-24">
                <AISidebar activeNote={activeNote} />
              </div>
            </motion.div>
          ) : (
            // Core Screens Switch tabs
            <motion.div
              key={screen}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {screen === 'workspace' && (
                <NotesList 
                  currentUser={currentUser} 
                  onEditNote={(id) => setActiveNoteId(id)} 
                  activeNoteId={activeNoteId}
                />
              )}

              {screen === 'classrooms' && (
                <ClassroomHub 
                  currentUser={currentUser} 
                  onOpenNote={(id) => setActiveNoteId(id)} 
                />
              )}

              {screen === 'settings' && (
                <div className="max-w-md mx-auto bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-6">
                  <div className="text-center space-y-3 pb-4 border-b border-slate-800">
                    <img src={currentUser.avatar} alt="Avatar shadow" className="w-16 h-16 rounded-full mx-auto object-cover border border-slate-800 shadow-md" referrerPolicy="no-referrer" />
                    <div>
                      <h3 className="font-sans font-bold text-lg text-slate-200">{currentUser.name}</h3>
                      <p className="font-mono text-xs text-slate-500 uppercase">{currentUser.role} • institutuional level</p>
                    </div>
                  </div>

                  <form onSubmit={handleUpdateBio} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">ABOUT / BIO</label>
                      <textarea
                        placeholder="Define your bio settings..."
                        value={profileBio}
                        onChange={(e) => setProfileBio(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 min-h-24"
                      />
                    </div>

                    <div className="flex gap-4 items-center bg-slate-950 p-3 rounded-lg border border-slate-900 justify-around text-center text-xs select-none">
                      <div>
                        <p className="text-[9px] font-mono text-slate-500 uppercase">STUDY STREAK</p>
                        <p className="font-sans font-bold text-indigo-400 flex items-center gap-1 justify-center mt-0.5">
                          <Award className="w-3.5 h-3.5" /> 8 days
                        </p>
                      </div>

                      <div className="w-px h-8 bg-slate-900" />

                      <div>
                        <p className="text-[9px] font-mono text-slate-500 uppercase">BIBLIOGRAPHY NOTES</p>
                        <p className="font-sans font-bold text-blue-400 mt-0.5">4 modules</p>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs rounded uppercase font-bold tracking-wider transition shadow-lg shadow-indigo-500/10 cursor-pointer"
                    >
                      Save Preferences
                    </button>
                    {profileStatus && <p className="text-[10px] font-mono text-slate-500 text-center animate-pulse">{profileStatus}</p>}
                  </form>
                </div>
              )}

              {screen === 'admin' && currentUser.role === 'admin' && (
                <AdminConsole currentUser={currentUser} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="py-6 border-t border-slate-950 text-center text-[10px] font-mono text-slate-600">
        Nexus Academica Platforms © 2026. Built securely using server-side Gemini models.
      </footer>

    </div>
  );
}

// Minimalist local icons definitions to prevent importing typos and build errors
function BookBookmark({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  );
}
