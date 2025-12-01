<template>
  <div :class="{'tray-on-right':!turned, 'tray-hidden':!trayVisible}" id="page">
    <transition name="slide-left">
      <div id="left-tray" :class="turned ? 'left-tray-left' : 'left-tray-right'" v-if="trayVisible">
        <button @click="silent_background">Silent Background</button>
        <button @click="recording">
            {{ isRecording ? 'Stop Recording' : 'Start Recording' }}
        </button>
        <button @click="turn">Change Panel</button>
      </div>
    </transition>

    <div id="main-content">
              <div id="host" :class="{'video-off': !videoon || isScreenSharing}">
        <video ref="localVideo" autoplay muted playsinline></video>
                <div class="video-placeholder">{{ userName || 'You' }}</div> 
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
            <div v-if="hoveredIcon === 'mic'" class="tooltip">
              {{ micon ? 'Mute' : 'Unmute' }}
            </div>
          </li>

          <li>
            <button
              @mouseenter="() => setHover('video')"
              @mouseleave="() => setHover(null)"
              @click="toggleVideo"
              :class="{ 'active': videoon && !isScreenSharing }"
            >
              <IconMaterialSymbolsVideocam />
            </button>
            <div v-if="hoveredIcon === 'video'" class="tooltip">
              {{ videoon ? 'Stop Video' : 'Start Video' }}
            </div>
          </li>

          <li>
            <button
              @mouseenter="() => setHover('share')"
              @mouseleave="() => setHover(null)"
              @click="sharescreen"
              :class="{ 'active': isScreenSharing }"
            >
              <IconMaterialSymbolsScreenShare />
            </button>
            <div v-if="hoveredIcon === 'share'" class="tooltip">
              {{ isScreenSharing ? 'Stop sharing' : 'Share screen' }}
            </div>
          </li>

          <li>
            <button
              @click="leave"
              @mouseenter="() => setHover('leave')"
              @mouseleave="() => setHover(null)"
            >
              <IconMaterialSymbolsLightCallEnd />
            </button>
            <div v-if="hoveredIcon === 'leave'" class="tooltip">
              Leave call
            </div>
          </li>
        </ul>

                <ul id="rightpane">
          <li>
            <button @click="togglePanel('list')" @mouseenter="() => setHover('participants')" @mouseleave="() => setHover(null)">
              <IconMaterialSymbolsLightGroup />
              <span class="participant-count">({{ participants.length + 1 }})</span>
            </button>
            <div v-if="hoveredIcon === 'participants'" class="tooltip">
              Participants
            </div>

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
                    <li>{{ p.name }} {{ p.isHost ? '(Host)' : '' }} 
                        <span v-if="p.hand">✋</span> 
                        <span v-if="p.hasMic">🎤</span> 
                        <span v-else>🔇</span> 
                        <span v-if="p.hasVideo">📹</span> 
                        <span v-else>🔴</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </li>

          <li style="position: relative;">
            <button @click="togglePanel('chat')" @mouseenter="() => setHover('chat')" @mouseleave="() => setHover(null)">
              <IconMaterialSymbolsChat />
              <span v-if="unreadMessages > 0" class="message-badge">{{ unreadMessages }}</span>
            </button>

            <div v-if="hoveredIcon === 'chat'" class="tooltip">
              Chat
            </div>

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

          <li class="dropdown" style="position: relative;">
            <button @click.stop="toggleDropdown('extras')" @mouseenter="() => setHover('extras')" @mouseleave="() => setHover(null)">
              <IconMaterialSymbolsLightMoreVert />
            </button>
            <div v-if="hoveredIcon === 'extras'" class="tooltip">
              More
            </div>

            <ul v-if="activeDropdown === 'extras'" class="dropdown-menu extras-menu" style="right: 10px;">
              <li @click.stop="hand_raised" :class="{'active': hand}">{{ hand ? 'Lower hand' : 'Raise hand' }}</li>

              <li @click.stop="toggle_info">Info</li>
              
              <template v-if="isHost">
                  <li @click.stop="muteAll">Mute all</li>
                  <li @click.stop="lockMeeting">Lock meeting</li>
                  <li @click.stop="endMeeting" style="color: red;">End meeting for all</li>
              </template>
            </ul>
          </li>
        </ul>
      </div>
    </transition>

    <div id="info_box" v-if="show_info">
        <h3>Meeting Info</h3>
        <p>Room ID: <strong>{{ roomId }}</strong></p>
        <button @click="copystring">Copy Link</button>
        <button @click="close_info">Close</button>
    </div>

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
      cameraTrack: null, // Track the current camera track

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

  computed: {
    computedRoomId() {
      return this.$route.params.id || 'default-room';
    }
  },

  watch: {
    isPoorNetwork(newVal) {
      if(newVal) {
        this.recognition?.start();
      } else {
        this.recognition?.stop();
      }
    },

    activePanel(newVal) {
      if (newVal !== 'chat') {
        this.unreadMessages = 0;
      }
    }
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
        let derivedName =
          decoded.name ||
          decoded.username ||
          decoded.user?.username ||
          decoded.email || // Use email as a fallback name string
          stored ||
          `User-${this.userId.slice(0, 6)}`;

        // Fix 4: Clean up username 
        if (derivedName.includes("@")) {
          this.userName = derivedName.split("@")[0];
        } else {
            this.userName = derivedName;
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
          // Mic OFF: Stop tracks and remove senders
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
            // Fix 1: Renegotiate after removing audio track
            await this.renegotiateConnection(id); 
          }

          this.micon = false;
          this.broadcastMicStatus(false);
        } else {
          // Mic ON: Get new audio track and add senders
          const audio = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });

          const track = audio.getAudioTracks()[0];

          if (!this.localStream) this.localStream = new MediaStream();
          this.localStream.addTrack(track);

          for (const id in this.peers) {
            const pc = this.peers[id];
            pc.addTrack(track, this.localStream);
            // Fix 1: Renegotiate after adding audio track
            await this.renegotiateConnection(id);
          }

          this.micon = true;
          this.broadcastMicStatus(true);
        }
      } catch (err) {
        console.error("Error toggling mic:", err);
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
          // Video OFF: Stop tracks and remove senders
          if (this.localStream) {
            this.localStream.getVideoTracks().forEach((t) => {
              t.stop();
              this.localStream.removeTrack(t);
            });
          }
          
          this.cameraTrack = null;

          const el = this.$refs.localVideo;
          if (el) el.srcObject = null;

          for (const id in this.peers) {
            const pc = this.peers[id];
            const sender = pc.getSenders().find((s) => s.track?.kind === "video");
            if (sender) pc.removeTrack(sender);
            // Fix 1: Renegotiate after removing video track
            await this.renegotiateConnection(id); 
          }

          this.videoon = false;
          this.broadcastVideoStatus(false);
        } else {
          // Video ON: Get new video track and add senders
          const video = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          const track = video.getVideoTracks()[0];
          this.cameraTrack = track; // Store the camera track reference

          if (!this.localStream) this.localStream = new MediaStream();
          this.localStream.addTrack(track);

          const el = this.$refs.localVideo;
          if (el) {
              // Only assign the track to the local video if not screen sharing
              if (!this.isScreenSharing) {
                el.srcObject = new MediaStream([track]); // Use only the video track
                await el.play();
              }
          }

          for (const id in this.peers) {
            const pc = this.peers[id];
              // Check if a video sender already exists (e.g., from screenshare)
              const existingSender = pc.getSenders().find((s) => s.track?.kind === "video");

              if (existingSender) {
                  // If screen sharing is ON, we don't replace the track, 
                  // but we ensure the track is in the localStream for future use.
              } else {
                pc.addTrack(track, this.localStream);
                await this.renegotiateConnection(id);
              }
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

      // Renegotiation handler
      pc.onnegotiationneeded = async () => {
          if (pc.signalingState !== 'stable') return;
          try {
              if (this.peerNegotiating[remoteId]) return;
              this.peerNegotiating[remoteId] = true;

              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);

              this.safeBroadcast("signal", {
                  to: remoteId,
                  signal: { type: "offer", sdp: offer },
              });
          } catch (e) {
              console.error('Error during negotiationneeded:', e);
          } finally {
              this.peerNegotiating[remoteId] = false;
          }
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
      
      // Check if there are active video or audio tracks
      const hasVideo = stream.getVideoTracks().some((t) => t.enabled && t.readyState === "live");
      const hasAudio = stream.getAudioTracks().some((t) => t.enabled && t.readyState === "live");

      // Fix 2: Always ensure the video wrapper exists for the placeholder logic
      if (!wrapper) {
        wrapper = document.createElement("div");
        wrapper.className = "remote-participant";
        wrapper.setAttribute("data-peer-id", remoteId);
        wrapper.style.cssText =
          "display:flex;flex-direction:column;align-items:center;margin:8px;background:#0002;border-radius:8px;padding:6px;position:relative;";

        const vid = document.createElement("video");
        vid.autoplay = true;
        vid.playsInline = true;
        // Apply styling for placeholder/video
        vid.style.cssText =
          "width:260px;height:150px;border-radius:6px;background:#333;object-fit:cover;"; 

        const label = document.createElement("div");
        // Fix 4: Ensure the name is grabbed correctly
        const participant = this.participants.find((p) => p.id === remoteId);
        label.textContent = participant?.name || `User-${remoteId.slice(0, 6)}`;

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
          // Fix 2: If we have a video track, assign the stream, otherwise set to null
          if (hasVideo) {
            vid.srcObject = stream;
            vid.play().catch(() => {});
             wrapper.classList.remove('video-off-placeholder');
          } else {
             // If there's no active video track, display the placeholder
             vid.srcObject = null;
             wrapper.classList.add('video-off-placeholder');
          }

          // If only audio is present, use a silent stream to keep audio alive but show placeholder
          if (hasAudio && !hasVideo) {
             const audioStream = new MediaStream(stream.getAudioTracks());
             // This is a complex fix, but essential: use a new MediaStream with only audio for the audio element (if you had one) 
             // but keep the video element source as null for the visual placeholder.
             // Since we're using one video tag for both audio/video, just setting srcObject to stream is usually enough
             // even if it only contains audio, but setting it to null for visual placeholder is necessary.
             // The audio will still play if the stream is received via ontrack.
          }
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
    
    // Fix 4: Helper to update remote video labels
    updateRemoteVideoLabel(userId) {
        const participant = this.participants.find(p => p.id === userId);
        const wrapper = document.querySelector(`[data-peer-id="${userId}"]`);
        
        if (wrapper && participant) {
            const label = wrapper.querySelector('div:last-child');
            if (label) {
                label.textContent = participant.name;
            }
        }
    },


    updateParticipantsList(list) {
      const mapped = [];

      (list || []).forEach((p) => {
        if (!p || p.id === this.userId || p.id === this.socket.id) return;

        // Fix 4: Clean up username
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
        // Fix 4: Update the label in case the video element already exists
        this.updateRemoteVideoLabel(p.id);
      });

      this.participants = mapped;
    },

    addParticipant(user) {
      if (!user || !user.id) return;
      if (user.id === this.userId || user.id === this.socket.id) return;

      let nm = user.name || user.userName || "Anonymous";
      if (nm.includes("@")) nm = nm.split("@")[0];

      const existsIndex = this.participants.findIndex((p) => p.id === user.id);
      const data = {
        id: user.id,
        name: nm,
        isHost: user.isHost,
        // Preserve existing status if available
        hand: (existsIndex >= 0 ? this.participants[existsIndex].hand : user.hand) || false,
        hasMic: (existsIndex >= 0 ? this.participants[existsIndex].hasMic : user.hasMic) || false,
        hasVideo: (existsIndex >= 0 ? this.participants[existsIndex].hasVideo : user.hasVideo) || false,
        isScreenSharing: (existsIndex >= 0 ? this.participants[existsIndex].isScreenSharing : user.isScreenSharing) || false,
      };

      if (existsIndex >= 0) this.participants[existsIndex] = data;
      else this.participants.push(data);
      
      // Fix 4: Update the label
      this.updateRemoteVideoLabel(user.id);
    },

    updateParticipantStatus(userId, statusType, isEnabled) {
      const participant = this.participants.find(p => p.id === userId);

      if (participant) {
        if (statusType === 'video') {
          participant.hasVideo = isEnabled;

          // Fix 2: Do not remove the video box, just update its srcObject 
          const wrapper = document.querySelector(`[data-peer-id="${userId}"]`);
          if (wrapper) {
              const vid = wrapper.querySelector("video");
              if (vid) {
                  if (!isEnabled) {
                      vid.srcObject = null;
                      wrapper.classList.add('video-off-placeholder');
                  } else {
                      wrapper.classList.remove('video-off-placeholder');
                      // Note: We don't set srcObject ON here, we wait for ontrack/renegotiation
                  }
              }
          }

        } else if (statusType === 'mic') {
          participant.hasMic = isEnabled;

        } else if (statusType === 'screenShare') {
          participant.isScreenSharing = isEnabled;

        } else if (statusType === 'hand') {
          participant.hand = isEnabled;
        }
      }

      // force Vue to re-render participant list UI
      this.$forceUpdate();

      // Update status indicator overlay if remote video box exists
      const wrapper = document.querySelector(`[data-peer-id="${userId}"]`);
      if (wrapper && participant) {
        let indicator = wrapper.querySelector('.status-indicator');
        if (!indicator) {
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
            z-index: 10;
          `;
          wrapper.appendChild(indicator);
        }

        indicator.innerHTML = `
          <span>${participant.hasMic ? '🎤' : '🔇'}</span>
          <span>${participant.hasVideo ? '📹' : '🔴'}</span>
          ${participant.isScreenSharing ? '<span>🖥️</span>' : ''}
          ${participant.hand ? '<span>✋</span>' : ''}
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
        sender: this.userName, // Fix 4: Use clean user name
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
        userName: this.userName, // Fix 4: Use clean user name
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
    
    // Timer reset logic for auto-hide navbar (Keep existing methods)
    resetinactivityTimer() {
        if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
        this.trayVisible = true;
        this.inactivityTimer = setTimeout(() => {
            this.trayVisible = false;
        }, 5000); 
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
          audio: true,
        });

        this.screenStream = stream;
        this.screenTrack = stream.getVideoTracks()[0];
        
        // Replace local stream object to show screen share locally
        const el = this.$refs.localVideo;
        if (el) el.srcObject = stream;

        for (const id in this.peers) {
          const pc = this.peers[id];
          const videoSender = pc.getSenders().find((s) => s.track?.kind === "video");

          if (videoSender) {
            await videoSender.replaceTrack(this.screenTrack);
              // We do not renegotiate here, as replaceTrack handles the change signaling.
          } else {
              // If no video was on previously, add the screen track
              pc.addTrack(this.screenTrack, this.localStream);
              await this.renegotiateConnection(id);
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

      if (this.videoon && this.cameraTrack) {
        // If camera was ON, replace screen track with camera track
        const el = this.$refs.localVideo;
        if (el) el.srcObject = new MediaStream([this.cameraTrack]);

        for (const id in this.peers) {
          const pc = this.peers[id];
          const sender = pc.getSenders().find((s) => s.track?.kind === "video");
          if (sender) await sender.replaceTrack(this.cameraTrack);
        }
      } else {
          // Fix 1: If camera was OFF, remove the screen share track entirely
          const el = this.$refs.localVideo;
          if (el) el.srcObject = null;

          for (const id in this.peers) {
            const pc = this.peers[id];
            const sender = pc.getSenders().find((s) => s.track?.kind === "video");
            if (sender) pc.removeTrack(sender);
              // Renegotiation is required after removal
            await this.renegotiateConnection(id);
          }
      }

      this.isScreenSharing = false;
      this.screenTrack = null;
      this.screenStream = null;
      this.safeBroadcast("screen-share-status", {
        roomId: this.roomId,
        userId: this.userId,
        userName: this.userName,
        isScreenSharing: false,
      });
    },

    async renegotiateConnection(id) {
      const pc = this.peers[id];
      if (!pc || pc.signalingState !== "stable" || this.peerNegotiating[id]) return;

      this.peerNegotiating[id] = true;

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        this.safeBroadcast("signal", {
            to: id,
            signal: { type: "offer", sdp: offer },
        });
      } catch (e) {
          console.error('Renegotiation failed for', id, e);
      } finally {
          this.peerNegotiating[id] = false;
      }
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

/* ================= LEFT TRAY / RIGHT PANEL ================= */
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
  padding: 20px 20px 80px 20px; /* Added bottom padding for navbar */
  transition: margin 0.3s ease;
  display: flex;
  flex-direction: column;
}

#page.tray-hidden #main-content {
  margin-left: 0;
  margin-right: 0;
}
#page:not(.tray-hidden):not(.tray-on-right) #main-content {
  margin-left: 240px; /* Adjusted margin to include padding */
}
#page.tray-on-right:not(.tray-hidden) #main-content {
  margin-right: 240px; /* Adjusted margin to include padding */
}

/* ================= HOST VIDEO (Local Video) ================= */
#host {
  background: #2d4dff; /* Host video is the main, larger video */
  border-radius: 10px;
  position: relative;
  height: 60vh; /* Make the host video dynamic */
  min-height: 250px;
  margin-bottom: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}
#host video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: black;
}
/* Local Video Placeholder Logic */
#host .video-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #3c4043; /* Dark background when video is off */
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 24px;
  font-weight: bold;
}
#host video:not([src]) {
  /* Hide the video element itself when no stream is assigned (only when placeholder is active) */
  display: none;
}
#host.video-off video {
    /* Ensure video is hidden when the state indicates it's off */
    display: none;
}
#host.video-off .video-placeholder {
    display: flex;
}
#host:not(.video-off) .video-placeholder {
    display: none;
}


