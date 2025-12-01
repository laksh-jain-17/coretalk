<template>
  <!-- Hidden canvas used to generate black-screen track -->
  <canvas ref="blackCanvas" width="640" height="360" style="display:none;"></canvas>

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

        <!-- Camera-off placeholder for HOST -->
        <div v-if="!videoon" class="video-off-placeholder">
          <svg width="60" height="60" viewBox="0 0 24 24" fill="white">
            <path d="M21 6.5L16 10V7c0-1.1-.9-2-2-2H5C3.9 5 3 5.9 3 7v10c0 
              1.1.9 2 2 2h9c1.1 0 2-.9 2-2v-3l5 3.5V6.5z"/>
          </svg>
        </div>

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
                  <ul><li>{{ userName }} (You) {{ isHost ? '(Host)' : '' }}</li></ul>
                </div>

                <div class="participant" v-for="p in participants" :key="p.id">
                  <ul><li>{{ p.name }} {{ p.isHost ? '(Host)' : '' }}</li></ul>
                </div>
              </div>
            </div>
          </li>

          <li>
            <button @click="togglePanel('chat')" @mouseenter="() => setHover('chat')" @mouseleave="() => setHover(null)">
              <IconMaterialSymbolsChat />
              <span v-if="unreadMessages > 0" class="message-badge">{{ unreadMessages }}</span>
            </button>
            <ul v-if="hoveredIcon === 'chat'" class="tooltip"><li>Chat</li></ul>

            <div id="chat-box" v-if="activePanel === 'chat'">
              <div class="chat-header">
                Chat <button @click="togglePanel(null)">X</button>
              </div>

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
                  maxlength="500"
                />
                <button class="chat-send" @click="sendMessage" :disabled="!newMessage.trim()">Send</button>
              </div>
            </div>
          </li>

          <li class="dropdown">
            <button @click.stop="toggleDropdown('extras')" @mouseenter="() => setHover('extras')" @mouseleave="() => setHover(null)">
              <IconMaterialSymbolsLightMoreVert />
            </button>
            <ul v-if="hoveredIcon === 'extras'" class="tooltip"><li>More</li></ul>

            <ul v-if="activeDropdown === 'extras'" class="dropdown-menu extras-menu">
              <li @click.stop="hand_raised">
                {{ hand ? 'Lower hand' : 'Raise hand' }}
                <div id="hand_warning" v-if="hand">
                  <p>Hand was raised.</p>
                </div>
              </li>

              <li @click.stop="toggle_info">
                Info
                <div id="info_box" v-if="show_info">
                  <div id="inside_info">
                    <div id="info_header">
                      <b>Meeting Info</b>
                      <button @click.stop="close_info">X</button>
                    </div>
                    <hr />
                    <p>Meeting Title: {{ title }}</p>
                    <p>Room ID: {{ roomId }}</p>
                    <p>Participants: {{ participants.length + 1 }}</p>
                    <button id="copylink" @click="copystring">Copy Link</button>
                  </div>
                </div>
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
      // User & Room info
      isHost: false,
      userName: '',
      userId: '',
      roomId: '',
      title: 'Meeting Room',
      
      // UI State
      hoveredIcon: null,
      activeDropdown: null,
      activePanel: null,
      trayVisible: true,
      inactivityTimer: null,
      show_info: false,
      hand: false,
      turned: true,

      // Media State
      micon: false,
      videoon: false,
      localStream: null,
      isScreenSharing: false,
      screenTrack: null,
      screenStream: null,

      // Recording
      mediaRecorder: null,
      recordedChunks: [],
      isRecording: false,
      record: false,

      // Communication
      socket: null,
      isSocketConnected: false,
      participants: [],
      messages: [],
      newMessage: '',
      unreadMessages: 0,

      // WebRTC
      peers: {},
      remoteVideos: {},
      pendingCandidates: {},
      peerNegotiating: {},

      // Network & Transcript
      isPoorNetwork: false,
      transcript: [],
      networkCheckInterval: null,
      recognition: null,

      // Internal flags
      hasInitializedSocket: false,
      broadcastQueue: [],
      isInitializingMedia: false,
      broadcastRetryTimer: null,

      // NEW: Used for black-screen broadcast
      blackStream: null,
      blackInterval: null
    };
  },

  computed: {
    computedRoomId() {
      return this.$route.params.id || 'default-room';
    }
  },

  watch: {
    isPoorNetwork(newVal) {
      if (newVal) {
        console.log("Poor network -> Transcript enabled");
        this.recognition?.start();
      } else {
        console.log("Network normal -> Transcript disabled");
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
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        this.$router.push('/Login');
        return false;
      }

      try {
        const decoded = jwtDecode(token);

        this.userId =
          decoded.id ||
          decoded.userId ||
          decoded.user?.id ||
          `user_${Date.now()}`;

        const storedEmail = localStorage.getItem('username');
        this.userName =
          decoded.name ||
          decoded.user?.name ||
          decoded.username ||
          decoded.user?.username ||
          (storedEmail && !storedEmail.includes('@') ? storedEmail : null) ||
          decoded.email ||
          decoded.user?.email ||
          storedEmail ||
          `User-${this.userId.substring(0, 8)}`;

        if (this.userName.includes('@')) {
          const emailParts = this.userName.split('@');
          this.userName =
            emailParts[0] || `User-${this.userId.substring(0, 8)}`;
        }

        const storedIsHost = localStorage.getItem('isHost');
        this.isHost = storedIsHost === 'true' || decoded.isHost === true;

        console.log('User initialized:', {
          userId: this.userId,
          userName: this.userName,
          isHost: this.isHost
        });

        return true;
      } catch (error) {
        console.error('Error decoding token:', error);
        localStorage.removeItem('token');
        this.$router.push('/Login');
        return false;
      }
    },
    initSocket() {
      console.log('Initializing socket connection...');
      
      this.socket = io("http://localhost:5000", {
        transports: ['websocket'],
        upgrade: true,
        timeout: 20000,
        forceNew: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5
      });

      // ============ CONNECTION EVENTS ============
      this.socket.on('connect', () => {
        console.log('Socket connected:', this.socket.id);
        this.isSocketConnected = true;

        const joinData = {
          roomId: this.roomId,
          userName: this.userName,
          userId: this.userId,
          isHost: this.isHost
        };

        console.log('Joining room:', joinData);
        this.socket.emit('join-room', joinData);

        this.startBroadcastRetry();
      });

      this.socket.on('connect_error', (err) => {
        console.error('Socket connect error:', err.message);
        this.isSocketConnected = false;
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        this.isSocketConnected = false;

        if (reason === 'io server disconnect') {
          setTimeout(() => {
            if (!this.socket?.connected) {
              this.socket.connect();
            }
          }, 1000);
        }
      });

      this.socket.on('reconnect', (attemptNumber) => {
        console.log('Socket reconnected after', attemptNumber, 'attempts');
        this.isSocketConnected = true;

        const joinData = {
          roomId: this.roomId,
          userName: this.userName,
          userId: this.userId,
          isHost: this.isHost
        };
        this.socket.emit('join-room', joinData);

        this.startBroadcastRetry();
      });

      // ============ ROOM EVENTS ============
      this.socket.on('userRole', (role) => {
        console.log('Received userRole:', role);
        this.isHost = role === 'host';
      });

      this.socket.on('participants-list', (list) => {
        console.log('Participants list received:', list);
        this.updateParticipantsList(list);
      });

      this.socket.on('user-joined', async (user) => {
        console.log('User joined:', user);

        if (user.id !== this.socket.id && user.id !== this.userId) {
          this.addParticipant(user);

          setTimeout(async () => {
            await this.startOffer(user.id);
          }, 1500);
        }
      });

      this.socket.on('user-left', (userId) => {
        console.log('User left:', userId);
        this.cleanupPeer(userId);
        this.participants = this.participants.filter(p => p.id !== userId);
      });

      this.socket.on('existing-users', async (users) => {
        console.log('Existing users:', users);

        for (const user of users || []) {
          if (user?.id && user.id !== this.socket.id && user.id !== this.userId) {
            this.addParticipant(user);

            setTimeout(async () => {
              await this.startOffer(user.id);
            }, 1000 + Math.random() * 1000);
          }
        }
      });

      // ============ SIGNALING EVENTS ============
      this.socket.on('signal', async ({ from, signal }) => {
        if (signal.type === 'offer') {
          await this.handleOffer(from, signal.sdp);
        } else if (signal.type === 'answer') {
          await this.handleAnswer(from, signal.sdp);
        } else if (signal.candidate) {
          await this.handleIceCandidate(from, signal.candidate);
        }
      });

      // ============ CHAT EVENTS ============
      this.socket.on('chat-message', ({ sender, text, timestamp }) => {
        const message = {
          sender: sender || 'Unknown',
          text: text || '',
          timestamp: timestamp || Date.now()
        };
        this.messages.push(message);

        if (this.activePanel !== 'chat') {
          this.unreadMessages++;
        }

        this.$nextTick(() => {
          const chatBody = this.$refs.chatBody;
          if (chatBody) {
            chatBody.scrollTop = chatBody.scrollHeight;
          }
        });
      });

      // ============ HAND RAISE EVENTS ============
      this.socket.on('hand-raised', ({ userId, userName, isRaised }) => {
        console.log(`${userName} ${isRaised ? 'raised' : 'lowered'} hand`);
      });

      // ============ MEDIA STATUS EVENTS ============
      this.socket.on('video-status', ({ userId, userName, isVideoOn }) => {
        console.log(`${userName} video: ${isVideoOn ? 'ON' : 'OFF'}`);
        this.updateParticipantStatus(userId, 'video', isVideoOn);
      });

      this.socket.on('mic-status', ({ userId, userName, isMicOn }) => {
        console.log(`${userName} mic: ${isMicOn ? 'ON' : 'OFF'}`);
        this.updateParticipantStatus(userId, 'mic', isMicOn);
      });

      this.socket.on('screen-share-status', ({ userId, userName, isScreenSharing }) => {
        console.log(`${userName} ${isScreenSharing ? 'started' : 'stopped'} screen sharing`);
        this.updateParticipantStatus(userId, 'screenShare', isScreenSharing);
      });

      // ============ HOST CONTROL EVENTS ============
      this.socket.on('meeting-locked', () => {
        console.log('Meeting locked by host');
        alert('Meeting has been locked by the host');
      });

      this.socket.on('all-muted', () => {
        console.log('All participants muted by host');
        if (!this.isHost && this.micon) {
          this.toggleMic();
        }
      });

      this.hasInitializedSocket = true;
    },
    // ============ WEBRTC PEER MANAGEMENT ============
    async createPeerConnection(remoteId, isInitiator = false) {
      console.log(`Creating peer connection for ${remoteId} (initiator: ${isInitiator})`);

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          {
            urls: 'turn:your-turn-server.com:3478',
            username: process.env.VITE_TURN_USERNAME,
            credential: process.env.VITE_TURN_PASSWORD
          }
        ],
        iceCandidatePoolSize: 10
      });

      pc.onicecandidate = (event) => {
        if (event.candidate && this.isSocketConnected) {
          try {
            this.socket.emit('signal', {
              to: remoteId,
              signal: { candidate: event.candidate }
            });
          } catch (error) {
            console.error('Error sending ICE candidate:', error);
          }
        }
      };

      pc.ontrack = (event) => {
        console.log(`Received ${event.track.kind} track from ${remoteId}`);
        const stream = event.streams[0];
        if (stream) {
          this.handleRemoteStream(remoteId, stream);
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log(`ICE state for ${remoteId}: ${pc.iceConnectionState}`);

        if (pc.iceConnectionState === 'failed') {
          console.log(`ICE failed for ${remoteId} - restarting`);
          pc.restartIce();
        }

        if (pc.iceConnectionState === 'disconnected') {
          setTimeout(() => {
            if (pc.iceConnectionState === 'disconnected') {
              this.cleanupPeer(remoteId);
            }
          }, 10000);
        }
      };

      // Add local tracks
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          console.log(`Adding ${track.kind} track to peer ${remoteId}`);
          pc.addTrack(track, this.localStream);
        });
      }

      this.peers[remoteId] = pc;
      this.peerNegotiating[remoteId] = false;
      return pc;
    },

    async handleOffer(from, offer) {
      try {
        console.log(`Handling offer from ${from}`);

        let pc = this.peers[from];
        if (!pc) {
          pc = await this.createPeerConnection(from, false);
        }

        // Prevent collision conditions
        if (pc.signalingState !== 'stable') {
          console.log(`Peer ${from} not stable (${pc.signalingState}), waiting...`);
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (pc.signalingState === 'have-local-offer') {
          console.log(`Collision with ${from} - rolling back`);
          await pc.setLocalDescription({ type: 'rollback' });
        }

        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Process queued ICE candidates
        if (this.pendingCandidates[from]) {
          for (const candidate of this.pendingCandidates[from]) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
              console.error('Error adding queued candidate:', err);
            }
          }
          delete this.pendingCandidates[from];
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (this.isSocketConnected) {
          this.socket.emit('signal', {
            to: from,
            signal: { type: 'answer', sdp: pc.localDescription }
          });
          console.log(`Answer sent to ${from}`);
        }
      } catch (err) {
        console.error('Error handling offer:', err);
      }
    },

    async handleAnswer(from, answer) {
      try {
        console.log(`Handling answer from ${from}`);
        const pc = this.peers[from];

        if (!pc) {
          console.error(`No peer connection for ${from}`);
          return;
        }

        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));

          // Process queued ICE
          if (this.pendingCandidates[from]) {
            for (const candidate of this.pendingCandidates[from]) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (err) {
                console.error('Error adding queued candidate:', err);
              }
            }
            delete this.pendingCandidates[from];
          }

          console.log(`Answer handled for ${from}`);
          this.peerNegotiating[from] = false;
        } else {
          console.log(`Ignoring answer from ${from} - wrong state: ${pc.signalingState}`);
        }
      } catch (err) {
        console.error('Error handling answer:', err);
      }
    },

    async handleIceCandidate(from, candidate) {
      try {
        const pc = this.peers[from];

        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log(`ICE candidate added from ${from}`);
        } else {
          if (!this.pendingCandidates[from]) {
            this.pendingCandidates[from] = [];
          }
          this.pendingCandidates[from].push(candidate);
          console.log(`ICE candidate queued for ${from}`);
        }
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    },

    handleRemoteStream(remoteId, stream) {
      console.log(`Setting up remote stream for ${remoteId}`, stream.getTracks().length, 'tracks');

      let wrapper = document.querySelector(`[data-peer-id="${remoteId}"]`);

      const hasActiveTracks = stream
        .getTracks()
        .some(track => track.enabled && track.readyState === 'live');

      if (!hasActiveTracks) {
        if (wrapper) {
          wrapper.remove();
          delete this.remoteVideos[remoteId];
        }
        return;
      }

      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.setAttribute('data-peer-id', remoteId);
        wrapper.className = 'remote-participant';
        wrapper.style.cssText = `
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          margin: 8px;
          border: 2px solid #333;
          border-radius: 8px;
          padding: 8px;
          background-color: rgba(0,0,0,0.5);
          position: relative;
        `;

        const vid = document.createElement('video');
        vid.autoplay = true;
        vid.playsInline = true;
        vid.muted = false;
        vid.style.cssText = `
          width: 280px;
          height: 160px;
          border-radius: 8px;
          object-fit: cover;
          background-color: #000;
        `;

        const label = document.createElement('div');
        const participant = this.participants.find(p => p.id === remoteId);
        const pName = participant?.name || `User-${remoteId.substring(0, 6)}`;
        label.textContent = pName;
        label.style.cssText = `
          margin-top: 6px;
          font-size: 14px;
          color: #eee;
          font-weight: bold;
          text-align: center;
          word-wrap: break-word;
          max-width: 280px;
        `;

        wrapper.appendChild(vid);
        wrapper.appendChild(label);
        this.remoteVideos[remoteId] = vid;

        if (this.$refs.participantsBox) {
          this.$refs.participantsBox.appendChild(wrapper);
        }
      }

      const vid = wrapper.querySelector('video');
      if (vid && stream) {
        vid.srcObject = stream;
        const playPromise = vid.play();
        if (playPromise) {
          playPromise.catch(err => {
            console.warn(`Video play failed for ${remoteId}:`, err.name);
          });
        }
      }

      stream.getTracks().forEach(track => {
        track.onended = () => {
          const currentStream = vid.srcObject;
          if (currentStream) {
            const liveTracks = currentStream
              .getTracks()
              .filter(t => t.readyState === 'live' && t.enabled);
            if (liveTracks.length === 0) {
              wrapper.remove();
              delete this.remoteVideos[remoteId];
            }
          }
        };
      });
    },
    async startOffer(remoteId) {
      if (remoteId === this.socket?.id || remoteId === this.userId) return;

      console.log(`Starting offer to ${remoteId}`);

      try {
        const pc = await this.createPeerConnection(remoteId, true);

        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });

        await pc.setLocalDescription(offer);

        if (this.isSocketConnected) {
          this.socket.emit('signal', {
            to: remoteId,
            signal: { type: 'offer', sdp: offer }
          });
          console.log(`Offer sent to ${remoteId}`);
        }
      } catch (err) {
        console.error(`Error creating/sending offer to ${remoteId}:`, err);
      }
    },

    cleanupPeer(peerId) {
      console.log(`Cleaning up peer: ${peerId}`);

      if (this.peers[peerId]) {
        try {
          this.peers[peerId].close();
        } catch (e) {
          console.error('Error closing PC:', e);
        }
        delete this.peers[peerId];
      }

      delete this.peerNegotiating[peerId];
      delete this.pendingCandidates[peerId];

      const wrapper = document.querySelector(`[data-peer-id="${peerId}"]`);
      if (wrapper?.parentNode) wrapper.remove();

      delete this.remoteVideos[peerId];
    },

    // ============ PARTICIPANT LIST UPDATE ============
    updateParticipantsList(list) {
      console.log('Updating participants list:', list);

      const participantsMap = new Map();

      for (const p of list || []) {
        if (!p || !p.id || p.id === this.socket?.id || p.id === this.userId) continue;

        let displayName =
          p.name || p.userName || p.username;

        if (displayName && displayName.includes('@')) {
          displayName = displayName.split('@')[0];
        }

        if (!displayName || displayName === 'undefined') {
          displayName = `User-${p.id.substring(0, 8)}`;
        }

        participantsMap.set(p.id, {
          id: p.id,
          name: displayName,
          isHost: p.isHost || false,
          hasMic: p.hasMic || false,
          hasVideo: p.hasVideo || false
        });
      }

      this.participants = Array.from(participantsMap.values());
      console.log('Updated participants:', this.participants);
    },

    addParticipant(user) {
      if (!user || !user.id || user.id === this.socket?.id || user.id === this.userId) {
        return;
      }

      const existingIndex = this.participants.findIndex(p => p.id === user.id);

      let displayName =
        user.name || user.userName || user.username || 'Anonymous';

      if (displayName && displayName.includes('@')) {
        displayName = displayName.split('@')[0];
      }

      if (!displayName || displayName === 'undefined') {
        displayName = `User-${user.id.substring(0, 8)}`;
      }

      const participantData = {
        id: user.id,
        name: displayName,
        isHost: user.isHost || false,
        hasMic: user.hasMic || false,
        hasVideo: user.hasVideo || false
      };

      if (existingIndex >= 0) {
        this.participants[existingIndex] = participantData;
      } else {
        this.participants.push(participantData);
      }
    },

    updateParticipantStatus(userId, statusType, isEnabled) {
      const participant = this.participants.find(p => p.id === userId);

      if (participant) {
        if (statusType === 'video') {
          participant.hasVideo = isEnabled;

          if (!isEnabled) {
            const wrapper = document.querySelector(`[data-peer-id="${userId}"]`);
            if (wrapper) {
              console.log(`Removing video box for ${userId} - video off`);
              wrapper.remove();
              delete this.remoteVideos[userId];
            }
          }
        } else if (statusType === 'mic') {
          participant.hasMic = isEnabled;
        } else if (statusType === 'screenShare') {
          participant.isScreenSharing = isEnabled;
        }

        this.$forceUpdate();
      }

      // Add/Update status indicator
      const wrapper = document.querySelector(`[data-peer-id="${userId}"]`);

      if (wrapper) {
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
    // ============ UI CONTROLS ============
    togglePanel(panel) {
      this.activePanel = this.activePanel === panel ? null : panel;
      this.activeDropdown = null;

      if (panel === 'chat') {
        this.unreadMessages = 0;
      }
    },

    setHover(icon) {
      this.hoveredIcon = icon;
    },

    toggleDropdown(type) {
      this.activeDropdown = this.activeDropdown === type ? null : type;
      this.activePanel = null;
    },

    closeDropdown() {
      this.activeDropdown = null;
    },

    resetinactivityTimer() {
      this.trayVisible = true;
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = setTimeout(() => {
        this.trayVisible = false;
      }, 5000);
    },

    turn() {
      this.turned = !this.turned;
    },

    // ============ CHAT & HAND RAISE ============
    sendMessage() {
      const text = (this.newMessage || '').trim();
      if (!text) return;

      const message = {
        sender: this.userName,
        text: text,
        timestamp: Date.now()
      };

      this.safeBroadcast('chat-message', {
        roomId: this.roomId,
        ...message
      });

      this.newMessage = '';

      this.$nextTick(() => {
        const chatBody = this.$refs.chatBody;
        if (chatBody) {
          chatBody.scrollTop = chatBody.scrollHeight;
        }
      });
    },

    hand_raised() {
      this.hand = !this.hand;

      this.safeBroadcast('hand-raised', {
        roomId: this.roomId,
        userId: this.userId,
        userName: this.userName,
        isRaised: this.hand
      });
    },

    // ============ MEETING INFO ============
    toggle_info() {
      this.show_info = !this.show_info;
    },

    close_info() {
      this.show_info = false;
    },

    copystring() {
      const meetingLink = window.location.href;
      navigator.clipboard.writeText(meetingLink)
        .then(() => {
          alert("Meeting link copied to clipboard!");
        })
        .catch(err => {
          console.error("Failed to copy:", err);
          
          const textArea = document.createElement('textarea');
          textArea.value = meetingLink;
          document.body.appendChild(textArea);

          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);

          alert("Meeting link copied to clipboard!");
        });
    },

    leave() {
      this.cleanup();
      this.$router.push('/Ending');
    },

    // ============ HOST CONTROLS ============
    async endMeeting() {
      if (!this.isHost) {
        alert("Only host can end the meeting");
        return;
      }

      try {
        const res = await fetch("http://localhost:5000/api/end-meeting", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId: this.roomId })
        });

        if (res.ok) {
          this.cleanup();
          this.$router.push('/Ending');
        } else {
          console.error('Failed to end meeting');
        }
      } catch (err) {
        console.error("Error ending meeting:", err);
      }
    },

    async muteAll() {
      if (!this.isHost) {
        alert("Only host can mute all participants");
        return;
      }

      try {
        const res = await fetch("http://localhost:5000/api/mute-all", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId: this.roomId })
        });

        if (res.ok) {
          console.log("All participants muted");
        }
      } catch (err) {
        console.error("Error muting all:", err);
      }
    },

    async lockMeeting() {
      if (!this.isHost) {
        alert("Only host can lock the meeting");
        return;
      }

      try {
        const res = await fetch("http://localhost:5000/api/lock-meeting", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId: this.roomId })
        });

        if (res.ok) {
          console.log("Meeting locked");
          alert("Meeting has been locked");
        }
      } catch (err) {
        console.error("Error locking meeting:", err);
      }
    },

    transfer() {
      if (!this.isHost) {
        alert("Only host can transfer meeting");
        return;
      }
      alert("Host transfer - Work in progress");
    },
    // ============ SCREEN SHARING ============
    async sharescreen() {
      try {
        if (!this.isScreenSharing) {
          console.log('=== STARTING SCREEN SHARE ===');

          const stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              cursor: "always",
              displaySurface: "monitor"
            },
            audio: false
          });

          this.screenStream = stream;
          this.screenTrack = stream.getVideoTracks()[0];

          console.log('Screen track obtained:', this.screenTrack);

          const el = this.$refs.localVideo;
          if (el) {
            el.srcObject = stream;
            await el.play().catch(err => console.error('Local play error:', err));
          }

          let replacementCount = 0;

          for (const peerId in this.peers) {
            const pc = this.peers[peerId];
            const senders = pc.getSenders();
            const videoSender = senders.find(s => s.track?.kind === 'video');

            if (videoSender && videoSender.track) {
              await videoSender.replaceTrack(this.screenTrack);
              console.log(`Replaced video track for peer ${peerId}`);
              replacementCount++;
            } else {
              pc.addTrack(this.screenTrack, stream);
              console.log(`Added screen track for peer ${peerId}`);
              replacementCount++;
              await this.renegotiateConnection(peerId);
            }
          }

          console.log(`Screen sent to ${replacementCount} peers`);

          this.screenTrack.onended = () => {
            console.log('Screen share ended by user');
            this.stopScreenShare();
          };

          this.isScreenSharing = true;
          this.broadcastScreenShareStatus(true);

          console.log('=== SCREEN SHARE STARTED ===');
        } else {
          await this.stopScreenShare();
        }
      } catch (err) {
        console.error("Error sharing screen:", err);

        if (err.name === 'NotAllowedError') {
          alert("Please allow screen sharing.");
        } else if (err.name === 'NotFoundError') {
          alert("No screen to share.");
        } else {
          alert("Could not start screen sharing: " + err.message);
        }

        this.isScreenSharing = false;
      }
    },

    async stopScreenShare() {
      try {
        console.log('=== STOPPING SCREEN SHARE ===');

        if (this.screenTrack) {
          this.screenTrack.stop();
          this.screenTrack = null;
        }

        if (this.screenStream) {
          this.screenStream.getTracks().forEach(t => t.stop());
          this.screenStream = null;
        }

        if (this.videoon) {
          console.log('Restoring camera...');

          const videoStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 }
            }
          });

          const videoTrack = videoStream.getVideoTracks()[0];

          const el = this.$refs.localVideo;
          if (el) {
            el.srcObject = videoStream;
            await el.play().catch(() => {});
          }

          if (!this.localStream) this.localStream = new MediaStream();

          this.localStream.getVideoTracks().forEach(track => {
            this.localStream.removeTrack(track);
          });

          this.localStream.addTrack(videoTrack);

          for (const peerId in this.peers) {
            const pc = this.peers[peerId];
            const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');

            if (videoSender) {
              await videoSender.replaceTrack(videoTrack);
              console.log(`Restored camera for ${peerId}`);
            } else {
              pc.addTrack(videoTrack, this.localStream);
              await this.renegotiateConnection(peerId);
            }
          }
        } else {
          const el = this.$refs.localVideo;
          if (el) el.srcObject = null;

          for (const peerId in this.peers) {
            const pc = this.peers[peerId];
            const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');

            if (videoSender) {
              await videoSender.replaceTrack(null);
              console.log(`Removed video for ${peerId}`);
            }
          }
        }

        this.isScreenSharing = false;
        this.broadcastScreenShareStatus(false);

        console.log('=== SCREEN SHARE STOPPED ===');

      } catch (err) {
        console.error("Error stopping screen share:", err);
        this.isScreenSharing = false;
      }
    },

    broadcastScreenShareStatus(isSharing) {
      const data = {
        roomId: this.roomId,
        userId: this.userId,
        userName: this.userName,
        isScreenSharing: isSharing
      };

      console.log('Broadcasting screen share status:', isSharing);
      this.safeBroadcast('screen-share-status', data);
    },

    // ============ RENEGOTIATION ============
    async renegotiateConnection(peerId) {
      const pc = this.peers[peerId];
      if (!pc || this.peerNegotiating[peerId]) {
        console.log(
          `Cannot renegotiate peer ${peerId} - ${
            !pc ? 'no PC' : 'already negotiating'
          }`
        );
        return;
      }

      try {
        this.peerNegotiating[peerId] = true;
        console.log(`Renegotiating with ${peerId}...`);

        if (pc.signalingState !== 'stable') {
          console.log(`Peer ${peerId} not stable (${pc.signalingState}) - waiting`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });

        await pc.setLocalDescription(offer);

        if (this.isSocketConnected) {
          this.socket.emit('signal', {
            to: peerId,
            signal: { type: 'offer', sdp: offer }
          });
          console.log(`Sent renegotiation offer to ${peerId}`);
        } else {
          console.error('Socket not connected, cannot renegotiate');
        }
      } catch (err) {
        console.error(`Renegotiation error for ${peerId}:`, err);
      } finally {
        setTimeout(() => {
          this.peerNegotiating[peerId] = false;
        }, 2000);
      }
    },
    // ============ BLACK SCREEN VIDEO TRACK GENERATOR ============
    async generateBlackTrack() {
      console.log("Generating black-screen track...");

      const canvas = this.$refs.blackCanvas;
      const ctx = canvas.getContext("2d");

      const drawFrame = () => {
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // White camera-off icon (inline SVG converted to canvas)
        ctx.fillStyle = "white";

        // Simple camera-off shape
        ctx.beginPath();
        ctx.moveTo(220, 150);
        ctx.lineTo(420, 150);
        ctx.lineTo(420, 250);
        ctx.lineTo(220, 250);
        ctx.closePath();
        ctx.fill();

        // Slash line
        ctx.strokeStyle = "white";
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.moveTo(220, 250);
        ctx.lineTo(420, 150);
        ctx.stroke();
      };

      drawFrame();

      if (this.blackInterval) clearInterval(this.blackInterval);
      this.blackInterval = setInterval(drawFrame, 100);

      this.blackStream = canvas.captureStream(30);
      const blackTrack = this.blackStream.getVideoTracks()[0];

      console.log("Black-screen track generated.");
      return blackTrack;
    },

    // ============ VIDEO TRACK REPLACER ============
    replaceVideoTrack(newTrack) {
      console.log("Replacing video track for all peers...");

      for (const peerId in this.peers) {
        const pc = this.peers[peerId];
        if (!pc) continue;

        const sender = pc.getSenders().find(s => s.track && s.track.kind === "video");

        if (sender) {
          sender.replaceTrack(newTrack)
            .then(() => console.log(`Replaced video track for peer ${peerId}`))
            .catch(err => console.error("Replace error:", err));
        }
      }
    },

    // ============ VIDEO ON/OFF MAIN LOGIC ============
    async toggleVideo() {
      try {
        this.videoon = !this.videoon;
        console.log(`Video toggled: ${this.videoon ? "ON" : "OFF"}`);

        this.safeBroadcast("video-status", {
          roomId: this.roomId,
          userId: this.userId,
          userName: this.userName,
          isVideoOn: this.videoon
        });

        if (this.videoon) {
          // ============ TURN CAMERA ON ============
          console.log("Turning camera ON...");

          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 }
            }
          });

          const videoTrack = stream.getVideoTracks()[0];

          if (!this.localStream) {
            this.localStream = new MediaStream();
          }

          this.localStream.getVideoTracks().forEach(t => this.localStream.removeTrack(t));
          this.localStream.addTrack(videoTrack);

          const el = this.$refs.localVideo;
          el.srcObject = stream;
          await el.play().catch(() => {});

          this.replaceVideoTrack(videoTrack);

          console.log("Camera ON and broadcasting.");
        } else {
          // ============ TURN CAMERA OFF (BLACK SCREEN BROADCAST) ============
          console.log("Turning camera OFF — broadcasting black screen...");

          const blackTrack = await this.generateBlackTrack();

          // Remove real video tracks
          if (this.localStream) {
            this.localStream.getVideoTracks().forEach(t => {
              this.localStream.removeTrack(t);
              t.stop();
            });
            this.localStream.addTrack(blackTrack);
          }

          const el = this.$refs.localVideo;
          el.srcObject = this.blackStream;
          await el.play().catch(() => {});

          this.replaceVideoTrack(blackTrack);

          console.log("Black-screen broadcast active.");
        }
      } catch (err) {
      console.error("Error toggling video:", err);
      }
    },

    // ============ MICROPHONE TOGGLE ============
    async toggleMic() {
      try {
        this.micon = !this.micon;
        console.log("Mic toggled:", this.micon);

        this.safeBroadcast("mic-status", {
          roomId: this.roomId,
          userId: this.userId,
          userName: this.userName,
          isMicOn: this.micon
        });

        if (!this.localStream) return;

        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = this.micon;
        }
      } catch (err) {
        console.error("Error toggling mic:", err);
      }
    },
    // ============ RECORDING ============
    recording() {
      if (!this.isRecording) {
        console.log("Starting recording...");
        this.startRecording();
      } else {
        console.log("Stopping recording...");
        this.stopRecording();
      }
    },

    startRecording() {
      try {
        if (!this.localStream) {
          alert("No media stream available to record.");
          return;
        }

        this.mediaRecorder = new MediaRecorder(this.localStream, {
          mimeType: "video/webm; codecs=vp9"
        });

        this.recordedChunks = [];

        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            this.recordedChunks.push(e.data);
          }
        };

        this.mediaRecorder.onstop = () => {
          const blob = new Blob(this.recordedChunks, { type: "video/webm" });
          const url = URL.createObjectURL(blob);

          const a = document.createElement("a");
          a.href = url;
          a.download = `Recording_${Date.now()}.webm`;
          a.click();

          URL.revokeObjectURL(url);
        };

        this.mediaRecorder.start();
        this.isRecording = true;
        console.log("Recording started.");
      } catch (err) {
        console.error("Error starting recording:", err);
      }
    },

    stopRecording() {
      try {
        if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
          this.mediaRecorder.stop();
        }
        this.isRecording = false;
        console.log("Recording stopped.");
      } catch (err) {
        console.error("Error stopping recording:", err);
      }
    },

    // ============ NETWORK QUALITY MONITOR ============
    startNetworkCheck() {
      let lastBytes = 0;
      let lastTime = Date.now();

      this.networkCheckInterval = setInterval(() => {
        const connection =
          navigator.connection ||
          navigator.mozConnection ||
          navigator.webkitConnection;

        if (!connection) return;

        const now = Date.now();
        const elapsed = (now - lastTime) / 1000;

        const currentBytes = connection.downlink * 125000; // Convert Mbit/s → bytes/sec
        const bitrate = (currentBytes - lastBytes) / elapsed;

        lastBytes = currentBytes;
        lastTime = now;

        this.isPoorNetwork = bitrate < 50_000; // under ~0.4 Mbps
      }, 3000);
    },

    // ============ SAFE BROADCAST (QUEUES IF SOCKET DOWN) ============
    safeBroadcast(event, data) {
      if (this.socket?.connected) {
        this.socket.emit(event, data);
      } else {
        console.warn("Socket offline — queueing event:", event);
        this.broadcastQueue.push({ event, data });
      }
    },

    startBroadcastRetry() {
      if (this.broadcastRetryTimer) return;

      this.broadcastRetryTimer = setInterval(() => {
        if (this.socket?.connected && this.broadcastQueue.length > 0) {
          console.log("Retrying queued broadcasts...");
          while (this.broadcastQueue.length > 0) {
            const item = this.broadcastQueue.shift();
            this.socket.emit(item.event, item.data);
          }
        }
      }, 2000);
    },

    // ============ CLEANUP ============
    cleanup() {
      console.log("Running cleanup...");

      try {
        if (this.socket) {
          this.socket.disconnect();
          this.socket = null;
        }

        for (const peerId in this.peers) {
          this.cleanupPeer(peerId);
        }

        if (this.localStream) {
          this.localStream.getTracks().forEach(track => track.stop());
          this.localStream = null;
        }

        if (this.blackStream) {
          this.blackStream.getTracks().forEach(track => track.stop());
          this.blackStream = null;
        }

        if (this.screenStream) {
          this.screenStream.getTracks().forEach(track => track.stop());
          this.screenStream = null;
        }

        clearInterval(this.networkCheckInterval);
        clearInterval(this.broadcastRetryTimer);
        clearInterval(this.blackInterval);

        console.log("Cleanup completed.");
      } catch (err) {
        console.error("Error during cleanup:", err);
      }
    },

    // ============ LIFECYCLE ============
    async initializeMedia() {
      if (this.isInitializingMedia) return;
      this.isInitializingMedia = true;

      try {
        console.log("Initializing default media...");

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          },
          audio: true
        });

        this.localStream = stream;

        const video = this.$refs.localVideo;
        video.srcObject = stream;

        await video.play().catch(() => {});

        this.micon = true;
        this.videoon = true;
      } catch (err) {
        console.error("Error initializing media:", err);
        this.videoon = false;
        this.micon = false;
      }
    },

    async mountedSetup() {
      const ok = this.initUserFromToken();
      if (!ok) return;

      this.roomId = this.computedRoomId;

      await this.initializeMedia();
      this.initSocket();
      this.startNetworkCheck();

      window.addEventListener("mousemove", this.resetinactivityTimer);
      window.addEventListener("click", this.resetinactivityTimer);
      window.addEventListener("keypress", this.resetinactivityTimer);

      this.resetinactivityTimer();
    }
  },

  async mounted() {
    await this.mountedSetup();
  },

  beforeUnmount() {
    this.cleanup();

    window.removeEventListener("mousemove", this.resetinactivityTimer);
    window.removeEventListener("click", this.resetinactivityTimer);
    window.removeEventListener("keypress", this.resetinactivityTimer);
  }
};
</script>
<style scoped>
/* ===========================================================
   CORE LAYOUT
   =========================================================== */
