/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  bio?: string;
  blocked: boolean;
  createdAt: string;
  password?: string;
  recoveryQuestion?: string;
  recoveryAnswer?: string;
}

export type PermissionType = 'view' | 'comment' | 'edit' | 'admin';

export interface Collaborator {
  userId: string;
  userName: string;
  userEmail: string;
  permission: PermissionType;
}

export interface Attachment {
  name: string;
  url: string; // Blob or base64 or custom local file path
  mimeType: string;
  size: number;
}

export interface NoteVersion {
  id: string;
  title: string;
  content: string;
  updatedBy: string; // User Name
  updatedById: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  category: string;
  ownerId: string;
  ownerName: string;
  collaborators: Collaborator[];
  attachments: Attachment[];
  versions: NoteVersion[];
  pinned: boolean;
  archived: boolean;
  folderId?: string; // Links to a Folder
  isPublic?: boolean;
  createdAt: string;
  updatedAt: string;
  reviewStatus?: 'pending' | 'reviewed' | 'approved' | 'rejected';
  reviewScore?: string;
  reviewFeedback?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface Folder {
  id: string;
  name: string;
  ownerId: string;
  order: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  noteId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  type: 'collab' | 'comment' | 'system' | 'classroom';
  createdAt: string;
}

export interface Classroom {
  id: string;
  name: string;
  description: string;
  teacherId: string;
  teacherName: string;
  code: string; // Invite code
  studentIds: string[];
  noteIds: string[];
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  details: string;
  timestamp: string;
}

export interface Report {
  id: string;
  reportedBy: string;
  reportedByName: string;
  noteId: string;
  noteTitle: string;
  reason: string;
  status: 'pending' | 'resolved';
  createdAt: string;
}
