# CoreTalk v3
> The meeting platform that does more — without switching tabs.

🔴 **Live Demo → [coretalk.vercel.app](https://coretalk.vercel.app)**

![CoreTalk Meeting Room](public/screenshots/meeting.png)

CoreTalk is a production-ready online meeting platform built on the MEVN stack, powered by LiveKit. It goes further than standard video conferencing with **Gmail actions inside meetings**, **AI meeting summaries**, **collaborative whiteboard**, and **file attachments in chat** — all without switching tabs.

---

## Why CoreTalk?

No other video conferencing platform lets you compose and read emails, collaborate on a whiteboard, get AI-generated meeting notes, and share files — all inside the call itself.

---

## Features

### 🎥 Core Meeting
- **HD Video & Audio** — Crystal-clear calls powered by LiveKit's WebRTC infrastructure
- **Screen Sharing** — Share your full screen or a specific window
- **Live Captions** — Real-time auto-generated captions during calls
- **Recording** — Record meetings directly from within the call
- **Background Noise Suppression** — Silent background, no more fan or keyboard noise
- **End for All / Leave Alone** — Hosts can end for everyone, or participants can quietly leave

### 💬 In-Meeting Chat
- Real-time messaging during calls
- **File Attachments** — Share files directly in chat, no third-party tools needed

### 📧 Gmail Integration *(Unique to CoreTalk)*
Compose, reply, and manage emails without ever leaving your meeting.

### 🤖 AI Meeting Summary
Auto-generated notes and summaries from your meeting conversation.

### 🖊️ Collaborative Whiteboard
Draw and brainstorm together in real time during the call.

### 🔐 Authentication
- **Google Sign-In** — One-click sign-in
- **OTP Verification** — Email OTP for registration and password reset

### 👤 Account Management
- Profile management — name, avatar, preferences
- Delete account with full data removal
- Built-in feedback system

---

## Tech Stack
- **Frontend** — Vue 3, Vite → Vercel
- **Backend** — Node.js, Express.js → Render
- **Database** — MongoDB
- **Real-time Media** — LiveKit (WebRTC)
- **Auth** — Google OAuth 2.0, JWT, Email OTP
