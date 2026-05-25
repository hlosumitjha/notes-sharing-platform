/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { 
  User, Note, Folder, Comment, Notification, 
  Classroom, ActivityLog, Report, UserRole 
} from '../src/types.ts';

const DATA_DIR = path.join(process.cwd(), 'data_store');

// Core database structure
class JSONDatabase {
  private data: {
    users: User[];
    notes: Note[];
    folders: Folder[];
    comments: Comment[];
    notifications: Notification[];
    classrooms: Classroom[];
    activityLogs: ActivityLog[];
    reports: Report[];
  } = {
    users: [],
    notes: [],
    folders: [],
    comments: [],
    notifications: [],
    classrooms: [],
    activityLogs: [],
    reports: []
  };

  constructor() {
    this.init();
  }

  private init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const collections = [
      'users', 'notes', 'folders', 'comments', 
      'notifications', 'classrooms', 'activityLogs', 'reports'
    ];

    collections.forEach(col => {
      const filePath = path.join(DATA_DIR, `${col}.json`);
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          (this.data as any)[col] = JSON.parse(content);
        } catch (err) {
          console.error(`Error reading database file ${col}.json, resetting:`, err);
          (this.data as any)[col] = [];
          this.save(col);
        }
      } else {
        (this.data as any)[col] = [];
        this.save(col);
      }
    });

    // Migrate and set default passwords, reset questions, and update domains to Techno India University
    this.data.users.forEach(u => {
      if (u.email && u.email.includes('@nexus.edu')) {
        u.email = u.email.replace('@nexus.edu', '@technoindia.edu');
      }
      if (!u.password) {
        u.password = 'password123';
      }
      if (!u.recoveryQuestion) {
        u.recoveryQuestion = 'What is your favorite subject?';
      }
      if (!u.recoveryAnswer) {
        u.recoveryAnswer = u.role === 'teacher' ? 'education' : 'computer science';
      }
    });

    // Also update domains in collaborators in existing notes for consistency
    this.data.notes.forEach(n => {
      n.collaborators?.forEach(c => {
        if (c.userEmail && c.userEmail.includes('@nexus.edu')) {
          c.userEmail = c.userEmail.replace('@nexus.edu', '@technoindia.edu');
        }
      });
    });

    // Seed if empty
    if (this.data.users.length === 0) {
      this.seedAndBootstrap();
    } else {
      // Save migrated data
      this.save('users');
      this.save('notes');
    }
  }

  private save(collection: string) {
    try {
      const filePath = path.join(DATA_DIR, `${collection}.json`);
      fs.writeFileSync(filePath, JSON.stringify((this.data as any)[collection], null, 2), 'utf8');
    } catch (err) {
      console.error(`Error writing database file ${collection}.json:`, err);
    }
  }

  private seedAndBootstrap() {
    this.data.users = [
      {
        id: 'user_u1',
        name: 'Alex Mercer',
        email: 'student@technoindia.edu',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
        role: 'student',
        bio: 'Freshman studying Computer Science at Techno India University. Love algorithms and tea.',
        blocked: false,
        createdAt: new Date().toISOString(),
        password: 'password123',
        recoveryQuestion: 'What is your favorite subject?',
        recoveryAnswer: 'computer science'
      },
      {
        id: 'user_u2',
        name: 'Dr. Helen Vance',
        email: 'teacher@technoindia.edu',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
        role: 'teacher',
        bio: 'Associate Professor of Computer Human Interaction at Techno India University.',
        blocked: false,
        createdAt: new Date().toISOString(),
        password: 'password123',
        recoveryQuestion: 'What is your favorite subject?',
        recoveryAnswer: 'hci'
      },
      {
        id: 'user_u3',
        name: 'System Admin',
        email: 'admin@technoindia.edu',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
        role: 'admin',
        bio: 'Techno India University NotesNode Administrator.',
        blocked: false,
        createdAt: new Date().toISOString(),
        password: 'password123',
        recoveryQuestion: 'What is your favorite subject?',
        recoveryAnswer: 'administration'
      },
      {
        id: 'user_u4',
        name: 'Claire Redfield',
        email: 'claire@technoindia.edu',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200',
        role: 'student',
        bio: 'Physics enthusiast at Techno India University. Avid reader.',
        blocked: false,
        createdAt: new Date().toISOString(),
        password: 'password123',
        recoveryQuestion: 'What is your favorite subject?',
        recoveryAnswer: 'physics'
      }
    ];

    this.data.folders = [
      { id: 'fld_1', name: '💻 Web Development', ownerId: 'user_u1', order: 1, createdAt: new Date().toISOString() },
      { id: 'fld_2', name: '📈 Data Structures', ownerId: 'user_u1', order: 2, createdAt: new Date().toISOString() },
      { id: 'fld_3', name: '🌌 Modern Physics', ownerId: 'user_u4', order: 1, createdAt: new Date().toISOString() }
    ];

    this.data.notes = [
      {
        id: 'not_1',
        title: 'Vite 6 and React 19 Best Practices',
        content: `# Vite 6 & React 19 Core Guide
Welcome to your student handbook companion. Let's master the server-side patterns!

## 1. Declarative Server Components
React 19 native support makes standard asynchronous operations extremely elegant. Use state triggers correctly.

## 2. Shared Type Safety
Shared TypeScript interfaces at the root level mean our Express APIs and React dashboard never go out of sync.

## Code Blocks Demonstration
\`\`\`typescript
export function renderCanvas(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#0f172a'; // Carbon Slate Background
  ctx.fillRect(0, 0, 800, 600);
}
\`\`\`

## Quick Student Tasks Checklist
- [x] Read Vite configuration guidelines
- [x] Integrate shared typings in backend controller
- [ ] Connect WebSocket-live synchronization handler`,
        tags: ['React', 'React19', 'Vite', 'WebDev'],
        category: 'Computer Science',
        ownerId: 'user_u1',
        ownerName: 'Alex Mercer',
        folderId: 'fld_1',
        collaborators: [
          { userId: 'user_u2', userName: 'Dr. Helen Vance', userEmail: 'teacher@nexus.edu', permission: 'admin' },
          { userId: 'user_u4', userName: 'Claire Redfield', userEmail: 'claire@nexus.edu', permission: 'edit' }
        ],
        attachments: [
          { name: 'ViteDocumentation.pdf', url: 'https://vite.dev', mimeType: 'application/pdf', size: 10243 }
        ],
        versions: [
          { id: 'ver_1', title: 'Vite 6 Draft', content: '# Vite 6 & React 19 Draft', updatedBy: 'Alex Mercer', updatedById: 'user_u1', updatedAt: new Date(Date.now() - 3600000).toISOString() }
        ],
        pinned: true,
        archived: false,
        isPublic: true,
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'not_2',
        title: 'Quantum Mechanics Mechanics cheat sheet',
        content: `# Quantum Superposition cheatsheet
Here is a crash-course guide written for final exams in Modern Physics.

* **Schrödinger’s Equation**: Describes quantum operations over time.
* **Planck Constant**: $h = 6.626 \\times 10^{-34}\\text{ J}\\cdot\\text{s}$
* **Wave Function (ψ)**: Describes the state of a particle completely.

### Helpful Formula Checklist
- [x] Calculate energy quantization states
- [ ] Verify spin-1 element matrix properties
- [ ] Draft homework solutions for Lecture 12`,
        tags: ['Physics', 'Quantum', 'CheatSheet'],
        category: 'Physics',
        ownerId: 'user_u4',
        ownerName: 'Claire Redfield',
        folderId: 'fld_3',
        collaborators: [
          { userId: 'user_u1', userName: 'Alex Mercer', userEmail: 'student@nexus.edu', permission: 'comment' }
        ],
        attachments: [],
        versions: [],
        pinned: false,
        archived: false,
        isPublic: true,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 12000000).toISOString()
      },
      {
        id: 'not_3',
        title: 'Lecture Note: Intro to HCI Design Patterns',
        content: `# HCI Lecture 1 Notes
Administered by helen@nexus.edu.

## Usability Heuristics (Nielsen's)
1. **Visibility of system status**: Keep users informed instantly.
2. **Match between system and real world**: Speak the reader's vocabulary explicitly.
3. **User control and freedom**: Standard undo and redos are mandatory.

Our student system follows these! Use standard CSS offsets paired with Framer Motion for responsive cues.`,
        tags: ['HCI', 'UX', 'LectureNotes'],
        category: 'Computer Science',
        ownerId: 'user_u2',
        ownerName: 'Dr. Helen Vance',
        collaborators: [
          { userId: 'user_u1', userName: 'Alex Mercer', userEmail: 'student@nexus.edu', permission: 'edit' }
        ],
        attachments: [],
        versions: [],
        pinned: true,
        archived: false,
        isPublic: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    this.data.comments = [
      {
        id: 'com_1',
        noteId: 'not_1',
        userId: 'user_u2',
        userName: 'Dr. Helen Vance',
        userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
        text: 'Alex, spectacular structure here! Keep expanding on the React 19 render optimizations for your project grades.',
        createdAt: new Date().toISOString()
      }
    ];

    this.data.notifications = [
      {
        id: 'notif_1',
        userId: 'user_u1',
        title: 'New Collaborator',
        message: 'Dr. Helen Vance joined your Vite 6 and React 19 Best Practices note.',
        read: false,
        type: 'collab',
        createdAt: new Date().toISOString()
      }
    ];

    this.data.classrooms = [
      {
        id: 'cls_1',
        name: 'CS-302: Human Computer Interaction',
        description: 'Undergraduate interactive systems, design guidelines, and live collaboration architectures.',
        teacherId: 'user_u2',
        teacherName: 'Dr. Helen Vance',
        code: 'HCI302',
        studentIds: ['user_u1', 'user_u4'],
        noteIds: ['not_3', 'not_1'],
        createdAt: new Date().toISOString()
      }
    ];

    this.data.activityLogs = [
      {
        id: 'log_1',
        userId: 'user_u1',
        userName: 'Alex Mercer',
        userRole: 'student',
        action: 'CREATED_NOTE',
        details: 'Vite 6 and React 19 Best Practices note established.',
        timestamp: new Date().toISOString()
      }
    ];

    this.data.reports = [
      {
        id: 'rep_1',
        reportedBy: 'user_u4',
        reportedByName: 'Claire Redfield',
        noteId: 'not_1',
        noteTitle: 'Vite 6 and React 19 Best Practices',
        reason: 'Testing academic moderation interface',
        status: 'pending',
        createdAt: new Date().toISOString()
      }
    ];

    // Save all
    const collections = [
      'users', 'notes', 'folders', 'comments', 
      'notifications', 'classrooms', 'activityLogs', 'reports'
    ];
    collections.forEach(col => this.save(col));
  }

  // --- Collection Query Methods ---
  
  // Users
  getUsers(): User[] { return this.data.users; }
  getUserById(id: string): User | undefined { return this.data.users.find(u => u.id === id); }
  getUserByEmail(email: string): User | undefined { return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase()); }
  createUser(user: User): User {
    this.data.users.push(user);
    this.save('users');
    return user;
  }
  updateUser(id: string, updates: Partial<User>): User | undefined {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return undefined;
    this.data.users[idx] = { ...this.data.users[idx], ...updates };
    this.save('users');
    return this.data.users[idx];
  }
  deleteUser(id: string): boolean {
    const initialLen = this.data.users.length;
    this.data.users = this.data.users.filter(u => u.id !== id);
    if (this.data.users.length < initialLen) {
      this.save('users');
      return true;
    }
    return false;
  }

  // Notes
  getNotes(): Note[] { return this.data.notes; }
  getNoteById(id: string): Note | undefined { return this.data.notes.find(n => n.id === id); }
  createNote(note: Note): Note {
    this.data.notes.push(note);
    this.save('notes');
    return note;
  }
  updateNote(id: string, updates: Partial<Note>): Note | undefined {
    const idx = this.data.notes.findIndex(n => n.id === id);
    if (idx === -1) return undefined;
    
    // Auto-archive versions if code size grew considerably
    if (updates.content && updates.content !== this.data.notes[idx].content) {
      const lastVersion = {
        id: `ver_${Date.now()}`,
        title: this.data.notes[idx].title,
        content: this.data.notes[idx].content,
        updatedBy: updates.ownerName || 'Contributor',
        updatedById: updates.ownerId || 'api',
        updatedAt: new Date().toISOString()
      };
      const versions = [...(this.data.notes[idx].versions || [])];
      // Keep max 8 versions to satisfy guidelines
      if (versions.length >= 8) versions.shift();
      versions.push(lastVersion);
      updates.versions = versions;
    }

    this.data.notes[idx] = { ...this.data.notes[idx], ...updates, updatedAt: new Date().toISOString() };
    this.save('notes');
    return this.data.notes[idx];
  }
  deleteNote(id: string): boolean {
    const initialLen = this.data.notes.length;
    this.data.notes = this.data.notes.filter(n => n.id !== id);
    if (this.data.notes.length < initialLen) {
      this.save('notes');
      return true;
    }
    return false;
  }

  // Folders
  getFolders(): Folder[] { return this.data.folders; }
  getFoldersByUser(userId: string): Folder[] {
    return this.data.folders.filter(f => f.ownerId === userId).sort((a, b) => a.order - b.order);
  }
  createFolder(folder: Folder): Folder {
    this.data.folders.push(folder);
    this.save('folders');
    return folder;
  }
  updateFolder(id: string, updates: Partial<Folder>): Folder | undefined {
    const idx = this.data.folders.findIndex(f => f.id === id);
    if (idx === -1) return undefined;
    this.data.folders[idx] = { ...this.data.folders[idx], ...updates };
    this.save('folders');
    return this.data.folders[idx];
  }
  deleteFolder(id: string): boolean {
    const initialLen = this.data.folders.length;
    this.data.folders = this.data.folders.filter(f => f.id !== id);
    if (this.data.folders.length < initialLen) {
      // Clear folder assignments
      this.data.notes = this.data.notes.map(n => n.folderId === id ? { ...n, folderId: undefined } : n);
      this.save('folders');
      this.save('notes');
      return true;
    }
    return false;
  }

  // Comments
  getCommentsByNote(noteId: string): Comment[] {
    return this.data.comments.filter(c => c.noteId === noteId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  createComment(comment: Comment): Comment {
    this.data.comments.push(comment);
    this.save('comments');
    return comment;
  }
  deleteComment(id: string): boolean {
    const initialLen = this.data.comments.length;
    this.data.comments = this.data.comments.filter(c => c.id !== id);
    if (this.data.comments.length < initialLen) {
      this.save('comments');
      return true;
    }
    return false;
  }

  // Notifications
  getNotificationsByUser(userId: string): Notification[] {
    return this.data.notifications.filter(n => n.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  createNotification(notif: Notification): Notification {
    this.data.notifications.push(notif);
    this.save('notifications');
    return notif;
  }
  markNotificationsAsRead(userId: string) {
    this.data.notifications = this.data.notifications.map(n => n.userId === userId ? { ...n, read: true } : n);
    this.save('notifications');
  }

  // Classrooms
  getClassrooms(): Classroom[] { return this.data.classrooms; }
  createClassroom(cls: Classroom): Classroom {
    this.data.classrooms.push(cls);
    this.save('classrooms');
    return cls;
  }
  updateClassroom(id: string, updates: Partial<Classroom>): Classroom | undefined {
    const idx = this.data.classrooms.findIndex(c => c.id === id);
    if (idx === -1) return undefined;
    this.data.classrooms[idx] = { ...this.data.classrooms[idx], ...updates };
    this.save('classrooms');
    return this.data.classrooms[idx];
  }

  // ActivityLogs
  getActivityLogs(): ActivityLog[] { return this.data.activityLogs; }
  logActivity(userId: string, userName: string, role: UserRole, action: string, details: string) {
    const log: ActivityLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      userId,
      userName,
      userRole: role,
      action,
      details,
      timestamp: new Date().toISOString()
    };
    this.data.activityLogs.push(log);
    // Trim log size past 50 entries
    if (this.data.activityLogs.length > 100) {
      this.data.activityLogs.shift();
    }
    this.save('activityLogs');
  }

  // Reports
  getReports(): Report[] { return this.data.reports; }
  createReport(rep: Report): Report {
    this.data.reports.push(rep);
    this.save('reports');
    return rep;
  }
  updateReport(id: string, updates: Partial<Report>): Report | undefined {
    const idx = this.data.reports.findIndex(r => r.id === id);
    if (idx === -1) return undefined;
    this.data.reports[idx] = { ...this.data.reports[idx], ...updates };
    this.save('reports');
    return this.data.reports[idx];
  }
}

export const db = new JSONDatabase();
