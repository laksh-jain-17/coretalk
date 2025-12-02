<template>
  <div :class="{'tray-on-right':!turned, 'tray-hidden':!trayVisible}" id="page">
    <transition name="slide-left">
      <div id="left-tray" :class="[turned ? 'left-tray-left' : 'left-tray-right', {'mobile-hidden': !trayVisible}]" v-if="trayVisible">
        <button @click="silent_background">Silent Background</button>
        <button @click="recording">{{ isRecording ? 'Stop Recording' : 'Start Recording' }}</button>
        <button @click="turn">Change Panel</button>
      </div>
    </transition>
    
    <div id="main-content" @click="handleContentClick">
      <div id="host">
        <video ref="localVideo" autoplay muted playsinline></video>
        <div v-if="!videoon" class="local-avatar">
          <div class="avatar-circle">{{ userName ? userName.charAt(0).toUpperCase() : 'Y' }}</div>
          <p>{{ userName || 'You' }}</p>
        </div>
        <div class="host-label">{{ userName || 'You' }} {{ isHost ? '(Host)' : '' }}</div>
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
          <li class="desktop-only">
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
              class="leave-btn"
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
              <div class="chat-header">
                Chat
                <button @click="togglePanel(null)">X</button>
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
            <ul v-if="hoveredIcon === 'extras'" class="tooltip">
              <li>More</li>
            </ul>
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
              <li v-if="isHost" @click.stop="lockMeeting">Lock Meeting</li>
              <li v-if="isHost" @click.stop="muteAll">Mute All</li>
              <li v-if="isHost" @click.stop="endMeeting">End Meeting</li>
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
    handleContentClick() {
        // Close menus when clicking background
        if(window.innerWidth < 768) {
            this.activePanel = null;
            this.activeDropdown = null;
        }
    },

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
        this.userId = decoded.id || decoded.userId || decoded.user?.id || `user_${Date.now()}`;
        
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
          this.userName = emailParts[0] || `User-${this.userId.substring(0, 8)}`;
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
        this.isHost = role === 'host';
      });

      this.socket.on('participants-list', (list) => {
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

      // ============ COMMUNICATION EVENTS ============
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

    // ============ BROADCAST MANAGEMENT ============
    startBroadcastRetry() {
      if (this.broadcastRetryTimer) {
        clearInterval(this.broadcastRetryTimer);
      }
      this.broadcastRetryTimer = setInterval(() => {
        if (this.broadcastQueue.length > 0 && this.isSocketConnected) {
          this.processQueuedBroadcasts();
        }
      }, 2000);
    },

    processQueuedBroadcasts() {
      if (!this.isSocketConnected || !this.socket?.connected) return;
      const toProcess = [...this.broadcastQueue];
      this.broadcastQueue = [];
      for (const broadcast of toProcess) {
        try {
          this.socket.emit(broadcast.event, broadcast.data);
        } catch (error) {
          this.broadcastQueue.push(broadcast);
        }
      }
    },

    safeBroadcast(event, data) {
      if (this.socket && this.socket.connected && this.isSocketConnected) {
        try {
          this.socket.emit(event, data);
          return true;
        } catch (error) {
          this.broadcastQueue.push({ event, data });
          return false;
        }
      } else {
        this.broadcastQueue.push({ event, data });
        return false;
      }
    },

    broadcastVideoStatus(isVideoOn) {
      const data = { roomId: this.roomId, userId: this.userId, userName: this.userName, isVideoOn: isVideoOn };
      this.safeBroadcast('video-status', data);
    },

    broadcastMicStatus(isMicOn) {
      const data = { roomId: this.roomId, userId: this.userId, userName: this.userName, isMicOn: isMicOn };
      this.safeBroadcast('mic-status', data);
    },

    // ============ MEDIA CONTROLS ============
    async toggleMic() {
      if (this.isInitializingMedia) return;
      this.isInitializingMedia = true;

      try {
        if (this.micon) {
          if (this.localStream) {
            this.localStream.getAudioTracks().forEach(track => {
              track.stop();
              this.localStream.removeTrack(track);
            });
          }
          for (const peerId in this.peers) {
            const pc = this.peers[peerId];
            const audioSender = pc.getSenders().find(s => s.track?.kind === 'audio');
            if (audioSender) pc.removeTrack(audioSender);
          }
          this.micon = false;
          this.broadcastMicStatus(false);
        } else {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
          });
          const audioTrack = audioStream.getAudioTracks()[0];
          if (!this.localStream) this.localStream = new MediaStream();
          this.localStream.addTrack(audioTrack);
          
          for (const peerId in this.peers) {
            const pc = this.peers[peerId];
            pc.addTrack(audioTrack, this.localStream);
            await this.renegotiateConnection(peerId);
          }
          this.micon = true;
          this.broadcastMicStatus(true);
        }
      } catch (error) {
        console.error('Error accessing microphone:', error);
        alert('Could not access microphone.');
        this.micon = false;
      } finally {
        this.isInitializingMedia = false;
      }
    },

    async toggleVideo() {
      if (this.isInitializingMedia) return;
      this.isInitializingMedia = true;

      try {
        if (this.videoon) {
          // Turn OFF
          if (this.localStream) {
            this.localStream.getVideoTracks().forEach(track => {
              track.stop();
              this.localStream.removeTrack(track);
            });
          }
          const videoElement = this.$refs.localVideo;
          if (videoElement) {
            videoElement.srcObject = null;
          }
          
          for (const peerId in this.peers) {
            const pc = this.peers[peerId];
            const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (videoSender) pc.removeTrack(videoSender);
          }
          this.videoon = false;
          this.broadcastVideoStatus(false);
        } else {
          // Turn ON
          const videoStream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } }
          });
          const videoTrack = videoStream.getVideoTracks()[0];
          if (!this.localStream) this.localStream = new MediaStream();
          this.localStream.addTrack(videoTrack);
          
          const videoElement = this.$refs.localVideo;
          if (videoElement) {
            videoElement.srcObject = this.localStream;
            videoElement.muted = true;
            await videoElement.play();
          }
          
          for (const peerId in this.peers) {
            const pc = this.peers[peerId];
            pc.addTrack(videoTrack, this.localStream);
            await this.renegotiateConnection(peerId);
          }
          this.videoon = true;
          this.broadcastVideoStatus(true);
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Could not access camera.');
        this.videoon = false;
      } finally {
        this.isInitializingMedia = false;
      }
    },

    // ============ WEBRTC PEER MANAGEMENT ============
    async createPeerConnection(remoteId, isInitiator = false) {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ],
        iceCandidatePoolSize: 10
      });

      pc.onicecandidate = (event) => {
        if (event.candidate && this.isSocketConnected) {
          try {
            this.socket.emit('signal', { to: remoteId, signal: { candidate: event.candidate } });
          } catch (error) { console.error(error); }
        }
      };

      pc.ontrack = (event) => {
        const stream = event.streams[0];
        if (stream) {
          this.handleRemoteStream(remoteId, stream);
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'failed') pc.restartIce();
        if (pc.iceConnectionState === 'disconnected') {
          setTimeout(() => {
            if (pc.iceConnectionState === 'disconnected') this.cleanupPeer(remoteId);
          }, 10000);
        }
      };

      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          pc.addTrack(track, this.localStream);
        });
      }

      this.peers[remoteId] = pc;
      this.peerNegotiating[remoteId] = false;
      return pc;
    },

    async handleOffer(from, offer) {
      try {
        let pc = this.peers[from];
        if (!pc) pc = await this.createPeerConnection(from, false);
        
        if (pc.signalingState !== 'stable') await new Promise(resolve => setTimeout(resolve, 100));
        if (pc.signalingState === 'have-local-offer') await pc.setLocalDescription({ type: 'rollback' });

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        
        if (this.pendingCandidates[from]) {
          for (const candidate of this.pendingCandidates[from]) {
            try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) {}
          }
          delete this.pendingCandidates[from];
        }
        
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        if (this.isSocketConnected) {
          this.socket.emit('signal', { to: from, signal: { type: 'answer', sdp: pc.localDescription } });
        }
      } catch (err) { console.error(err); }
    },

    async handleAnswer(from, answer) {
      try {
        const pc = this.peers[from];
        if (!pc) return;

        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          if (this.pendingCandidates[from]) {
            for (const candidate of this.pendingCandidates[from]) {
              try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) {}
            }
            delete this.pendingCandidates[from];
          }
          this.peerNegotiating[from] = false;
        }
      } catch (err) { console.error(err); }
    },

    async handleIceCandidate(from, candidate) {
      try {
        const pc = this.peers[from];
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          if (!this.pendingCandidates[from]) this.pendingCandidates[from] = [];
          this.pendingCandidates[from].push(candidate);
        }
      } catch (err) { console.error(err); }
    },

    handleRemoteStream(remoteId, stream) {
      let wrapper = document.querySelector(`[data-peer-id="${remoteId}"]`);
      
      // FIX: Don't remove wrapper just because track count is 0 initially
      // We need the box for the participant list/status
      
      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.setAttribute('data-peer-id', remoteId);
        wrapper.className = 'remote-participant';
        wrapper.style.cssText = `
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          margin: 8px;
          border-radius: 8px;
          padding: 8px;
          background-color: #2a2a2a;
          position: relative;
          overflow: hidden;
          min-width: 150px;
        `;

        // Video Element
        const vid = document.createElement('video');
        vid.autoplay = true;
        vid.playsInline = true;
        vid.muted = false;
        vid.className = 'remote-video';
        // Basic styles, CSS class handles responsive
        vid.style.cssText = `
            border-radius: 8px;
            object-fit: cover;
            background-color: #000;
            width: 100%;
            height: 100%;
        `;

        // Avatar / Placeholder (For Black Screen fix)
        const participant = this.participants.find(p => p.id === remoteId);
        const pName = participant?.name || `User`;
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'remote-avatar';
        avatarDiv.style.cssText = `
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background-color: #111;
            z-index: 2;
            display: none; /* Hidden by default if video exists */
        `;
        avatarDiv.innerHTML = `
            <div style="width: 60px; height: 60px; background: #555; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; margin-bottom: 5px;">
                ${pName.charAt(0).toUpperCase()}
            </div>
            <span>${pName}</span>
        `;

        // Label (Name tag overlaid)
        const label = document.createElement('div');
        label.textContent = pName;
        label.className = 'participant-label';
        label.style.cssText = `
          position: absolute;
          bottom: 10px;
          left: 10px;
          background: rgba(0,0,0,0.6);
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          z-index: 5;
        `;

        wrapper.appendChild(vid);
        wrapper.appendChild(avatarDiv); // Add avatar
        wrapper.appendChild(label);
        
        this.remoteVideos[remoteId] = vid;
        if (this.$refs.participantsBox) {
          this.$refs.participantsBox.appendChild(wrapper);
        }
      }

      const vid = wrapper.querySelector('video');
      if (vid && stream) {
        vid.srcObject = stream;
        vid.play().catch(e => console.warn(e));
      }
      
      // Update visibility based on current known status
      const participant = this.participants.find(p => p.id === remoteId);
      if (participant) {
          this.updateVideoVisibility(remoteId, participant.hasVideo);
      }
    },

    updateVideoVisibility(userId, isVideoOn) {
        const wrapper = document.querySelector(`[data-peer-id="${userId}"]`);
        if (wrapper) {
            const vid = wrapper.querySelector('video');
            const avatar = wrapper.querySelector('.remote-avatar');
            
            if (isVideoOn) {
                if(vid) vid.style.opacity = '1';
                if(avatar) avatar.style.display = 'none';
            } else {
                // Video is OFF: Show Black Screen / Avatar
                if(vid) vid.style.opacity = '0'; // Hide video element but keep layout
                if(avatar) avatar.style.display = 'flex'; // Show avatar
            }
        }
    },

    async startOffer(remoteId) {
      if (remoteId === this.socket?.id || remoteId === this.userId) return;
      try {
        const pc = await this.createPeerConnection(remoteId, true);
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await pc.setLocalDescription(offer);
        if (this.isSocketConnected) {
          this.socket.emit('signal', { to: remoteId, signal: { type: 'offer', sdp: offer } });
        }
      } catch (err) { console.error(err); }
    },

    cleanupPeer(peerId) {
      if (this.peers[peerId]) {
        try { this.peers[peerId].close(); } catch (e) {}
        delete this.peers[peerId];
      }
      if (this.peerNegotiating[peerId]) delete this.peerNegotiating[peerId];
      if (this.pendingCandidates[peerId]) delete this.pendingCandidates[peerId];

      const wrapper = document.querySelector(`[data-peer-id="${peerId}"]`);
      if (wrapper && wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
      if (this.remoteVideos[peerId]) delete this.remoteVideos[peerId];
    },

    // ============ PARTICIPANT MANAGEMENT ============
    updateParticipantsList(list) {
      const participantsMap = new Map();
      for (const p of list || []) {
        if (!p || !p.id || p.id === this.socket?.id || p.id === this.userId) continue;
        let displayName = p.name || p.userName || p.username;
        if (displayName && displayName.includes('@')) displayName = displayName.split('@')[0];
        if (!displayName) displayName = `User-${p.id.substring(0, 8)}`;
        
        participantsMap.set(p.id, {
          id: p.id,
          name: displayName,
          isHost: p.isHost || false,
          hasMic: p.hasMic || false,
          hasVideo: p.hasVideo || false
        });
      }
      this.participants = Array.from(participantsMap.values());
    },

    addParticipant(user) {
      if (!user || !user.id || user.id === this.socket?.id || user.id === this.userId) return;
      const existingIndex = this.participants.findIndex(p => p.id === user.id);
      let displayName = user.name || user.userName || user.username || 'Anonymous';
      if (displayName && displayName.includes('@')) displayName = displayName.split('@')[0];
      
      const participantData = {
        id: user.id,
        name: displayName,
        isHost: user.isHost || false,
        hasMic: user.hasMic || false,
        hasVideo: user.hasVideo || false
      };
      
      if (existingIndex >= 0) this.participants[existingIndex] = participantData;
      else this.participants.push(participantData);
    },

    updateParticipantStatus(userId, statusType, isEnabled) {
      const participant = this.participants.find(p => p.id === userId);
      if (participant) {
        if (statusType === 'video') {
          participant.hasVideo = isEnabled;
          // FIX: Do NOT remove wrapper here. Just update visibility.
          this.updateVideoVisibility(userId, isEnabled);
        } else if (statusType === 'mic') {
          participant.hasMic = isEnabled;
        } else if (statusType === 'screenShare') {
          participant.isScreenSharing = isEnabled;
        }
        this.$forceUpdate();
      }
      
      // Update status indicators icons
      const wrapper = document.querySelector(`[data-peer-id="${userId}"]`);
      if (wrapper) {
        let indicator = wrapper.querySelector('.status-indicator');
        if (!indicator) {
          indicator = document.createElement('div');
          indicator.className = 'status-indicator';
          indicator.style.cssText = `
            position: absolute;
            top: 8px; right: 8px;
            display: flex; gap: 4px;
            background: rgba(0,0,0,0.5);
            padding: 4px; border-radius: 4px; z-index: 10;
          `;
          wrapper.appendChild(indicator);
        }
        indicator.innerHTML = `
          <span>${participant?.hasMic ? '🎤' : '🔇'}</span>
          <span>${participant?.isScreenSharing ? '🖥️' : ''}</span>
        `;
      }
    },

    // ============ UI CONTROLS ============
    togglePanel(panel) {
      this.activePanel = this.activePanel === panel ? null : panel;
      this.activeDropdown = null;
      if (panel === 'chat') this.unreadMessages = 0;
    },

    setHover(icon) { this.hoveredIcon = icon; },
    toggleDropdown(type) { this.activeDropdown = this.activeDropdown === type ? null : type; this.activePanel = null; },
    closeDropdown() { this.activeDropdown = null; },

    resetinactivityTimer() {
      this.trayVisible = true;
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = setTimeout(() => {
        this.trayVisible = false;
      }, 5000);
    },

    turn() { this.turned = !this.turned; },

    // ============ CHAT & HAND RAISE ============
    sendMessage() {
      const text = (this.newMessage || '').trim();
      if (!text) return;
      const message = { sender: this.userName, text: text, timestamp: Date.now() };
      this.safeBroadcast('chat-message', { roomId: this.roomId, ...message });
      this.newMessage = '';
      this.$nextTick(() => {
        const chatBody = this.$refs.chatBody;
        if (chatBody) chatBody.scrollTop = chatBody.scrollHeight;
      });
    },

    hand_raised() {
      this.hand = !this.hand;
      this.safeBroadcast('hand-raised', { roomId: this.roomId, userId: this.userId, userName: this.userName, isRaised: this.hand });
    },

    // ============ MEETING INFO ============
    toggle_info() { this.show_info = !this.show_info; },
    close_info() { this.show_info = false; },
    copystring() {
      const meetingLink = window.location.href;
      navigator.clipboard.writeText(meetingLink)
        .then(() => alert("Meeting link copied!"))
        .catch(err => {
          const textArea = document.createElement('textarea');
          textArea.value = meetingLink;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          alert("Meeting link copied!");
        });
    },

    leave() {
      this.cleanup();
      this.$router.push('/Ending');
    },

    // ============ HOST CONTROLS ============
    async endMeeting() {
      if (!this.isHost) { alert("Only host can end"); return; }
      try {
        const res = await fetch("http://localhost:5000/api/end-meeting", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId: this.roomId })
        });
        if (res.ok) { this.cleanup(); this.$router.push('/Ending'); }
      } catch(err) { console.error(err); }
    },

    async muteAll() {
      if (!this.isHost) { alert("Only host can mute all"); return; }
      try {
        await fetch("http://localhost:5000/api/mute-all", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId: this.roomId })
        });
      } catch(err) { console.error(err); }
    },

    async lockMeeting() {
      if (!this.isHost) { alert("Only host can lock"); return; }
      try {
        const res = await fetch("http://localhost:5000/api/lock-meeting", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId: this.roomId })
        });
        if (res.ok) alert("Meeting locked");
      } catch(err) { console.error(err); }
    },

    // ============ SCREEN SHARING ============
    async sharescreen() {
      try {
        if (!this.isScreenSharing) {
          const stream = await navigator.mediaDevices.getDisplayMedia({ 
            video: { cursor: "always" }, audio: false 
          });
          this.screenStream = stream;
          this.screenTrack = stream.getVideoTracks()[0];
          
          const el = this.$refs.localVideo;
          if (el) { el.srcObject = stream; await el.play(); }

          for (const peerId in this.peers) {
            const pc = this.peers[peerId];
            const senders = pc.getSenders();
            const videoSender = senders.find(s => s.track?.kind === 'video');
            if (videoSender && videoSender.track) {
              await videoSender.replaceTrack(this.screenTrack);
            } else {
              pc.addTrack(this.screenTrack, stream);
              await this.renegotiateConnection(peerId);
            }
          }
          
          this.screenTrack.onended = () => { this.stopScreenShare(); };
          this.isScreenSharing = true;
          this.broadcastScreenShareStatus(true);
        } else {
          await this.stopScreenShare();
        }
      } catch (err) {
        console.error("Error sharing screen:", err);
        this.isScreenSharing = false;
      }
    },

    async stopScreenShare() {
      try {
        if (this.screenTrack) { this.screenTrack.stop(); this.screenTrack = null; }
        if (this.screenStream) { this.screenStream.getTracks().forEach(t => t.stop()); this.screenStream = null; }

        if (this.videoon) {
          const videoStream = await navigator.mediaDevices.getUserMedia({ 
             video: { width: { ideal: 640 }, height: { ideal: 480 } }
          });
          const videoTrack = videoStream.getVideoTracks()[0];
          const el = this.$refs.localVideo;
          if (el) { el.srcObject = videoStream; await el.play(); }
          
          if (!this.localStream) this.localStream = new MediaStream();
          this.localStream.getVideoTracks().forEach(track => this.localStream.removeTrack(track));
          this.localStream.addTrack(videoTrack);

          for (const peerId in this.peers) {
            const pc = this.peers[peerId];
            const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (videoSender) await videoSender.replaceTrack(videoTrack);
            else {
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
            if (videoSender) await videoSender.replaceTrack(null);
          }
        }
        this.isScreenSharing = false;
        this.broadcastScreenShareStatus(false);
      } catch (err) { console.error(err); this.isScreenSharing = false; }
    },

    broadcastScreenShareStatus(isSharing) {
      const data = { roomId: this.roomId, userId: this.userId, userName: this.userName, isScreenSharing: isSharing };
      this.safeBroadcast('screen-share-status', data);
    },

    async renegotiateConnection(peerId) {
      const pc = this.peers[peerId];
      if (!pc || this.peerNegotiating[peerId]) return;

      try {
        this.peerNegotiating[peerId] = true;
        if (pc.signalingState !== 'stable') await new Promise(resolve => setTimeout(resolve, 500));
        
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await pc.setLocalDescription(offer);
        
        if (this.isSocketConnected) {
          this.socket.emit('signal', { to: peerId, signal: { type: 'offer', sdp: offer } });
        }
      } catch (err) { console.error(err); }
      finally { setTimeout(() => { this.peerNegotiating[peerId] = false; }, 2000); }
    },

    // ============ RECORDING ============
    async recording() {
      if (!this.isHost) { alert("Only host can record"); return; }
      this.record = !this.record;
      if(this.record) {
        try {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
          this.recordedChunks = [];
          this.mediaRecorder = new MediaRecorder(screenStream, {mimeType: "video/webm"});
          this.mediaRecorder.ondataavailable = (e) => { if(e.data && e.data.size > 0) this.recordedChunks.push(e.data); };
          this.mediaRecorder.onstop = () => {
            const blob = new Blob(this.recordedChunks, {type:"video/webm"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = `meeting-${Date.now()}.webm`; a.click();
            URL.revokeObjectURL(url);
          };
          this.mediaRecorder.start();
          this.isRecording = true;
        } catch(err) { console.error(err); this.record = false; }
      } else {
        if(this.mediaRecorder && this.isRecording) { this.mediaRecorder.stop(); this.isRecording = false; }
      }
    },

    async silent_background() {
      if (!this.isHost) { alert("Only host can use silent background"); return; }
      alert("Silent background - Work in progress");
    },

    // ============ CLEANUP ============
    cleanup() {
      if (this.broadcastRetryTimer) clearInterval(this.broadcastRetryTimer);
      for (const id in this.peers) { try { this.peers[id].close(); } catch (e) {} }
      this.peers = {};
      this.remoteVideos = {};
      
      if (this.localStream) this.localStream.getTracks().forEach(t => t.stop());
      if (this.screenStream) this.screenStream.getTracks().forEach(t => t.stop());
      if (this.mediaRecorder && this.isRecording) this.mediaRecorder.stop();
      if (this.socket) this.socket.disconnect();
      if (this.networkCheckInterval) clearInterval(this.networkCheckInterval);
      if (this.recognition) this.recognition.stop();
      
      this.localStream = null;
      this.socket = null;
    }
  },

  beforeUnmount() {
    this.cleanup();
    document.removeEventListener("mousemove", this.resetinactivityTimer);
    document.removeEventListener("click", this.resetinactivityTimer);
  },

  async mounted() {
    if (!this.initUserFromToken()) return;
    this.roomId = this.computedRoomId;
    this.localStream = new MediaStream();
    this.initSocket();
    
    // Setup transcript
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.onresult = (event) => {
            const transcript = event.results[event.resultIndex][0].transcript;
            this.transcript.push(transcript);
        };
    }

    this.resetinactivityTimer();
    document.addEventListener("mousemove", this.resetinactivityTimer);
    document.addEventListener("click", this.resetinactivityTimer);
  }
};
</script>

