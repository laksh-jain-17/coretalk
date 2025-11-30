<template>
  <div :class="{'tray-on-right':!turned, 'tray-hidden':!trayVisible}" id="page">
    <transition name="slide-left">
      <div id="left-tray" :class="turned ? 'left-tray-left' : 'left-tray-right'" v-if="trayVisible">
        <button @click="silent_background">Silent Background</button>
        <button @click="recording">Start Recording</button>
        <button @click="turn">Change Panel</button>
      </div>
    </transition>

    <div id="main-content">
      <div id="host">
        <video ref="localVideo" autoplay muted playsinline></video>
        <div v-if="!videoon">{{ userName || 'Host' }}</div>
      </div>

      <div id="participants" ref="participantsBox"></div>
    </div>

    <div v-if="isPoorNetwork" class="transcript-box">
      <h3>Real time transcript</h3>
      <div v-for="(line,i) in transcript" :key="i">{{line}}</div>
    </div>

    <transition name="slide-fade">
      <div id="navbar" v-show="trayVisible">
        <ul>
          <li>
            <button
              @mouseenter="() => setHover('mic')"
              @mouseleave="() => setHover(null)"
              @click="toggleMic"
              :class="{ 'active': micon }"
            >
              <IconMaterialSymbolsHeadsetMic />
            </button>
            <ul v-if="hoveredIcon === 'mic'" class="tooltip">
              <li>{{ micon ? 'Mute' : 'Unmute' }}</li>
            </ul>
          </li>

          <li>
            <button
              @mouseenter="() => setHover('video')"
              @mouseleave="() => setHover(null)"
              @click="toggleVideo"
              :class="{ 'active': videoon }"
            >
              <IconMaterialSymbolsVideocam />
            </button>
            <ul v-if="hoveredIcon === 'video'" class="tooltip">
              <li>{{ videoon ? 'Stop Video' : 'Start Video' }}</li>
            </ul>
          </li>

          <li>
            <button
              @mouseenter="() => setHover('share')"
              @mouseleave="() => setHover(null)"
              @click="sharescreen"
            >
              <IconMaterialSymbolsScreenShare />
            </button>
            <ul v-if="hoveredIcon === 'share'" class="tooltip">
              <li>Share screen</li>
            </ul>
          </li>

          <li>
            <button
              @click="leave"
              @mouseenter="() => setHover('leave')"
              @mouseleave="() => setHover(null)"
            >
              <IconMaterialSymbolsLightCallEnd />
            </button>
            <ul v-if="hoveredIcon === 'leave'" class="tooltip">
              <li>Leave call</li>
            </ul>
          </li>
        </ul>

        <!-- RIGHT SIDE -->
        <ul id="rightpane">
          <li>
            <button @click="togglePanel('list')" @mouseenter="() => setHover('participants')" @mouseleave="() => setHover(null)">
              <IconMaterialSymbolsLightGroup />
              <span class="participant-count">({{ participants.length + 1 }})</span>
            </button>
            <ul v-if="hoveredIcon === 'participants'" class="tooltip">
              <li>Participants</li>
            </ul>

            <div id="list-box" v-if="activePanel === 'list'">
              <div class="list-header">
                Participants ({{ participants.length + 1 }})
                <button @click="togglePanel(null)">X</button>
              </div>

              <div class="list-body">
                <div class="participant self">
                  <ul>
                    <li>{{ userName }} (You) {{ isHost ? '(Host)' : '' }}</li>
                  </ul>
                </div>

                <div class="participant" v-for="p in participants" :key="p.id">
                  <ul>
                    <li>{{ p.name }} {{ p.isHost ? '(Host)' : '' }}</li>
                  </ul>
                </div>
              </div>
            </div>
          </li>

          <li>
            <button @click="togglePanel('chat')" @mouseenter="() => setHover('chat')" @mouseleave="() => setHover(null)">
              <IconMaterialSymbolsChat />
              <span v-if="unreadMessages > 0" class="message-badge">{{ unreadMessages }}</span>
            </button>

            <ul v-if="hoveredIcon === 'chat'" class="tooltip">
              <li>Chat</li>
            </ul>

            <div id="chat-box" v-if="activePanel === 'chat'">
              <div class="chat-header">Chat <button @click="togglePanel(null)">X</button></div>

              <div class="chat-body" ref="chatBody">
                <div v-for="(msg, index) in messages" :key="index" class="message">
                  <div class="message-header">{{ msg.sender }}</div>
                  <div class="message-text">{{ msg.text }}</div>
                </div>
              </div>

              <div class="chat-input-section">
                <input 
                  type="text" 
                  class="chat-input" 
                  v-model="newMessage" 
                  placeholder="Type a message..." 
                  @keyup.enter="sendMessage" 
                />
                <button class="chat-send" @click="sendMessage" :disabled="!newMessage.trim()">Send</button>
              </div>
            </div>
          </li>

          <li class="dropdown">
            <button @click.stop="toggleDropdown('extras')" @mouseenter="() => setHover('extras')" @mouseleave="() => setHover(null)">
              <IconMaterialSymbolsLightMoreVert />
            </button>
            <ul v-if="hoveredIcon === 'extras'" class="tooltip">
              <li>More</li>
            </ul>

            <ul v-if="activeDropdown === 'extras'" class="dropdown-menu extras-menu">
              <li @click.stop="hand_raised">{{ hand ? 'Lower hand' : 'Raise hand' }}</li>

              <li @click.stop="toggle_info">
                Info
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </transition>
  </div>