/* ================= PARTICIPANTS ROW (Remote Videos) ================= */
#participants {
  /* Use CSS Grid for responsive video tiles (Fix 3) */
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); /* Responsive grid */
  gap: 10px; 
  flex: 1; /* Allow participant area to fill remaining space */
  overflow-y: auto; /* Allow scrolling if many participants */
  padding: 10px;
  background-color: #3a3f47;
  border-radius: 10px;
}

.remote-participant {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-radius: 8px;
  background-color: #222021;
  overflow: hidden;
  height: 150px; /* Fixed height for consistency */
}
.remote-participant video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Remote Video Placeholder Logic (Fix 2) */
.remote-participant.video-off-placeholder video {
  display: none; /* Hide the video element */
}

.remote-participant.video-off-placeholder::before {
  content: attr(data-name-initial); /* Use data attribute for initials */
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #3c4043; /* Dark gray background */
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 40px;
  font-weight: bold;
  z-index: 1;
}

/* Status indicator on remote videos */
.status-indicator {
    position: absolute;
    bottom: 35px; /* Above the name label */
    left: 8px;
    display: flex;
    gap: 4px;
    font-size: 16px;
    background: rgba(0,0,0,0.7);
    padding: 4px;
    border-radius: 4px;
    z-index: 10;
}
.remote-participant > div:last-child {
    /* Style for the participant name label appended by JS */
    position: absolute;
    bottom: 5px;
    left: 5px;
    right: 5px;
    text-align: left;
    color: white;
    padding: 2px 4px;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 3px;
    font-size: 13px;
    z-index: 10;
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
  box-sizing: border-box; /* Important for padding/width calculation */
}