<style>
/* Base Styles */
body {
  background-color: #222021;
  margin: 0;
  font-family: Arial, sans-serif;
  color: white;
}
#page {
  display: flex;
  height: 100vh;
  overflow: hidden;
  position: relative;
}

/* Left Tray */
#left-tray {
  width: 200px;
  background-color: #333;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  box-shadow: 2px 0 5px rgba(0,0,0,0.3);
  position: fixed;
  top: 0; bottom: 0;
  transition: transform 0.4s ease, left 0.4s ease, right 0.4s ease;
  z-index: 20;
}
.left-tray-left { left: 0; right: auto; }
.left-tray-right { right: 0; left: auto; }

#left-tray button {
  background-color: #444;
  color: white;
  border: none;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
}
#left-tray button:hover { background-color: #555; }

/* Main Content Area */
#main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  box-sizing: border-box;
  transition: margin 0.4s ease;
  width: 100%;
}

/* Logic for shifting content based on tray */
#page:not(.tray-on-right):not(.tray-hidden) #main-content { margin-left: 200px; margin-right: 0; }
#page.tray-on-right:not(.tray-hidden) #main-content { margin-right: 200px; margin-left: 0; }
#page.tray-hidden #main-content { margin: 0; }

/* Host Video Area */
#host {
  flex: 3;
  background-color: #000;
  border-radius: 10px;
  margin-bottom: 20px;
  /* padding-bottom removed for better fit */
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}
#host video {
  width: 100%;
  height: 100%;
  object-fit: contain; /* changed from cover so video isn't cropped */
  background-color: #000;
}
.local-avatar {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: white;
  z-index: 2;
}
.avatar-circle {
  width: 80px; height: 80px;
  background: #555;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 30px; margin-bottom: 10px;
}
.host-label {
    position: absolute;
    bottom: 10px; left: 10px;
    background: rgba(0,0,0,0.6);
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 14px;
    z-index: 5;
}

