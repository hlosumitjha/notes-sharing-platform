# 📚 Notes Sharing Platform

### A collaborative academic workspace for students and teachers

A full-stack **academic notes sharing and collaboration platform** designed for university students and faculty. The platform allows users to create, organize, share, discuss, and collaboratively edit study notes while providing classroom management, role-based access control, moderation tools, notifications, and AI-powered study assistance.

## 🌐 Live Demo

**Live Application:** [Notes Sharing Platform](https://notes-sharing-platform-6fpc.onrender.com/)

> The application is deployed on Render and can be accessed directly using the link above.


Built with **React, TypeScript, Vite, Express, WebSockets, Tailwind CSS, and Google Gemini AI**.

---

## ✨ Features

### 🔐 Authentication & User Management

* Student, Teacher, and Admin roles
* User registration and login
* Persistent sessions using local storage
* Password recovery using security questions
* Role-based authorization
* User blocking and account management for administrators

### 📝 Note Management

* Create, edit, and delete academic notes
* Markdown-based note content
* Organize notes using folders
* Add tags and academic categories
* Pin and archive notes
* Public and private note visibility
* Version history for edited notes
* File attachments
* Search and organize study material efficiently

### 🤝 Real-Time Collaboration

* Share notes with other users
* Permission-based collaboration:

  * View
  * Comment
  * Edit
  * Admin
* Real-time note synchronization using WebSockets
* Live collaborator presence
* Cursor synchronization
* Typing indicators
* Real-time collaboration chat
* Collaborative editing sessions

### 🏫 Classroom Management

* Teachers can create classrooms
* Students can join using classroom codes
* Assign teachers to classrooms
* Link notes with classrooms
* Manage classroom participants
* Classroom-specific academic resources

### 💬 Comments & Notifications

* Comment on shared notes
* Notifications for collaboration invitations
* Notifications when students join classrooms
* Comment notifications
* Mark notifications as read
* Activity tracking

### 🤖 Gemini AI Study Assistant

The platform integrates **Google Gemini AI** to provide academic assistance directly from notes.

Features include:

* AI-generated note summaries
* Structured key takeaways
* Action items from notes
* AI-generated study guides
* Concept glossaries
* Multiple-choice quiz questions
* Open-ended exam preparation prompts

If a Gemini API key is unavailable, the application provides an offline preview response instead of failing at startup.

### 🛡️ Admin & Moderation

Administrators have access to a dedicated management console with:

* User management
* Create and edit users
* Block/unblock users
* Delete users
* Password administration
* Activity logs
* Academic content reports
* Report resolution
* Platform moderation

---

## 🧑‍💻 Technology Stack

| Layer                   | Technology              |
| ----------------------- | ----------------------- |
| Frontend                | React 19                |
| Language                | TypeScript              |
| Build Tool              | Vite                    |
| Styling                 | Tailwind CSS            |
| UI Icons                | Lucide React            |
| Animations              | Motion                  |
| Backend                 | Node.js + Express       |
| Real-Time Communication | WebSockets              |
| AI                      | Google Gemini API       |
| Persistence             | JSON-based file storage |
| Bundling                | esbuild                 |
| Package Manager         | npm                     |

---

## 🏗️ Architecture

```text
┌──────────────────────────────────────────────┐
│                 React Frontend               │
│                                              │
│  Authentication  │  Notes Workspace          │
│  Classrooms      │  AI Assistant             │
│  Admin Console   │  Notifications            │
└──────────────────────┬───────────────────────┘
                       │
                 REST API / WS
                       │
┌──────────────────────▼───────────────────────┐
│             Express + TypeScript             │
│                                              │
│  Authentication      Notes Management        │
│  Collaboration       Classrooms              │
│  Comments            Notifications            │
│  Administration      AI Integration          │
└───────────────┬──────────────────┬───────────┘
                │                  │
                ▼                  ▼
       ┌────────────────┐   ┌─────────────────┐
       │ JSON Storage   │   │ Google Gemini   │
       │                │   │      API        │
       │ Users          │   │                 │
       │ Notes          │   │ Summarization   │
       │ Classrooms     │   │ Study Guides    │
       │ Comments       │   │ Quiz Generation │
       │ Notifications  │   └─────────────────┘
       │ Reports        │
       └────────────────┘
```

---

## 📂 Project Structure

```text
notes-sharing-platform/
│
├── src/
│   ├── components/
│   │   ├── NotesList.tsx
│   │   ├── RichEditor.tsx
│   │   ├── AISidebar.tsx
│   │   ├── ClassroomHub.tsx
│   │   ├── AdminConsole.tsx
│   │   └── ...
│   │
│   ├── types.ts
│   ├── App.tsx
│   └── ...
│
├── server/
│   ├── db.ts
│   └── gemini.ts
│
├── server.ts
├── index.html
├── metadata.json
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .env.example
└── README.md
```

The backend stores application data in JSON collections such as users, notes, folders, comments, notifications, classrooms, activity logs, and reports. The storage layer automatically creates the required data directory and files when the application starts.

---

## 🚀 Getting Started

### Prerequisites

Make sure you have:

* **Node.js 18+**
* **npm**
* A Google Gemini API key if you want live AI functionality

---

### 1. Clone the Repository

```bash
git clone https://github.com/hlosumitjha/notes-sharing-platform.git
cd notes-sharing-platform
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key
```

The backend reads `GEMINI_API_KEY` when initializing the Gemini client.

### 4. Start the Development Server

```bash
npm run dev
```

The application runs on:

```text
http://localhost:3000
```

The development script starts the TypeScript server through `tsx`.

---

## 🏭 Production Build

Create a production build using:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

Other available commands:

```bash
npm run preview
npm run lint
npm run clean
```

The project uses Vite for the frontend build and esbuild to bundle the Node.js server.

---

## 🔌 API Overview

The backend exposes REST endpoints for the major platform features.

### Authentication

```text
POST /api/auth/login
POST /api/auth/register
POST /api/auth/get-recovery-question
POST /api/auth/reset-password
GET  /api/auth/me
```

### Notes

```text
GET    /api/notes
GET    /api/notes/:id
POST   /api/notes
PUT    /api/notes/:id
DELETE /api/notes/:id
```

### Collaboration

```text
POST /api/notes/:id/collaborators
POST /api/upload
```

### Comments

```text
GET  /api/notes/:noteId/comments
POST /api/notes/:noteId/comments
```

### Classrooms

```text
GET  /api/classrooms
POST /api/classrooms
PUT  /api/classrooms/:id
POST /api/classrooms/join
POST /api/classrooms/:id/notes
```

### Notifications

```text
GET  /api/notifications
POST /api/notifications/read
```

### AI

```text
POST /api/notes/:id/ai-summary
POST /api/notes/:id/ai-study-guide
```

### Administration

```text
GET    /api/admin/users
POST   /api/admin/users
PUT    /api/admin/users/:id
DELETE /api/admin/users/:id
PUT    /api/admin/users/:id/block
PUT    /api/admin/users/:id/password

GET    /api/admin/activity
GET    /api/admin/reports
PUT    /api/admin/reports/:id/resolve
```

These endpoints are implemented in the Express backend with authentication and role-based permission checks.

---

## ⚡ Real-Time Collaboration

The application uses **WebSockets** for collaborative note sessions.

Real-time events include:

```text
join
cursor
typing
note_edit
chat_message
```

This enables multiple users to work inside the same note workspace while receiving live synchronization, presence information, cursor updates, typing indicators, and collaborative chat.

---

## 🤖 AI Integration

The platform uses the **Google Gemini API** for academic assistance.

### AI Summary

Given a note, the system can generate:

* Structured summary
* Key takeaways
* Action items

### AI Study Guide

The system can generate:

* Concept glossary
* Multiple-choice questions
* Answers
* Open-ended exam prompts

The Gemini integration is implemented server-side, keeping the API key outside the frontend application.

---

## 👥 User Roles

### 👨‍🎓 Student

Students can:

* Create and manage notes
* Share notes
* Collaborate with peers
* Comment on notes
* Join classrooms
* Access AI study assistance
* Report inappropriate content

### 👨‍🏫 Teacher

Teachers can:

* Create classrooms
* Manage classroom resources
* Share academic notes
* Collaborate with students
* Publish notes to classrooms
* Use AI-assisted study material generation

### 🛡️ Administrator

Administrators can:

* Manage users
* Manage permissions
* Block/unblock accounts
* Monitor activity
* Review reports
* Resolve reported content
* Manage classroom assignments

---

## 🔒 Access Control

The application implements permission checks for protected resources.

For example:

* Private notes are accessible only to authorized users.
* Note owners control sharing permissions.
* Administrators can monitor platform-wide content.
* Classroom management is restricted to teachers and administrators.
* Administrative APIs require administrator privileges.

---

## 💾 Data Persistence

The current version uses a lightweight **JSON-based persistence layer** instead of an external database.

Data is organized into collections including:

```text
data_store/
├── users.json
├── notes.json
├── folders.json
├── comments.json
├── notifications.json
├── classrooms.json
├── activityLogs.json
└── reports.json
```

This approach keeps the project simple to run locally without requiring database installation or configuration.

> **Note:** The JSON storage implementation is intended for development, demonstration, and academic project use. A production deployment would benefit from replacing it with a dedicated database and stronger authentication/security mechanisms.

---

## 🎯 Project Goals

The platform was designed to address common problems faced by university students:

* Notes scattered across messaging applications
* Difficulty organizing academic resources
* Lack of structured peer collaboration
* Limited classroom-level resource sharing
* Time-consuming manual exam preparation
* Lack of centralized academic moderation

The goal is to provide a **single collaborative workspace for academic knowledge sharing and study preparation**.

---

## 🔮 Future Improvements

Potential improvements include:

* PostgreSQL/MongoDB production database
* JWT/OAuth-based authentication
* Password hashing with Argon2 or bcrypt
* Cloud file storage
* Advanced full-text search
* Email notifications
* Mobile application
* Advanced analytics dashboard
* AI-powered semantic search
* Document/PDF text extraction
* Automated content moderation
* Docker-based deployment
* CI/CD pipeline
* Automated testing
* Rate limiting and enhanced API security

---

## 📸 Screenshots

Add screenshots of the major application views here:

```text
Login / Registration
        ↓
Notes Workspace
        ↓
Collaborative Editor
        ↓
AI Study Assistant
        ↓
Classroom Hub
        ↓
Admin Console
```

Example:

```md
![Notes Workspace](screenshots/workspace.png)
![AI Assistant](screenshots/ai-assistant.png)
![Classroom Hub](screenshots/classroom.png)
![Admin Console](screenshots/admin.png)
```

---

## 📌 Current Status

**Status:** 🚧 Active Development

The current repository contains a functional full-stack implementation with:

* Authentication
* Notes management
* Collaboration
* WebSocket communication
* Classrooms
* Comments
* Notifications
* Administration
* Moderation
* Gemini AI integration

---

## 👨‍💻 Author

**Sumit Kumar Jha**

B.Tech — Computer Science & Engineering

Techno India University, Kolkata

### GitHub

[github.com/hlosumitjha](https://github.com/hlosumitjha)

---

## 📄 License

This project includes source files licensed under the **Apache License 2.0** where indicated in the source code.

See individual source files for applicable license information.
