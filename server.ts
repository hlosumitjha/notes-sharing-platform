/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.ts';
import { summarizeNoteContent, generateStudyGuide } from './server/gemini.ts';
import { User, Note, Folder, Comment, Notification, Classroom, UserRole, Report } from './src/types.ts';

const app = express();
const server = http.createServer(app);
const PORT = 3000;

app.use(express.json({ limit: '20mb' }));

// Helper to authenticate user from headers
function getAuthenticatedUser(req: express.Request): User | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const userId = authHeader.substring(7);
  const user = db.getUserById(userId);
  if (user && !user.blocked) {
    return user;
  }
  return null;
}

// Ensure caller is admin
function adminOnly(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = getAuthenticatedUser(req);
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Permission denied. Admins only.' });
    return;
  }
  next();
}

// -------------------------------------------------------------
// REST API ROUTES
// -------------------------------------------------------------

// Auth Endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    res.status(400).json({ error: 'Please enter both your institutional email and password.' });
    return;
  }
  
  const user = db.getUserByEmail(email);
  if (!user) {
    res.status(401).json({ error: 'Invalid academic credentials.' });
    return;
  }
  
  // Validate password
  if (user.password !== password) {
    res.status(401).json({ error: 'Incorrect password. Access denied.' });
    return;
  }

  if (user.blocked) {
    res.status(403).json({ error: 'Your account has been suspended by system administrators.' });
    return;
  }

  db.logActivity(user.id, user.name, user.role, 'LOGIN', 'Successful user session established.');
  res.json({ token: user.id, user });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, role, bio, password, recoveryQuestion, recoveryAnswer } = req.body;
  if (!name || !email || !role || !password || !recoveryQuestion || !recoveryAnswer) {
    res.status(400).json({ error: 'Please supply a name, email address, institutional role, password, and password recovery answer.' });
    return;
  }

  const existing = db.getUserByEmail(email);
  if (existing) {
    res.status(400).json({ error: 'Email already registered.' });
    return;
  }

  const defaultAvatars: Record<UserRole, string> = {
    student: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    teacher: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
    admin: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
  };

  const newUser: User = {
    id: `user_${Date.now()}`,
    name,
    email,
    avatar: defaultAvatars[role as UserRole] || defaultAvatars.student,
    role: role as UserRole,
    bio: bio || '',
    blocked: false,
    createdAt: new Date().toISOString(),
    password,
    recoveryQuestion,
    recoveryAnswer: recoveryAnswer.toLowerCase().trim()
  };

  db.createUser(newUser);
  db.logActivity(newUser.id, newUser.name, newUser.role, 'REGISTER', 'Institutional account registered at Techno India University.');

  // Create welcome notification
  db.createNotification({
    id: `notif_${Date.now()}`,
    userId: newUser.id,
    title: 'Welcome to Techno India University!',
    message: 'Explore public study guides, create classrooms, or invite peer collaboration.',
    read: false,
    type: 'system',
    createdAt: new Date().toISOString()
  });

  res.json({ token: newUser.id, user: newUser });
});

app.post('/api/auth/get-recovery-question', (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Please supply an email address.' });
    return;
  }
  const user = db.getUserByEmail(email);
  if (!user) {
    res.status(404).json({ error: 'No user registered with this email address.' });
    return;
  }
  res.json({ 
    recoveryQuestion: user.recoveryQuestion || 'What is your favorite subject?'
  });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { email, recoveryAnswer, newPassword } = req.body;
  if (!email || !recoveryAnswer || !newPassword) {
    res.status(400).json({ error: 'Please fill in all recovery fields.' });
    return;
  }
  const user = db.getUserByEmail(email);
  if (!user) {
    res.status(404).json({ error: 'No user registered with this email address.' });
    return;
  }
  const storedAnswer = (user.recoveryAnswer || '').toLowerCase().trim();
  const suppliedAnswer = recoveryAnswer.toLowerCase().trim();

  if (storedAnswer !== suppliedAnswer) {
    res.status(400).json({ error: 'Incorrect recovery answer code. Reset rejected.' });
    return;
  }

  db.updateUser(user.id, { password: newPassword });
  db.logActivity(user.id, user.name, user.role, 'RESET_PASSWORD', 'Password reset successfully through recovery question verification.');

  res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
});