/* Participants Area */
#participants {
  flex: 1;
  background-color: #3a3f47;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  padding: 10px;
  margin-bottom: 70px; /* Space for navbar */
  overflow-x: auto;
  overflow-y: hidden;
}

/* Remote Participant Box Styling */
.remote-participant {
    /* Styles handled in JS mostly, but key overrides here */
    background: #000;
    min-width: 200px;
    height: 150px;
    position: relative;
}
.remote-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

/* Navbar */
#navbar {
  position: fixed;
  bottom: 0; left: 0;
  width: 100%;
  background-color: #1f1f1f;
  height: 70px;
  border-top: 1px solid #444;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  box-sizing: border-box;
  z-index: 50;
}
#navbar ul { display: flex; list-style: none; margin: 0; padding: 0; gap: 10px; }
#navbar li button {
  background-color: white;
  color: black;
  border: none;
  border-radius: 10px;
  padding: 10px;
  cursor: pointer;
  min-width: 50px; /* Smaller default for mobile */
  display: flex; align-items: center; justify-content: center;
}
#navbar li button:hover { background-color: #ddd; }
#navbar li button.active { background-color: #ea4335; color: white; } /* Red for active hangup/mute if needed, or customize */
.leave-btn { background-color: #ea4335 !important; color: white !important; }

/* Panels (Chat/List) */
#chat-box, #list-box {
  position: fixed;
  bottom: 70px;
  right: 0;
  width: 320px;
  height: calc(100vh - 70px);
  background-color: #f8f9fa;
  border-left: 1px solid #ccc;
  display: flex; flex-direction: column;
  z-index: 60;
  color: #222;
}
.chat-header, .list-header {
  padding: 15px;
  background: #e8eaed;
  display: flex; justify-content: space-between;
  border-bottom: 1px solid #ccc;
  color: #000;
  font-weight: bold;
}
.chat-body, .list-body { flex: 1; padding: 10px; overflow-y: auto; }
.message { background: white; padding: 8px; border-radius: 5px; margin-bottom: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
.chat-input-section { padding: 10px; display: flex; background: #eee; }
.chat-input { flex: 1; padding: 8px; border-radius: 4px; border: 1px solid #ccc; }
.chat-send { margin-left: 5px; padding: 8px 15px; background: #1a73e8; color: white; border: none; border-radius: 4px; }

/* Dropdowns & Tooltips */
.dropdown-menu {
    position: absolute; bottom: 60px; right: 0;
    background: #333; color: white;
    list-style: none; padding: 5px 0; border-radius: 5px;
    width: 150px;
}
.dropdown-menu li { padding: 10px; cursor: pointer; }
.dropdown-menu li:hover { background: #444; }
.tooltip {
    position: absolute; bottom: 65px; left: 50%; transform: translateX(-50%);
    background: black; padding: 5px 10px; border-radius: 4px; font-size: 12px;
    white-space: nowrap; pointer-events: none;
}

/* Info Box */
#info_box {
    position: fixed; bottom: 80px; right: 20px;
    background: white; color: black; padding: 15px;
    border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.3);
    z-index: 70;
}

/* =========================================
   MOBILE RESPONSIVENESS (Media Queries)
   ========================================= */
@media (max-width: 768px) {
    /* 1. Layout Adjustments */
    #page {
        flex-direction: column;
    }
    
    /* 2. Tray Behavior (Drawer style) */
    #left-tray {
        width: 100%; /* Full width */
        height: auto;
        bottom: auto;
        top: 0;
        padding: 10px;
        flex-direction: row;
        justify-content: space-around;
        transform: translateY(0);
    }
    #left-tray.mobile-hidden {
        transform: translateY(-100%); /* Slide up to hide */
    }
    
    /* 3. Main Content Full Width always */
    #page:not(.tray-on-right):not(.tray-hidden) #main-content,
    #page.tray-on-right:not(.tray-hidden) #main-content {
        margin: 0;
        margin-top: 60px; /* Space for tray */
    }
    #main-content {
        padding: 10px;
        padding-bottom: 80px; /* Space for navbar */
    }

    /* 4. Navbar Compactness */
    #navbar {
        padding: 0 10px;
        height: 60px;
    }
    #navbar ul { gap: 5px; }
    #navbar li button {
        min-width: 40px;
        padding: 8px;
    }
    
    /* Hide Screen Share on Mobile */
    .desktop-only { display: none; }
    
    /* 5. Full Screen Panels */
    #chat-box, #list-box {
        width: 100%;
        height: calc(100vh - 60px); /* Leave room for navbar */
        bottom: 60px;
        right: 0;
        border-left: none;
    }

    /* 6. Video Grid Adjustments */
    #host {
        flex: 2; /* Take less vertical space */
        margin-bottom: 10px;
    }
    #participants {
        flex: 1;
        overflow-x: scroll; /* Horizontal scroll for peers */
        flex-wrap: nowrap;
        justify-content: flex-start;
    }
    
    /* 7. Info Box & Hand Warning */
    #info_box {
        width: 90%;
        right: 5%;
        bottom: 80px;
    }
    #hand_warning {
        right: 10px; left: 10px; width: auto;
    }
    
    /* 8. Transcript Box */
    .transcript-box {
        bottom: 70px; left: 10px; right: 10px; max-width: none;
    }
}
</style>