#navbar ul {
  list-style: none;
  display: flex;
  gap: 20px;
  margin: 0;
  padding: 0;
}

#navbar li button {
  background: #333; /* Darkened button background */
  padding: 10px 16px;
  border: none;
  color: white; /* Changed text color to white */
  border-radius: 10px;
  cursor: pointer;
  min-width: 50px; /* Reduced min-width for better mobile fit */
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
#navbar li button.active {
    background: #4caf50; /* Green for active mic/video */
    color: white;
}
#navbar li button:hover {
  background: #555;
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

/* ================= CHAT/LIST PANEL ================= */
#chat-box, #list-box {
  position: fixed;
  bottom: 60px; /* Align above the navbar */
  right: 0;
  width: 320px;
  height: calc(100vh - 60px); /* Fill space above navbar */
  background: #f1f1f1;
  border-left: 1px solid #ccc;
  display: flex;
  flex-direction: column;
  z-index: 100;
}
#list-box {
    background: #f8f9fa;
}

.chat-header, .list-header {
  background: #e8e8e8;
  padding: 14px;
  font-weight: bold;
  border-bottom: 1px solid #ccc;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.chat-header button, .list-header button {
    background: none;
    border: none;
    font-weight: bold;
    cursor: pointer;
    color: #444;
}

