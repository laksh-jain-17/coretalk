# CoreTalk v3

> The meeting platform that does more — without switching tabs.

CoreTalk is a production-ready online meeting platform built on the MEVN stack, powered by LiveKit. It covers everything you'd expect from a modern video conferencing tool — and goes further with features no other platform offers out of the box, like **Gmail actions inside meetings** and **file attachments in chat**.

---

## Features

### 🎥 Core Meeting
- **HD Video & Audio** — Crystal-clear calls powered by LiveKit's WebRTC infrastructure
- **Screen Sharing** — Share your full screen or a specific window
- **Live Captions** — Real-time auto-generated captions during calls
- **Recording** — Record meetings directly from within the call
- **Background Noise Suppression** — AI-powered silent background, no more fan or keyboard noise
- **End for All / Leave Alone** — Hosts can end the meeting for everyone, or participants can quietly leave

### 💬 In-Meeting Chat
- Real-time messaging during calls
- **File Attachments** — Share files directly in the meeting chat, no third-party tools needed

### 📧 Gmail Integration *(Unique to CoreTalk)*
Take Gmail actions — compose, reply, manage emails — without ever leaving your meeting. No other video conferencing platform has this built in.

### 🔐 Authentication
- **Google Sign-In** — One-click sign-in with your Google account
- **OTP Verification** — Email OTP for new registrations and forgot password flows

### 👤 Account Management
- Profile management — update your name, avatar, and preferences
- Delete account with full data removal
- Built-in feedback and complaints system

---

## Tech Stack

- **Frontend** — Vue 3, Vite → deployed on Vercel
- **Backend** — Node.js, Express.js → deployed on Render
- **Database** — MongoDB
- **Real-time Media** — LiveKit API (WebRTC)
- **Auth** — Google OAuth 2.0, JWT, Email OTP

---

## Live

[coretalk.vercel.app](https://coretalk.vercel.app)