app.get('/api/auth/me', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized credentials.' });
    return;
  }
  res.json(user);
});

// Notes Queries
app.get('/api/notes', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  // Get notes owned, collaborated on, or public
  const allNotes = db.getNotes();
  const filtered = allNotes.filter(n => {
    if (user.role === 'admin') return true; // Admins can monitor everything
    if (n.ownerId === user.id) return true;
    if (n.isPublic) return true;
    return n.collaborators.some(c => c.userId === user.id);
  });

  res.json(filtered);
});

app.get('/api/notes/:id', (req, res) => {
  const user = getAuthenticatedUser(req);
  const note = db.getNoteById(req.params.id);

  if (!note) {
    res.status(404).json({ error: 'Note not found.' });
    return;
  }

  if (user) {
    const isOwner = note.ownerId === user.id;
    const isCollab = note.collaborators.some(c => c.userId === user.id);
    const isPublic = note.isPublic;
    if (!isOwner && !isCollab && !isPublic && user.role !== 'admin') {
      res.status(403).json({ error: 'You do not have access permissions for this note.' });
      return;
    }
  } else if (!note.isPublic) {
    res.status(403).json({ error: 'Unauthorized. This note is privatized.' });
    return;
  }

  res.json(note);
});

app.post('/api/notes', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { title, content, tags, folderId, isPublic, category } = req.body;

  const newNote: Note = {
    id: `not_${Date.now()}`,
    title: title || 'Untitled Academic Note',
    content: content || '',
    tags: tags || [],
    category: category || 'General Studies',
    ownerId: user.id,
    ownerName: user.name,
    collaborators: [],
    attachments: [],
    versions: [],
    pinned: false,
    archived: false,
    folderId: folderId || undefined,
    isPublic: !!isPublic,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.createNote(newNote);
  db.logActivity(user.id, user.name, user.role, 'CREATE_NOTE', `Created note: "${newNote.title}"`);
  res.json(newNote);
});

app.put('/api/notes/:id', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const note = db.getNoteById(req.params.id);
  if (!note) {
    res.status(404).json({ error: 'Note not found' });
    return;
  }

  // Check edit permissions
  const isOwner = note.ownerId === user.id;
  const isEditor = note.collaborators.some(c => c.userId === user.id && (c.permission === 'edit' || c.permission === 'admin'));
  const isAdmin = user.role === 'admin';
  const isTeacher = user.role === 'teacher';

  if (!isOwner && !isEditor && !isAdmin && !isTeacher) {
    res.status(403).json({ error: 'Insufficient write permissions for this note.' });
    return;
  }

  // Update
  const params = req.body;
  const updated = db.updateNote(req.params.id, {
    ...params,
    ownerId: note.ownerId, // Lock owner identity
    ownerName: note.ownerName
  });

  res.json(updated);
});

app.delete('/api/notes/:id', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const note = db.getNoteById(req.params.id);
  if (!note) {
    res.status(404).json({ error: 'Note not found' });
    return;
  }

  if (note.ownerId !== user.id && user.role !== 'admin') {
    res.status(403).json({ error: 'Only administrators or owners can delete a note.' });
    return;
  }

  db.deleteNote(req.params.id);
  db.logActivity(user.id, user.name, user.role, 'DELETE_NOTE', `Deleted note: "${note.title}"`);
  res.json({ success: true });
});

// Folders REST Endpoints
app.get('/api/folders', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  res.json(db.getFoldersByUser(user.id));
});

app.post('/api/folders', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { name } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Specify a folder name.' });
    return;
  }

  const existingFolders = db.getFoldersByUser(user.id);
  const newFolder: Folder = {
    id: `fld_${Date.now()}`,
    name,
    ownerId: user.id,
    order: existingFolders.length + 1,
    createdAt: new Date().toISOString()
  };

  db.createFolder(newFolder);
  res.json(newFolder);
});

app.delete('/api/folders/:id', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const deleted = db.deleteFolder(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Folder not found.' });
    return;
  }

  res.json({ success: true });
});