#page {
  width: 100vw;
  height: 100vh;
  background: #111;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: row;
}

/* ===========================================================
   LEFT TRAY
   =========================================================== */
#left-tray {
  width: 160px;
  background: rgba(20, 20, 20, 0.9);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

#left-tray button {
  padding: 10px;
  background: #333;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.left-tray-left {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
}

.left-tray-right {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
}

.tray-hidden {
  opacity: 0;
  transition: opacity 0.3s ease;
}

/* ===========================================================
   HOST VIDEO BOX
   =========================================================== */
#host {
  width: 320px;
  height: 180px;
  border-radius: 10px;
  background: black;
  margin: 10px;
  position: relative;
  overflow: hidden;
}

#host video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-off-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: black;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* ===========================================================
   PARTICIPANTS GRID
   =========================================================== */
#participants {
  flex-grow: 1;
  padding: 10px;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 10px;
  overflow-y: auto;
}

.remote-participant {
  border-radius: 10px;
  overflow: hidden;
  background: #000;
  position: relative;
}

.remote-participant video {
  width: 280px;
  height: 160px;
  border-radius: 8px;
  object-fit: cover;
  background: black;
}

/* ===========================================================
   NAVBAR (BOTTOM TRAY)
   =========================================================== */
#navbar {
  width: 100%;
  height: 70px;
  background: rgba(25, 25, 25, 0.95);
  position: absolute;
  bottom: 0;
  left: 0;
  display: flex;
  padding: 0 12px;
  align-items: center;
  justify-content: space-between;
  z-index: 20;
}