</template>


<script>
import { jwtDecode } from 'jwt-decode';
import { io } from 'socket.io-client';

export default {
  name: 'MeetingRoom',
  data() {
    return {
      isHost: false,
      userName: '',
      userId: '',
      roomId: '',
      title: 'Meeting Room',

      hoveredIcon: null,
      activeDropdown: null,
      activePanel: null,
      trayVisible: true,
      inactivityTimer: null,
      show_info: false,
      hand: false,
      turned: true,

      micon: false,
      videoon: false,
      localStream: null,
      isScreenSharing: false,
      screenTrack: null,
      screenStream: null,

      mediaRecorder: null,
      recordedChunks: [],
      isRecording: false,
      record: false,

      socket: null,
      isSocketConnected: false,
      participants: [],
      messages: [],
      newMessage: '',
      unreadMessages: 0,

      peers: {},
      remoteVideos: {},
      pendingCandidates: {},
      peerNegotiating: {},

      isPoorNetwork: false,
      transcript: [],
      networkCheckInterval: null,
      recognition: null,

      hasInitializedSocket: false,
      broadcastQueue: [],
      isInitializingMedia: false,
      broadcastRetryTimer: null
    };
  },
  methods: {
          // ============ INITIALIZATION ============
  initUserFromToken() {
    const token = localStorage.getItem("token");
    if (!token) {
      this.$router.push("/Login");
      return false;
    }

    try {
      const decoded = jwtDecode(token);

      this.userId =
        decoded.id ||
        decoded.userId ||
        decoded.user?.id ||
        `user_${Date.now()}`;

      const stored = localStorage.getItem("username");
      this.userName =
        decoded.name ||
        decoded.username ||
        decoded.user?.username ||
        decoded.email?.split("@")[0] ||
        stored ||
        `User-${this.userId.slice(0, 6)}`;

      if (this.userName.includes("@")) {
        this.userName = this.userName.split("@")[0];
      }

      this.isHost =
        localStorage.getItem("isHost") === "true" ||
        decoded.isHost === true;

      return true;
    } catch (err) {
      localStorage.removeItem("token");
      this.$router.push("/Login");
      return false;
    }
  },

  // ============ SOCKET CONNECTION ============
  initSocket() {
    this.socket = io(`${import.meta.env.VITE_API_URL}`, {
      transports: ["websocket"],
      reconnection: true,
    });

    this.socket.on("connect", () => {
      this.isSocketConnected = true;

      this.socket.emit("join-room", {
        roomId: this.roomId,
        userName: this.userName,
        userId: this.userId,
        isHost: this.isHost,
      });

      this.startBroadcastRetry();
    });

    this.socket.on("disconnect", () => {
      this.isSocketConnected = false;
    });

    // ----- ROOM EVENTS -----
    this.socket.on("participants-list", (list) => {
      this.updateParticipantsList(list);
    });

    this.socket.on("user-joined", async (user) => {
      if (user.id !== this.socket.id) {
        this.addParticipant(user);
        setTimeout(() => this.startOffer(user.id), 1000);
      }
    });

    this.socket.on("user-left", (id) => {
      this.cleanupPeer(id);
      this.participants = this.participants.filter((p) => p.id !== id);
    });

    this.socket.on("existing-users", async (users) => {
      for (const u of users || []) {
        if (u.id !== this.socket.id) {
          this.addParticipant(u);
          setTimeout(() => this.startOffer(u.id), 1000);
        }
      }
    });

    // ----- SIGNALING -----
    this.socket.on("signal", async ({ from, signal }) => {
      if (signal.type === "offer") {
        await this.handleOffer(from, signal.sdp);
      } else if (signal.type === "answer") {
        await this.handleAnswer(from, signal.sdp);
      } else if (signal.candidate) {
        await this.handleIceCandidate(from, signal.candidate);
      }
    });

    // ----- CHAT -----
    this.socket.on("chat-message", (msg) => {
      this.messages.push(msg);
      if (this.activePanel !== "chat") {
        this.unreadMessages++;
      }
      this.$nextTick(() => {
        const body = this.$refs.chatBody;
        if (body) body.scrollTop = body.scrollHeight;
      });
    });

    // ----- HAND RAISE -----
    this.socket.on("hand-raised", ({ userId, userName, isRaised }) => {
      this.updateParticipantStatus(userId, "hand", isRaised);
    });

    // ----- MEDIA EVENTS -----
    this.socket.on("video-status", (data) => {
      this.updateParticipantStatus(data.userId, "video", data.isVideoOn);
    });

    this.socket.on("mic-status", (data) => {
      this.updateParticipantStatus(data.userId, "mic", data.isMicOn);
    });

    this.socket.on("screen-share-status", (data) => {
      this.updateParticipantStatus(
        data.userId,
        "screenShare",
        data.isScreenSharing
      );
    });

    this.socket.on("meeting-locked", () => alert("Meeting locked by host"));

    this.socket.on("all-muted", () => {
      if (!this.isHost && this.micon) this.toggleMic();
    });
  },

  // =====================================================
  // ============ BROADCAST + QUEUE SYSTEM ===============
  // =====================================================

  startBroadcastRetry() {
    if (this.broadcastRetryTimer) clearInterval(this.broadcastRetryTimer);

    this.broadcastRetryTimer = setInterval(() => {
      if (this.broadcastQueue.length && this.isSocketConnected) {
        this.processQueuedBroadcasts();
      }
    }, 2000);
  },

  processQueuedBroadcasts() {
    const pending = [...this.broadcastQueue];
    this.broadcastQueue = [];

    for (const msg of pending) {
      try {
        this.socket.emit(msg.event, msg.data);
      } catch {
        this.broadcastQueue.push(msg);
      }
    }
  },

  safeBroadcast(event, data) {
    if (this.socket && this.socket.connected) {
      try {
        this.socket.emit(event, data);
        return;
      } catch {
        this.broadcastQueue.push({ event, data });
      }
    } else {
      this.broadcastQueue.push({ event, data });
    }
  },

  // =====================================================
  // ============ MEDIA CONTROLS (MIC & CAMERA) ==========
  // =====================================================

  async toggleMic() {
    if (this.isInitializingMedia) return;
    this.isInitializingMedia = true;

    try {
      if (this.micon) {
        if (this.localStream) {
          this.localStream.getAudioTracks().forEach((t) => {
            t.stop();
            this.localStream.removeTrack(t);
          });
        }

        for (const id in this.peers) {
          const pc = this.peers[id];
          const sender = pc.getSenders().find((s) => s.track?.kind === "audio");
          if (sender) pc.removeTrack(sender);
        }

        this.micon = false;
        this.broadcastMicStatus(false);
      } else {
        const audio = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

        const track = audio.getAudioTracks()[0];

        if (!this.localStream) this.localStream = new MediaStream();
        this.localStream.addTrack(track);

        for (const id in this.peers) {
          const pc = this.peers[id];
          pc.addTrack(track, this.localStream);
          await this.renegotiateConnection(id);
        }

        this.micon = true;
        this.broadcastMicStatus(true);
      }
    } catch (err) {
      this.micon = false;
      this.broadcastMicStatus(false);
    }

    this.isInitializingMedia = false;
  },

  async toggleVideo() {
    if (this.isInitializingMedia) return;
    this.isInitializingMedia = true;

    try {
      if (this.videoon) {
        if (this.localStream) {
          this.localStream.getVideoTracks().forEach((t) => {
            t.stop();
            this.localStream.removeTrack(t);
          });
        }

        const el = this.$refs.localVideo;
        if (el) el.srcObject = null;

        for (const id in this.peers) {
          const pc = this.peers[id];
          const sender = pc.getSenders().find((s) => s.track?.kind === "video");
          if (sender) pc.removeTrack(sender);
        }

        this.videoon = false;
        this.broadcastVideoStatus(false);
      } else {
        const video = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        const track = video.getVideoTracks()[0];

        if (!this.localStream) this.localStream = new MediaStream();
        this.localStream.addTrack(track);

        const el = this.$refs.localVideo;
        if (el) {
          el.srcObject = this.localStream;
          await el.play();
        }

        for (const id in this.peers) {
          const pc = this.peers[id];
          pc.addTrack(track, this.localStream);
          await this.renegotiateConnection(id);
        }

        this.videoon = true;
        this.broadcastVideoStatus(true);
      }
    } finally {
      this.isInitializingMedia = false;
    }
  },

  // =====================================================
  // ============ WEBRTC PEER CONNECTIONS ================
  // =====================================================

  async createPeerConnection(remoteId, isInitiator = false) {
    const iceServers = [{ urls: "stun:stun.l.google.com:19302" }];

    const pc = new RTCPeerConnection({
      iceServers,
      iceCandidatePoolSize: 10,
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && this.isSocketConnected) {
        this.socket.emit("signal", {
          to: remoteId,
          signal: { candidate: event.candidate },
        });
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (stream) this.handleRemoteStream(remoteId, stream);
    };

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => pc.addTrack(t, this.localStream));
    }

    this.peers[remoteId] = pc;
    this.peerNegotiating[remoteId] = false;

    return pc;
  },

  async startOffer(remoteId) {
    if (remoteId === this.userId || remoteId === this.socket.id) return;

    const pc = await this.createPeerConnection(remoteId, true);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    this.safeBroadcast("signal", {
      to: remoteId,
      signal: { type: "offer", sdp: offer },
    });
  },

  async handleOffer(from, offer) {
    let pc = this.peers[from];
    if (!pc) pc = await this.createPeerConnection(from, false);

    if (pc.signalingState === "have-local-offer") {
      await pc.setLocalDescription({ type: "rollback" });
    }

    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    this.safeBroadcast("signal", {
      to: from,
      signal: { type: "answer", sdp: answer },
    });
  },

  async handleAnswer(from, answer) {
    const pc = this.peers[from];
    if (pc?.signalingState === "have-local-offer") {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  },

  async handleIceCandidate(from, candidate) {
    const pc = this.peers[from];
    if (!pc || !pc.remoteDescription) {
      if (!this.pendingCandidates[from]) this.pendingCandidates[from] = [];
      this.pendingCandidates[from].push(candidate);
      return;
    }
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  },

  // =====================================================
  // ============ REMOTE STREAM HANDLING ================
  // =====================================================

  handleRemoteStream(remoteId, stream) {
    let wrapper = document.querySelector(`[data-peer-id="${remoteId}"]`);

    const hasTracks = stream.getTracks().some(
      (t) => t.enabled && t.readyState === "live"
    );

    if (!hasTracks) {
      if (wrapper) wrapper.remove();
      delete this.remoteVideos[remoteId];
      return;
    }

    if (!wrapper) {
      wrapper = document.createElement("div");
      wrapper.className = "remote-participant";
      wrapper.setAttribute("data-peer-id", remoteId);
      wrapper.style.cssText =
        "display:flex;flex-direction:column;align-items:center;margin:8px;background:#0002;border-radius:8px;padding:6px;position:relative;";

      const vid = document.createElement("video");
      vid.autoplay = true;
      vid.playsInline = true;
      vid.style.cssText =
        "width:260px;height:150px;border-radius:6px;background:#000;object-fit:cover;";

      const label = document.createElement("div");
      const participant = this.participants.find((p) => p.id === remoteId);
      label.textContent =
        participant?.name || `User-${remoteId.slice(0, 6)}`;
      label.style.cssText =
        "color:#fff;margin-top:4px;font-size:13px;max-width:260px;text-align:center;";

      wrapper.appendChild(vid);
      wrapper.appendChild(label);

      this.remoteVideos[remoteId] = vid;
      if (this.$refs.participantsBox)
        this.$refs.participantsBox.appendChild(wrapper);
    }

    const vid = wrapper.querySelector("video");
    if (vid) {
      vid.srcObject = stream;
      vid.play().catch(() => {});
    }
  },

  cleanupPeer(id) {
    if (this.peers[id]) {
      try {
        this.peers[id].close();
      } catch {}
      delete this.peers[id];
    }

    const wrapper = document.querySelector(`[data-peer-id="${id}"]`);
    if (wrapper) wrapper.remove();

    delete this.remoteVideos[id];
  },

  // =====================================================
  // ============ PARTICIPANTS ===========================
  // =====================================================

  updateParticipantsList(list) {
    const mapped = [];

    (list || []).forEach((p) => {
      if (!p || p.id === this.userId || p.id === this.socket.id) return;

      let nm =
        p.name ||
        p.userName ||
        p.username ||
        `User-${p.id.slice(0, 6)}`;

      if (nm.includes("@")) nm = nm.split("@")[0];

      mapped.push({
        id: p.id,
        name: nm,
        isHost: p.isHost,
        hand: p.hand || false,
        hasMic: p.hasMic || false,
        hasVideo: p.hasVideo || false,
        isScreenSharing: p.isScreenSharing || false,
      });
    });

    this.participants = mapped;
  },

  addParticipant(user) {
    if (!user || !user.id) return;
    if (user.id === this.userId || user.id === this.socket.id) return;

    let nm = user.name || user.userName || "Anonymous";
    if (nm.includes("@")) nm = nm.split("@")[0];

    const exists = this.participants.findIndex((p) => p.id === user.id);
    const data = {
      id: user.id,
      name: nm,
      isHost: user.isHost,
    };

    if (exists >= 0) this.participants[exists] = data;
    else this.participants.push(data);
  },
  updateParticipantStatus(userId, statusType, isEnabled) 
  {
    const participant = this.participants.find(p => p.id === userId);
    if (participant) 
    {
      if (statusType === 'video') 
      {
        participant.hasVideo = isEnabled;
        if (!isEnabled) 
        {
          //const wrapper = document.querySelector(`[data-peer-id="${userId}"]`);
          const wrapper = document.querySelector(`[data-peer-id="${userId}"]`);
          if (wrapper) 
          {
            wrapper.remove();
            delete this.remoteVideos[userId];
          }
        }
      } 
      else if (statusType === 'mic') 
      {
        participant.hasMic = isEnabled;
      } 
      else if (statusType === 'screenShare') 
      {
        participant.isScreenSharing = isEnabled;
      } 
      else if (statusType === 'hand') 
      {
        participant.hand = isEnabled;
      }
      this.$forceUpdate();
    }
  // Update indicator
    //const wrapper = document.querySelector(`[data-peer-id="${userId}"]`);
    const wrapper = document.querySelector(`[data-peer-id="${userId}"]`);
    if (wrapper) 
    {
      let indicator = wrapper.querySelector('.status-indicator');
      if (!indicator) 
      {
        indicator = document.createElement('div');
        indicator.className = 'status-indicator';
        indicator.style.cssText = `
          position: absolute;
          top: 8px;
          right: 8px;
          display: flex;
          gap: 4px;
          font-size: 16px;
          background: rgba(0,0,0,0.7);
          padding: 4px;
          border-radius: 4px;
        `;
        wrapper.appendChild(indicator);
      }
      indicator.innerHTML = `
        <span>${participant?.hasMic ? '🎤' : '🔇'}</span>
        <span>${participant?.hasVideo ? '📹' : '🔴'}</span>
        ${participant?.isScreenSharing ? '<span>🖥️</span>' : ''}
      `;
    }
  },

  // =====================================================
  // ============ CHAT + UI CONTROLS =====================
  // =====================================================

  sendMessage() {
    const txt = this.newMessage.trim();
    if (!txt) return;

    this.safeBroadcast("chat-message", {
      roomId: this.roomId,
      sender: this.userName,
      text: txt,
      timestamp: Date.now(),
    });

    this.newMessage = "";
  },

  hand_raised() {
    this.hand = !this.hand;

    this.safeBroadcast("hand-raised", {
      roomId: this.roomId,
      userId: this.userId,
      userName: this.userName,
      isRaised: this.hand,
    });
  },

  setHover(v) {
    this.hoveredIcon = v;
  },

  togglePanel(p) {
    this.activePanel = this.activePanel === p ? null : p;
    this.activeDropdown = null;

    if (p === "chat") this.unreadMessages = 0;
  },

  toggleDropdown(t) {
    this.activeDropdown = this.activeDropdown === t ? null : t;
    this.activePanel = null;
  },

  toggle_info() {
    this.show_info = !this.show_info;
  },

  close_info() {
    this.show_info = false;
  },

  copystring() {
    navigator.clipboard.writeText(window.location.href);
  },

  leave() {
    this.cleanup();
    this.$router.push("/Ending");
  },

  // =====================================================
  // ============ HOST CONTROLS ==========================
  // =====================================================

  async endMeeting() {
    if (!this.isHost) return;

    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/end-meeting`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: this.roomId }),
    });

    if (res.ok) {
      this.cleanup();
      this.$router.push("/Ending");
    }
  },

  async muteAll() {
    if (!this.isHost) return;

    await fetch(`${import.meta.env.VITE_API_URL}/api/mute-all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: this.roomId }),
    });
  },

  async lockMeeting() {
    if (!this.isHost) return;

    await fetch(`${import.meta.env.VITE_API_URL}/api/lock-meeting`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: this.roomId }),
    });

    alert("Meeting locked");
  },

  // =====================================================
  // ============ SCREEN SHARING =========================
  // =====================================================

  async sharescreen() {
    if (!this.isScreenSharing) {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });

      this.screenStream = stream;
      this.screenTrack = stream.getVideoTracks()[0];

      const el = this.$refs.localVideo;
      if (el) el.srcObject = stream;

      for (const id in this.peers) {
        const pc = this.peers[id];
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");

        if (sender) {
          await sender.replaceTrack(this.screenTrack);
        }
      }

      this.screenTrack.onended = () => this.stopScreenShare();
      this.isScreenSharing = true;

      this.safeBroadcast("screen-share-status", {
        roomId: this.roomId,
        userId: this.userId,
        userName: this.userName,
        isScreenSharing: true,
      });
    } else {
      await this.stopScreenShare();
    }
  },

  async stopScreenShare() {
    if (this.screenTrack) this.screenTrack.stop();
    if (this.screenStream)
      this.screenStream.getTracks().forEach((t) => t.stop());

    if (this.videoon) {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });

      const track = stream.getVideoTracks()[0];

      const el = this.$refs.localVideo;
      if (el) el.srcObject = stream;

      if (!this.localStream) this.localStream = new MediaStream();
      this.localStream.addTrack(track);

      for (const id in this.peers) {
        const pc = this.peers[id];
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) await sender.replaceTrack(track);
      }
    } else {
      const el = this.$refs.localVideo;
      if (el) el.srcObject = null;
    }

    this.isScreenSharing = false;
    this.safeBroadcast("screen-share-status", {
      roomId: this.roomId,
      userId: this.userId,
      userName: this.userName,
      isScreenSharing: false,
    });
  },

  async renegotiateConnection(id) {
    const pc = this.peers[id];
    if (!pc || pc.signalingState !== "stable") return;

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    this.safeBroadcast("signal", {
      to: id,
      signal: { type: "offer", sdp: offer },
    });
  },

  // =====================================================
  // ============ RECORDING ==============================
  // =====================================================

  async recording() {
    if (!this.isHost) return;

    this.record = !this.record;

    if (this.record) {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      this.recordedChunks = [];
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm",
      });

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.recordedChunks.push(e.data);
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");

        a.href = url;
        a.download = `meeting-${this.roomId}-${Date.now()}.webm`;
        a.click();

        URL.revokeObjectURL(url);
      };

      this.mediaRecorder.start();
      this.isRecording = true;
    } else {
      if (this.mediaRecorder && this.isRecording) {
        this.mediaRecorder.stop();
        this.isRecording = false;
      }
    }
  },

  // =====================================================
  // ============ NETWORK QUALITY CHECK ==================
  // =====================================================

  async checkNetworkQuality() {
    if (!this.localStream || !Object.keys(this.peers).length) return;

    let poor = false;

    for (const id in this.peers) {
      try {
        const stats = await this.peers[id].getStats();

        stats.forEach((rep) => {
          if (rep.type === "outbound-rtp") {
            const sent = rep.packetsSent || 0;
            const lost = rep.packetsLost || 0;

            if (sent > 50 && lost / (sent + lost) > 0.05) poor = true;
          }
        });
      } catch {}
    }

    this.isPoorNetwork = poor;
  },

  initTranscription() {
    const SR =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SR) return;

    this.recognition = new SR();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;

    this.recognition.onresult = (event) => {
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal)
          final += event.results[i][0].transcript + " ";
      }

      if (final) this.transcript.push(final);
    };

    this.recognition.onerror = () => {};
    this.recognition.onend = () => {
      if (this.isPoorNetwork) this.recognition.start();
    };
  },

  // =====================================================
  // ============ CLEANUP =================================
  // =====================================================

  cleanup() {
    if (this.broadcastRetryTimer)
      clearInterval(this.broadcastRetryTimer);

    for (const id in this.peers) {
      try {
        this.peers[id].close();
      } catch {}
    }

    if (this.localStream)
      this.localStream.getTracks().forEach((t) => t.stop());

    if (this.screenStream)
      this.screenStream.getTracks().forEach((t) => t.stop());

    if (this.mediaRecorder && this.isRecording)
      this.mediaRecorder.stop();

    if (this.socket) this.socket.disconnect();

    if (this.networkCheckInterval)
      clearInterval(this.networkCheckInterval);

    if (this.inactivityTimer)
      clearTimeout(this.inactivityTimer);

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }

    this.participants = [];
    this.messages = [];
    this.remoteVideos = {};
    this.peers = {};
  },
    // ============ LIFECYCLE HOOKS ============
  async mounted() {
    if (!this.initUserFromToken()) return;

    this.roomId = this.computedRoomId;
    this.localStream = new MediaStream();

    this.initSocket();
    this.initTranscription();

    setTimeout(() => {
      this.networkCheckInterval = setInterval(
        () => this.checkNetworkQuality(),
        5000
      );
    }, 5000);

    // Auto-hide navbar
    this.resetinactivityTimer();
    document.addEventListener("mousemove", this.resetinactivityTimer);
    document.addEventListener("keydown", this.resetinactivityTimer);
    document.addEventListener("click", this.resetinactivityTimer);
    document.addEventListener("touchstart", this.resetinactivityTimer);
  },

  beforeUnmount() {
    this.cleanup();

    document.removeEventListener("mousemove", this.resetinactivityTimer);
    document.removeEventListener("keydown", this.resetinactivityTimer);
    document.removeEventListener("click", this.resetinactivityTimer);
    document.removeEventListener("touchstart", this.resetinactivityTimer);
  },
};
</script>