// Collaborative Shares Endpoints
app.post('/api/notes/:id/collaborators', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const note = db.getNoteById(req.params.id);
  if (!note) {
    res.status(404).json({ error: 'Note not found' });
    return;
  }

  if (note.ownerId !== user.id && user.role !== 'admin') {
    res.status(403).json({ error: 'Only owners can manage sharing settings.' });
    return;
  }

  const { email, permission } = req.body;
  if (!email || !permission) {
    res.status(400).json({ error: 'supply target email and permission tier.' });
    return;
  }

  const targetUser = db.getUserByEmail(email);
  if (!targetUser) {
    res.status(404).json({ error: 'User student or teacher credentials unrecognized.' });
    return;
  }

  if (targetUser.id === note.ownerId) {
    res.status(400).json({ error: 'You are already the authoritative owner of this note.' });
    return;
  }

  const collaborators = [...(note.collaborators || [])];
  const existingIdx = collaborators.findIndex(c => c.userId === targetUser.id);

  if (existingIdx !== -1) {
    collaborators[existingIdx].permission = permission;
  } else {
    collaborators.push({
      userId: targetUser.id,
      userName: targetUser.name,
      userEmail: targetUser.email,
      permission
    });

    // Create Notification
    db.createNotification({
      id: `notif_${Date.now()}`,
      userId: targetUser.id,
      title: 'Peer Collaboration Invite',
      message: `${user.name} shared the note "${note.title}" with permission model: ${permission}.`,
      read: false,
      type: 'collab',
      createdAt: new Date().toISOString()
    });
  }

  const updated = db.updateNote(note.id, { collaborators });
  db.logActivity(user.id, user.name, user.role, 'SHARE_NOTE', `Shared note "${note.title}" with email ${email}`);
  res.json(updated);
});

// User Uploading
app.post('/api/upload', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { name, base64, size, mimeType, noteId } = req.body;
  if (!name || !base64 || !noteId) {
    res.status(400).json({ error: 'Missing uploaded binary block credentials.' });
    return;
  }

  const note = db.getNoteById(noteId);
  if (!note) {
    res.status(404).json({ error: 'Target academic notes resource unassigned.' });
    return;
  }

  // Add upload as an attachment node
  const attachment = {
    name,
    mimeType: mimeType || 'image/png',
    size: size || base64.length,
    url: base64 // we keep simple base64 image encoding for full sandboxed self-reliance!
  };

  const currentAttachments = [...(note.attachments || [])];
  currentAttachments.push(attachment);

  db.updateNote(note.id, { attachments: currentAttachments });
  db.logActivity(user.id, user.name, user.role, 'UPLOAD_ATTACHMENT', `Uploaded attachment "${name}" inside "${note.title}"`);
  res.json(attachment);
});

// Comment Endpoints
app.get('/api/notes/:noteId/comments', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  res.json(db.getCommentsByNote(req.params.noteId));
});

app.post('/api/notes/:noteId/comments', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { text } = req.body;
  if (!text) {
    res.status(400).json({ error: 'Supplied blank comment stream.' });
    return;
  }

  const comment: Comment = {
    id: `com_${Date.now()}`,
    noteId: req.params.noteId,
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatar,
    text,
    createdAt: new Date().toISOString()
  };

  db.createComment(comment);
  
  // Note owner notification trigger (if not commenting on own note)
  const note = db.getNoteById(req.params.noteId);
  if (note && note.ownerId !== user.id) {
    db.createNotification({
      id: `notif_${Date.now()}`,
      userId: note.ownerId,
      title: 'New Student Comment',
      message: `${user.name} posted a comment on your study note: "${note.title}".`,
      read: false,
      type: 'comment',
      createdAt: new Date().toISOString()
    });
  }

  res.json(comment);
});

// Classrooms
app.get('/api/classrooms', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const allCls = db.getClassrooms();
  if (user.role === 'admin') {
    res.json(allCls);
    return;
  }

  const filtered = allCls.filter(c => c.teacherId === user.id || c.studentIds.includes(user.id));
  res.json(filtered);
});