#navbar ul {
  list-style: none;
  display: flex;
  gap: 12px;
  align-items: center;
}

#navbar button {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #222;
  border: none;
  color: white;
  cursor: pointer;
}

#navbar button.active {
  background: #444;
}

/* tooltip */
.tooltip {
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 6px;
  border-radius: 6px;
  font-size: 12px;
  position: absolute;
  bottom: 58px;
}

/* ===========================================================
   RIGHT PANEL (CHAT + PARTICIPANTS)
   =========================================================== */
#list-box,
#chat-box {
  position: absolute;
  right: 10px;
  bottom: 80px;
  width: 300px;
  max-height: 70%;
  background: rgba(25, 25, 25, 0.95);
  border-radius: 12px;
  padding: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.list-header,
.chat-header {
  font-size: 16px;
  font-weight: bold;
  color: white;
  padding-bottom: 6px;
  display: flex;
  justify-content: space-between;
}

.list-body,
.chat-body {
  flex-grow: 1;
  overflow-y: auto;
  padding: 6px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
}

.message {
  padding: 6px 0;
  border-bottom: 1px solid #444;
}

.message-header {
  font-size: 12px;
  font-weight: bold;
  color: #ddd;
}

.message-text {
  font-size: 14px;
  color: #fff;
}

.chat-input-section {
  display: flex;
  margin-top: 8px;
  gap: 6px;
}

