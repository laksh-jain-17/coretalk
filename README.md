# CoreTalk 

> **A production-architecture online meeting platform — supporting real-time video, audio, screen sharing, live chat, and cloud recording.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-coretalk.vercel.app-blue?style=for-the-badge)](https://coretalk.vercel.app)

---


The architecture was developed in **Selective Forwarding Unit (SFU)** model:

- Each participant sends **one stream** to the media server
- The server selectively forwards streams to other participants
- This is the same architecture used by Zoom, Google Meet, and Microsoft Teams at scale

This decision required understanding WebRTC internals at the signaling level — ICE candidates, STUN/TURN, track subscription — not just calling a high-level API.

---

## ✨ Features

- 🔐 **Google OAuth** — Secure sign-in via Google Cloud Platform
- 📹 **Video Broadcasting** — Multi-participant video via SFU media server
- 🎙️ **Audio** — Real-time audio with mute/unmute controls
- 💬 **In-Room Chat** — Live text messaging during calls
- 🖥️ **Screen Sharing** — Share your full screen or a specific window
- ⏺️ **Recording** — Record sessions and access them later
- 🚪 **Room Management** — Create and join rooms instantly

---

## 🛠️ Tech Stack

### Frontend
- **Vue 3** — Composition API, component-driven architecture
- **Vite** — Fast build tooling and dev server
- **Vue Router** — Client-side routing

### Backend
- **Node.js + Express** — REST API server
- **MongoDB** — Database for users, rooms, and session data
- **Google Cloud Platform** — OAuth 2.0 authentication and cloud storage

---

## 🔑 How It Works

### Authentication
1. User clicks "Sign in with Google"
2. Backend redirects to Google's OAuth 2.0 consent screen via GCP credentials
3. On successful auth, a server session is created and the user lands on the dashboard

### Joining a Room
1. User creates or enters a room ID
2. Frontend requests a signed **access token** from the backend — keeping secrets server-side
3. The client connects to the media server using that token
4. Video and audio tracks are published and subscribed to via the SFU

### Recording
1. Recording is triggered server-side via an Egress API call
2. Stored to a GCP Cloud Storage bucket
3. Accessible from the dashboard after the session ends

---

## 🧱 Challenges & Learnings

**P2P → SFU Migration:** The biggest challenge was understanding *why* P2P fails at scale and making the correct architectural call to switch to an SFU model. Debugging ICE failures, STUN/TURN configs, and media track issues gave a deep, practical understanding of real-time communication infrastructure.

**Token-based Room Security:** Access tokens are signed server-side with expiry and room-scoped permissions — clients can never access rooms they aren't authorized for.

**OAuth in a Decoupled Architecture:** Wiring Google OAuth cleanly across a separate Vite frontend and Express backend — handling CORS, cookie sessions, and redirect URIs — required careful and non-obvious configuration.

---

## 🌐 Deployment

Frontend deployed on **Vercel** with SPA routing configured so all paths resolve correctly.  
Backend deployed separately with environment variables managed securely via the hosting platform — **never committed to version control.**

---