// Retrieve list of certified active teachers (or admins, since they can also act as lecturers/teachers)
app.get('/api/teachers', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }
  const allUsers = db.getUsers();
  const teachers = allUsers
    .filter(u => (u.role === 'teacher' || u.role === 'admin') && !u.blocked)
    .map(u => ({ id: u.id, name: u.name, email: u.email }));
  res.json(teachers);
});

app.post('/api/classrooms', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
    res.status(403).json({ error: 'Only certified teachers and admins can construct classrooms.' });
    return;
  }

  const { name, description, teacherId } = req.body;
  if (!name) {
    res.status(400).json({ error: 'A classroom identifier name is required.' });
    return;
  }

  let assignedTeacherId = user.id;
  let assignedTeacherName = user.name;

  if (user.role === 'admin' && teacherId) {
    const targetTeacher = db.getUserById(teacherId);
    if (!targetTeacher) {
      res.status(404).json({ error: 'Selected teacher not found.' });
      return;
    }
    assignedTeacherId = targetTeacher.id;
    assignedTeacherName = targetTeacher.name;
  }

  const newCls: Classroom = {
    id: `cls_${Date.now()}`,
    name,
    description: description || '',
    teacherId: assignedTeacherId,
    teacherName: assignedTeacherName,
    code: Math.random().toString(36).substring(2, 8).toUpperCase(),
    studentIds: [],
    noteIds: [],
    createdAt: new Date().toISOString()
  };

  db.createClassroom(newCls);
  db.logActivity(user.id, user.name, user.role, 'CREATE_CLASSROOM', `Constructed classroom room "${newCls.name}" assigned to lecturer ${assignedTeacherName}`);
  res.json(newCls);
});

// Update classroom properties (e.g. name, description, assigned teacher)
app.put('/api/classrooms/:id', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  const classrooms = db.getClassrooms();
  const cls = classrooms.find(c => c.id === req.params.id);

  if (!cls) {
    res.status(404).json({ error: 'Classroom not found.' });
    return;
  }

  // Only the assigned teacher or an administrator can update classroom properties
  if (cls.teacherId !== user.id && user.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden. Only the assigned teacher or an administrator can update classroom properties.' });
    return;
  }

  const { name, description, teacherId } = req.body;
  const updates: Partial<Classroom> = {};

  if (name !== undefined) {
    if (!name.trim()) {
      res.status(400).json({ error: 'Classroom name cannot be empty.' });
      return;
    }
    updates.name = name;
  }

  if (description !== undefined) {
    updates.description = description;
  }

  if (teacherId !== undefined) {
    // Only administrators can change/update the assigned teacher
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Only administrators can re-assign class teachers.' });
      return;
    }
    
    const targetTeacher = db.getUserById(teacherId);
    if (!targetTeacher) {
      res.status(404).json({ error: 'Assigned teacher not found.' });
      return;
    }
    updates.teacherId = targetTeacher.id;
    updates.teacherName = targetTeacher.name;
  }

  const updatedCls = db.updateClassroom(cls.id, updates);
  db.logActivity(user.id, user.name, user.role, 'UPDATE_CLASSROOM', `Updated classroom room "${cls.name}" properties`);
  res.json(updatedCls);
});

app.post('/api/classrooms/join', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { code } = req.body;
  if (!code) {
    res.status(400).json({ error: 'Please submit a classroom invitation code.' });
    return;
  }

  const all = db.getClassrooms();
  const cls = all.find(c => c.code.toLowerCase() === code.trim().toLowerCase());

  if (!cls) {
    res.status(404).json({ error: 'Unrecognized classroom invitation code.' });
    return;
  }

  if (cls.studentIds.includes(user.id)) {
    res.status(400).json({ error: 'You are already registered inside this workspace classroom.' });
    return;
  }

  const studentIds = [...cls.studentIds, user.id];
  db.updateClassroom(cls.id, { studentIds });

  // Inform Teacher
  db.createNotification({
    id: `notif_${Date.now()}`,
    userId: cls.teacherId,
    title: 'Student Joined Classroom',
    message: `${user.name} joined your classroom: "${cls.name}".`,
    read: false,
    type: 'classroom',
    createdAt: new Date().toISOString()
  });

  db.logActivity(user.id, user.name, user.role, 'JOIN_CLASSROOM', `Enrolled in classroom room: "${cls.name}"`);
  res.json(cls);
});