<style>
/* ================= GLOBAL ================= */
body {
  background-color: #222021;
  margin: 0;
  color: white;
  font-family: Arial, sans-serif;
}

#page {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* ================= LEFT TRAY ================= */
#left-tray {
  width: 200px;
  background-color: #333;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  position: fixed;
  top: 0;
  bottom: 0;
  transition: all 0.3s ease;
  z-index: 6;
}

.left-tray-left {
  left: 0;
}
.left-tray-right {
  right: 0;
}

#left-tray button {
  background-color: #444;
  border: none;
  padding: 10px;
  color: white;
  border-radius: 8px;
  cursor: pointer;
}
#left-tray button:hover {
  background-color: #555;
}

/* ================= MAIN CONTENT ================= */
#main-content {
  flex: 1;
  padding: 20px;
  transition: margin 0.3s ease;
}

#page.tray-hidden #main-content {
  margin-left: 0;
  margin-right: 0;
}
#page:not(.tray-hidden):not(.tray-on-right) #main-content {
  margin-left: 200px;
}
#page.tray-on-right:not(.tray-hidden) #main-content {
  margin-right: 200px;
}

/* ================= HOST VIDEO ================= */
#host {
  background: #2d4dff;
  border-radius: 10px;
  position: relative;
  height: 55%;
  margin-bottom: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
}
#host video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: black;
}