.chat-input {
  flex-grow: 1;
  padding: 8px;
  border-radius: 8px;
  border: none;
}

.chat-send {
  padding: 8px 14px;
  border-radius: 8px;
  border: none;
  background: #333;
  color: white;
}

/* notification badge */
.message-badge {
  background: red;
  color: white;
  padding: 3px 6px;
  font-size: 10px;
  border-radius: 50%;
  position: absolute;
  top: -4px;
  right: -4px;
}

/* ===========================================================
   TRANSITION EFFECTS
   =========================================================== */
.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.3s ease;
}

.slide-left-enter-from {
  transform: translateX(-100%);
}

.slide-left-leave-to {
  transform: translateX(-100%);
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: opacity 0.3s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
}

/* ===========================================================
   MOBILE RESPONSIVE FIXES
   =========================================================== */
@media (max-width: 900px) {
  #navbar {
    height: 64px;
    padding: 0 6px;
  }

  #navbar button {
    width: 44px;
    height: 44px;
  }

  #list-box,
  #chat-box {
    width: 260px;
    max-height: 60%;
    right: 8px;
    bottom: 72px;
  }

  #participants {
    justify-content: center;
  }

  .remote-participant video {
    width: 240px;
    height: 140px;
  }
}

@media (max-width: 600px) {
  #host {
    width: 240px;
    height: 140px;
  }

  #participants {
    padding: 4px;
    gap: 6px;
  }

  .remote-participant video {
    width: 200px;
    height: 120px;
  }

  #navbar {
    height: 60px;
  }
}

/* ===========================================================
   EXTRA — STATUS INDICATOR ICONS
   =========================================================== */
.status-indicator span {
  font-size: 16px;
  color: white;
}
</style>