// Link notes to classrooms
app.post('/api/classrooms/:id/notes', (req, res) => {
  const user = getAuthenticatedUser(req);
  const { noteId } = req.body;

  if (!user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  const classrooms = db.getClassrooms();
  const cls = classrooms.find(c => c.id === req.params.id);

  if (!cls) {
    res.status(404).json({ error: 'Classroom not found.' });
    return;
  }

  // Only the classroom teacher can manage linked syllabus reviews
  if (cls.teacherId !== user.id && user.role !== 'admin') {
    res.status(403).json({ error: 'Only teachers can publish references to classrooms.' });
    return;
  }

  const noteIds = [...cls.noteIds];
  if (!noteIds.includes(noteId)) {
    noteIds.push(noteId);
  }

  db.updateClassroom(cls.id, { noteIds });
  res.json(cls);
});

// Reports & Flag Endpoints
app.post('/api/reports', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  const { noteId, reason } = req.body;
  const note = db.getNoteById(noteId);

  if (!note) {
    res.status(404).json({ error: 'Target study note not found.' });
    return;
  }

  const newReport: Report = {
    id: `rep_${Date.now()}`,
    reportedBy: user.id,
    reportedByName: user.name,
    noteId,
    noteTitle: note.title,
    reason: reason || 'Academic misconduct flag',
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  db.createReport(newReport);
  res.json(newReport);
});

// Notifications Endpoint
app.get('/api/notifications', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized credentials.' });
    return;
  }

  res.json(db.getNotificationsByUser(user.id));
});

app.post('/api/notifications/read', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  db.markNotificationsAsRead(user.id);
  res.json({ success: true });
});

// ——— Gemini AI Integration APIs ———
app.post('/api/notes/:id/ai-summary', async (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  const note = db.getNoteById(req.params.id);
  if (!note) {
    res.status(404).json({ error: 'Note not found.' });
    return;
  }

  const summary = await summarizeNoteContent(note.title, note.content);
  db.logActivity(user.id, user.name, user.role, 'AI_SUMMARIZE', `Synthesized AI summary for note: "${note.title}"`);
  res.json({ summary });
});

app.post('/api/notes/:id/ai-study-guide', async (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  const note = db.getNoteById(req.params.id);
  if (!note) {
    res.status(404).json({ error: 'Note not found.' });
    return;
  }

  const studyGuide = await generateStudyGuide(note.title, note.content);
  db.logActivity(user.id, user.name, user.role, 'AI_STUDY_GUIDE', `Constructed interactive Study Guide for: "${note.title}"`);
  res.json({ studyGuide });
});

// ——— Admin Console Moderation APIs ———
app.get('/api/admin/users', adminOnly, (req, res) => {
  res.json(db.getUsers());
});

app.put('/api/admin/users/:id/block', adminOnly, (req, res) => {
  const { blocked } = req.body;
  const user = db.updateUser(req.params.id, { blocked: !!blocked });
  
  if (!user) {
    res.status(404).json({ error: 'User does not exist.' });
    return;
  }

  const adminUser = getAuthenticatedUser(req)!;
  db.logActivity(adminUser.id, adminUser.name, adminUser.role, blocked ? 'BLOCK_USER' : 'UNBLOCK_USER', `Academic status transitioned for user Email: "${user.email}" manually.`);
  res.json(user);
});

app.get('/api/admin/activity', adminOnly, (req, res) => {
  res.json(db.getActivityLogs().reverse()); // Newest first
});

app.get('/api/admin/reports', adminOnly, (req, res) => {
  res.json(db.getReports());
});

app.put('/api/admin/reports/:id/resolve', adminOnly, (req, res) => {
  const resolved = db.updateReport(req.params.id, { status: 'resolved' });
  if (!resolved) {
    res.status(404).json({ error: 'Academic flag submission unassigned.' });
    return;
  }
  res.json(resolved);
});