/* ================= PARTICIPANTS ROW ================= */
#participants {
  background-color: #3a3f47;
  border-radius: 10px;
  padding: 10px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-height: 120px;
}

/* ================= NAVBAR ================= */
#navbar {
  position: fixed;
  bottom: 0;
  left: 0;
  background: #1f1f1f;
  width: 100%;
  height: 60px;
  padding: 0 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #444;
  z-index: 10;
}

#navbar ul {
  list-style: none;
  display: flex;
  gap: 20px;
  margin: 0;
  padding: 0;
}

#navbar li button {
  background: white;
  padding: 10px 16px;
  border: none;
  color: black;
  border-radius: 10px;
  cursor: pointer;
  min-width: 100px;
}
#navbar li button:hover {
  background: #ddd;
}

/* ================= RIGHT PANE ================= */
#rightpane {
  display: flex;
  gap: 16px;
}

/* ================= DROPDOWN ================= */
.dropdown-menu {
  position: absolute;
  bottom: 60px;
  right: 0;
  background: #1f1f1f;
  border-radius: 6px;
  list-style: none;
  padding: 5px 0;
  min-width: 140px;
  box-shadow: 0px 0px 10px #0005;
  z-index: 20;
}
.dropdown-menu li {
  padding: 8px 15px;
  color: white;
  cursor: pointer;
}
.dropdown-menu li:hover {
  background: #333;
}