.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  color: black;
}

.message {
  background: white;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 12px;
  border: 1px solid #ccc;
}
.message-header {
    font-size: 0.8em;
    font-weight: bold;
    margin-bottom: 4px;
    color: #1a73e8;
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
  color: white !important; /* Changed to white for visibility */
  border-radius: 8px;
  margin-left: 8px;
}
.chat-send:disabled {
    background: #ccc;
}

.list-body {
  padding: 16px;
  overflow-y: auto;
  color: black;
}

.participant {
  background: white;
  border-radius: 8px;
  border: 1px solid #ccc;
  padding: 10px;
  margin-bottom: 12px;
}
.participant ul {
    list-style: none;
    padding: 0;
    margin: 0;
    font-weight: bold;
}

/* Message badge */
.message-badge {
    position: absolute;
    top: -5px;
    right: -5px;
    background: red;
    color: white;
    border-radius: 50%;
    padding: 2px 5px;
    font-size: 10px;
}

/* ================= TOOLTIP & INFO BOX ================= */
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
  z-index: 20;
}

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

/* ================= MEDIA QUERIES (Responsiveness) ================= */
@media (max-width: 900px) {
    #navbar {
        padding: 0 10px;
        justify-content: center;
    }
    #navbar ul {
        gap: 10px;
    }
    #navbar li button {
        padding: 8px;
        min-width: 40px;
    }
    #navbar li button span {
        display: none; /* Hide participant count on small screens */
    }
    
    #host {
        height: 50vh;
    }
    
    /* Make side panels cover full screen on small viewport */
    #chat-box, #list-box {
        width: 100%;
        height: calc(100vh - 60px);
    }

    #left-tray {
        width: 100%;
        height: auto;
        flex-direction: row;
        top: 0;
        left: 0;
        right: 0;
        bottom: auto;
        padding: 10px;
        /* Ensure it sits below the content/is visible */
        box-shadow: 0 4px 8px rgba(0,0,0,0.5); 
    }
    
    #main-content {
        padding-top: 60px; /* Add space for top-positioned left-tray */
    }
    
    #page:not(.tray-hidden):not(.tray-on-right) #main-content,
    #page.tray-on-right:not(.tray-hidden) #main-content {
        margin-left: 0;
        margin-right: 0;
    }
}
</style>