app.post('/api/admin/users', adminOnly, (req, res) => {
  const { name, email, role, bio, password, recoveryQuestion, recoveryAnswer } = req.body;
  if (!name || !email || !role || !password) {
    res.status(400).json({ error: 'Name, email, role, and password are required.' });
    return;
  }
  const existing = db.getUserByEmail(email);
  if (existing) {
    res.status(400).json({ error: 'This institutional email is already in use.' });
    return;
  }
  const defaultAvatars: Record<UserRole, string> = {
    student: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    teacher: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
    admin: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
  };
  const newUser: User = {
    id: `user_${Date.now()}`,
    name,
    email,
    avatar: defaultAvatars[role as UserRole] || defaultAvatars.student,
    role: role as UserRole,
    bio: bio || '',
    blocked: false,
    createdAt: new Date().toISOString(),
    password,
    recoveryQuestion: recoveryQuestion || 'What is your favorite subject?',
    recoveryAnswer: recoveryAnswer || 'education'
  };
  db.createUser(newUser);
  const adminUser = getAuthenticatedUser(req)!;
  db.logActivity(adminUser.id, adminUser.name, adminUser.role, 'CREATE_USER_ADMIN', `Administrator generated new user profile for: "${newUser.name}" (${newUser.role})`);
  res.json(newUser);
});

app.put('/api/admin/users/:id', adminOnly, (req, res) => {
  const { name, email, role, bio } = req.body;
  const updated = db.updateUser(req.params.id, { name, email, role, bio });
  if (!updated) {
    res.status(404).json({ error: 'User profile does not exist.' });
    return;
  }
  const adminUser = getAuthenticatedUser(req)!;
  db.logActivity(adminUser.id, adminUser.name, adminUser.role, 'UPDATE_USER_ADMIN', `Administrator updated profile details for: "${updated.name}"`);
  res.json(updated);
});

app.put('/api/admin/users/:id/password', adminOnly, (req, res) => {
  const { password } = req.body;
  if (!password) {
    res.status(400).json({ error: 'Password cannot be blank.' });
    return;
  }
  const updated = db.updateUser(req.params.id, { password });
  if (!updated) {
    res.status(404).json({ error: 'User profile does not exist.' });
    return;
  }
  const adminUser = getAuthenticatedUser(req)!;
  db.logActivity(adminUser.id, adminUser.name, adminUser.role, 'UPDATE_PASSWORD_ADMIN', `Administrator reset/updated password for user: "${updated.name}"`);
  res.json({ success: true, message: 'Password updated successfully' });
});

app.delete('/api/admin/users/:id', adminOnly, (req, res) => {
  const targetId = req.params.id;
  const adminUser = getAuthenticatedUser(req)!;
  if (targetId === adminUser.id) {
    res.status(400).json({ error: 'Administrators cannot self-terminate their root master profile.' });
    return;
  }
  const targetUser = db.getUserById(targetId);
  if (!targetUser) {
    res.status(404).json({ error: 'User does not exist.' });
    return;
  }
  const deleted = db.deleteUser(targetId);
  if (deleted) {
    db.logActivity(adminUser.id, adminUser.name, adminUser.role, 'DELETE_USER_ADMIN', `Terminated profile and deleted credentials of "${targetUser.name}"`);
    res.json({ success: true, message: 'Institutional credentials deleted.' });
  } else {
    res.status(500).json({ error: 'Unhandled error while removing user.' });
  }
});

// -------------------------------------------------------------
// WEBSOCKET CHANNELS / ROOMS CONFIGURATION
// -------------------------------------------------------------

const wss = new WebSocketServer({ noServer: true });

// Store active note sessions, presence cursors and lists
interface ClientSession {
  ws: WebSocket;
  userId: string;
  userName: string;
  userAvatar: string;
  noteId: string;
}

const activeSessions: Map<WebSocket, ClientSession> = new Map();

interface LiveChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: string;
}

const roomChatHistories: Map<string, LiveChatMessage[]> = new Map();