/* ================= CHAT PANEL ================= */
#chat-box {
  position: fixed;
  bottom: 70px;
  right: 0;
  width: 320px;
  height: calc(100vh - 70px);
  background: #f1f1f1;
  border-left: 1px solid #ccc;
  display: flex;
  flex-direction: column;
  z-index: 100;
}

.chat-header {
  background: #e8e8e8;
  padding: 14px;
  font-weight: bold;
  border-bottom: 1px solid #ccc;
}

.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.message {
  background: white;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 12px;
  border: 1px solid #ccc;
}

.chat-input-section {
  background: #e8e8e8;
  padding: 10px;
  display: flex;
}
.chat-input {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #ccc;
}
.chat-send {
  background: #1a73e8;
  border: none;
  padding: 10px;
  color: black;
  border-radius: 8px;
  margin-left: 8px;
}

/* ================= PARTICIPANT LIST PANEL ================= */
#list-box {
  position: fixed;
  bottom: 70px;
  right: 0;
  width: 320px;
  height: calc(100vh - 70px);
  background: #f8f9fa;
  border-left: 1px solid #ccc;
  z-index: 100;
  display: flex;
  flex-direction: column;
}

.list-header {
  padding: 14px;
  font-size: 18px;
  font-weight: bold;
  background: #e8eaed;
  border-bottom: 1px solid #ccc;
}

.list-body {
  padding: 16px;
  overflow-y: auto;
}

.participant {
  background: white;
  border-radius: 8px;
  border: 1px solid #ccc;
  padding: 10px;
  margin-bottom: 12px;
}

/* ================= TOOLTIP ================= */
.tooltip {
  position: absolute;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  background: black;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
}

/* ================= INFO BOX ================= */
#info_box {
  position: fixed;
  right: 70px;
  bottom: 80px;
  background: white;
  color: black;
  padding: 15px;
  width: 240px;
  border-radius: 10px;
  z-index: 110;
  box-shadow: 0px 4px 12px #0004;
}

/* ================= TRANSCRIPT ================= */
.transcript-box {
  background: #0008;
  position: absolute;
  bottom: 85px;
  left: 20px;
  max-width: 300px;
  max-height: 200px;
  padding: 10px;
  overflow-y: auto;
  border-radius: 6px;
}
</style>