wss.on('connection', (ws: WebSocket) => {
  ws.on('message', (messageData: string) => {
    try {
      const message = JSON.parse(messageData);
      const { type, payload } = message;

      if (type === 'join') {
        const { userId, userName, userAvatar, noteId } = payload;
        activeSessions.set(ws, { ws, userId, userName, userAvatar, noteId });

        // Broadcast presence list update
        broadcastPresence(noteId);

        // Send existing room live chat history
        const history = roomChatHistories.get(noteId) || [];
        ws.send(JSON.stringify({
          type: 'chat_history',
          payload: { history }
        }));
      } 
      
      else if (type === 'cursor') {
        const session = activeSessions.get(ws);
        if (!session) return;
        
        // Broadcast cursor coordinates to other clients in the same room
        broadcastToRoom(session.noteId, ws, {
          type: 'cursor',
          payload: {
            userId: session.userId,
            userName: session.userName,
            cursor: payload.cursor // { x, y }
          }
        });
      }

      else if (type === 'typing') {
        const session = activeSessions.get(ws);
        if (!session) return;

        broadcastToRoom(session.noteId, ws, {
          type: 'typing',
          payload: {
            userId: session.userId,
            userName: session.userName,
            isTyping: payload.isTyping
          }
        });
      }

      else if (type === 'note_edit') {
        const session = activeSessions.get(ws);
        if (!session) return;

        // Persist content optimistically
        db.updateNote(session.noteId, {
          content: payload.content,
          updatedAt: new Date().toISOString()
        });

        // Sync contents immediately with other editors
        broadcastToRoom(session.noteId, ws, {
          type: 'sync',
          payload: {
            content: payload.content
          }
        });
      }

      else if (type === 'chat_message') {
        const session = activeSessions.get(ws);
        if (!session) return;

        const chatMsg: LiveChatMessage = {
          id: `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          userId: session.userId,
          userName: session.userName,
          userAvatar: session.userAvatar,
          text: payload.text,
          timestamp: new Date().toISOString()
        };

        const history = roomChatHistories.get(session.noteId) || [];
        history.push(chatMsg);
        if (history.length > 102) {
          history.shift();
        }
        roomChatHistories.set(session.noteId, history);

        // Broadcast chat message to everyone in the room (including sender)
        broadcastToRoomWithSender(session.noteId, {
          type: 'chat_message',
          payload: chatMsg
        });
      }
    } catch (err) {
      console.error('WebSocket Payload Exception:', err);
    }
  });

  ws.on('close', () => {
    const session = activeSessions.get(ws);
    if (session) {
      const noteId = session.noteId;
      activeSessions.delete(ws);
      // Re-broadcast updated presence
      broadcastPresence(noteId);
    }
  });
});

function broadcastPresence(noteId: string) {
  const presenceList = Array.from(activeSessions.values())
    .filter(s => s.noteId === noteId)
    .map(s => ({
      userId: s.userId,
      userName: s.userName,
      userAvatar: s.userAvatar
    }));

  Array.from(activeSessions.values())
    .filter(s => s.noteId === noteId)
    .forEach(s => {
      s.ws.send(JSON.stringify({
        type: 'presence',
        payload: { users: presenceList }
      }));
    });
}

function broadcastToRoom(noteId: string, senderWs: WebSocket, data: any) {
  Array.from(activeSessions.values())
    .filter(s => s.noteId === noteId && s.ws !== senderWs)
    .forEach(s => {
      if (s.ws.readyState === WebSocket.OPEN) {
        s.ws.send(JSON.stringify(data));
      }
    });
}

function broadcastToRoomWithSender(noteId: string, data: any) {
  Array.from(activeSessions.values())
    .filter(s => s.noteId === noteId)
    .forEach(s => {
      if (s.ws.readyState === WebSocket.OPEN) {
        s.ws.send(JSON.stringify(data));
      }
    });
}

// Attach WebSocket Upgrade Handler
server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
  if (pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// -------------------------------------------------------------
// VITE OR STATIC PROVISIONING MIDDLEWARE
// -------------------------------------------------------------

async function integrateMiddlewares() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const buildPath = path.join(process.cwd(), 'dist');
    app.use(express.static(buildPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(buildPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Academic Nexus Server active on Room Port ${PORT}`);
  });
}

integrateMiddlewares();
