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
        <div v-if="!videoon" class="video-off-indicator">{{ userName || 'Host' }}</div>
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
      socketReady: false,
      participants: [],
      participantVideoStatus: {},
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
      
      broadcastQueue: [],
      broadcastRetryTimer: null,
      statusBroadcastTimer: null,
      isInitializingMedia: false,
      pendingBroadcasts: new Set()
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
      
      this.socket = io(`${import.meta.env.VITE_API_URL}`, {
        transports: ['websocket'],
        upgrade: true,
        timeout: 20000,
        forceNew: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5
      });

      this.socket.on('connect', () => {
        console.log('✅ Socket connected:', this.socket.id);
        
        this.isSocketConnected = true;
        this.socketReady = false;
        
        const joinData = { 
          roomId: this.roomId, 
          userName: this.userName,
          userId: this.userId,
          isHost: this.isHost
        };
        
        console.log('Joining room:', joinData);
        this.socket.emit('join-room', joinData);
        
        setTimeout(() => {
          this.socketReady = true;
          console.log('✅ Socket marked as ready');
          this.startBroadcastProcessing();
        }, 1000);
      });

      this.socket.on('connect_error', (err) => {
        console.error('❌ Socket connect error:', err.message);
        this.isSocketConnected = false;
        this.socketReady = false;
      });

      this.socket.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
        this.isSocketConnected = false;
        this.socketReady = false;
        
        if (reason === 'io server disconnect') {
          setTimeout(() => {
            if (!this.socket?.connected) {
              this.socket.connect();
            }
          }, 1000);
        }
      });
      
      this.socket.on('reconnect', (attemptNumber) => {
        console.log('✅ Socket reconnected after', attemptNumber, 'attempts');
        this.isSocketConnected = true;
        this.socketReady = false;
        
        const joinData = { 
          roomId: this.roomId, 
          userName: this.userName,
          userId: this.userId,
          isHost: this.isHost
        };
        this.socket.emit('join-room', joinData);
        
        setTimeout(() => {
          this.socketReady = true;
          console.log('✅ Socket ready after reconnect');
          this.broadcastCurrentStatus();
          this.startBroadcastProcessing();
        }, 1000);
      });

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
            this.broadcastCurrentStatus();
          }, 1500);
        }
      });

      this.socket.on('user-left', (userId) => {
        console.log('User left:', userId);
        this.cleanupPeer(userId);
        this.participants = this.participants.filter(p => p.id !== userId && p.socketId !== userId);
        delete this.participantVideoStatus[userId];
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
        
        setTimeout(() => {
          this.broadcastCurrentStatus();
        }, 2000);
      });

      this.socket.on('signal', async ({ from, signal }) => {
        if (signal.type === 'offer') {
          await this.handleOffer(from, signal.sdp);
        } else if (signal.type === 'answer') {
          await this.handleAnswer(from, signal.sdp);
        } else if (signal.candidate) {
          await this.handleIceCandidate(from, signal.candidate);
        }
      });

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

      this.socket.on('video-status', ({ userId, userName, isVideoOn }) => {
        console.log(`📹 Received video-status: ${userName} -> ${isVideoOn ? 'ON' : 'OFF'}`);
        
        this.participantVideoStatus[userId] = isVideoOn;
        this.updateParticipantStatus(userId, 'video', isVideoOn);
        
        const participant = this.participants.find(p => p.userId === userId);
        const socketId = participant?.socketId || participant?.id;
        
        if (socketId) {
          this.$nextTick(() => {
            this.updateRemoteVideoDisplay(socketId, isVideoOn);
          });
        }
      });

      this.socket.on('mic-status', ({ userId, userName, isMicOn }) => {
        console.log(`🎤 ${userName} mic: ${isMicOn ? 'ON' : 'OFF'}`);
        this.updateParticipantStatus(userId, 'mic', isMicOn);
      });

      this.socket.on('screen-share-status', ({ userId, userName, isScreenSharing }) => {
        console.log(`🖥️ ${userName} ${isScreenSharing ? 'started' : 'stopped'} screen sharing`);
        this.updateParticipantStatus(userId, 'screenShare', isScreenSharing);
      });

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
    },

    updateRemoteVideoDisplay(socketId, isVideoOn) {
      const wrapper = document.querySelector(`[data-peer-id="${socketId}"]`);
      
      if (!wrapper) {
        console.log(`⚠️ No wrapper found for ${socketId}, will retry...`);
        setTimeout(() => {
          const retryWrapper = document.querySelector(`[data-peer-id="${socketId}"]`);
          if (retryWrapper) {
            this.updateRemoteVideoDisplay(socketId, isVideoOn);
          }
        }, 500);
        return;
      }
      
      const vid = wrapper.querySelector('video');
      let placeholder = wrapper.querySelector('.video-placeholder');
      
      console.log(`🔄 Updating display for ${socketId}: video ${isVideoOn ? 'ON' : 'OFF'}`);
      
      if (isVideoOn) {
        if (vid) {
          vid.style.display = 'block';
          console.log(`✅ Showing video for ${socketId}`);
        }
        if (placeholder) {
          placeholder.style.display = 'none';
        }
      } else {
        if (vid) {
          vid.style.display = 'none';
          console.log(`✅ Hiding video for ${socketId}`);
        }
        
        if (!placeholder) {
          placeholder = document.createElement('div');
          placeholder.className = 'video-placeholder';
          placeholder.style.cssText = `
            width: 280px;
            height: 160px;
            border-radius: 8px;
            background-color: #000;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            font-size: 16px;
            font-weight: bold;
          `;
          placeholder.textContent = 'Video Off';
          
          const label = wrapper.querySelector('div:last-child');
          if (label && label !== vid) {
            wrapper.insertBefore(placeholder, label);
          } else {
            wrapper.appendChild(placeholder);
          }
          console.log(`✅ Created placeholder for ${socketId}`);
        } else {
          placeholder.style.display = 'flex';
          console.log(`✅ Showing placeholder for ${socketId}`);
        }
      }
    },

    startBroadcastProcessing() {
      if (this.broadcastRetryTimer) {
        clearInterval(this.broadcastRetryTimer);
      }
      
      this.broadcastRetryTimer = setInterval(() => {
        if (this.broadcastQueue.length > 0 && this.socketReady) {
          this.processQueuedBroadcasts();
        }
      }, 1000);
      
      if (this.statusBroadcastTimer) {
        clearInterval(this.statusBroadcastTimer);
      }
      
      this.statusBroadcastTimer = setInterval(() => {
        if (this.socketReady) {
          this.broadcastCurrentStatus();
        }
      }, 5000);
    },

    processQueuedBroadcasts() {
      if (!this.socketReady || !this.socket?.connected) {
        return;
      }

      console.log(`📤 Processing ${this.broadcastQueue.length} queued broadcasts...`);
      
      const toProcess = [...this.broadcastQueue];
      this.broadcastQueue = [];

      for (const broadcast of toProcess) {
        try {
          this.socket.emit(broadcast.event, broadcast.data);
          console.log(`✅ QUEUED BROADCAST: ${broadcast.event}`);
          this.pendingBroadcasts.delete(`${broadcast.event}-${JSON.stringify(broadcast.data)}`);
        } catch (error) {
          console.error(`❌ QUEUED BROADCAST FAILED: ${broadcast.event}`, error);
          this.broadcastQueue.push(broadcast);
        }
      }
    },

    safeBroadcast(event, data) {
      const broadcastKey = `${event}-${JSON.stringify(data)}`;
      
      if (this.pendingBroadcasts.has(broadcastKey)) {
        console.log(`⏭️ Skipping duplicate broadcast: ${event}`);
        return false;
      }

      console.log(`📡 Attempting broadcast: ${event}`, {
        socketExists: !!this.socket,
        socketConnected: this.socket?.connected,
        socketReady: this.socketReady
      });

      if (this.socket && this.socket.connected && this.socketReady) {
        try {
          this.socket.emit(event, data);
          console.log(`✅ BROADCAST SUCCESS: ${event}`);
          return true;
        } catch (error) {
          console.error(`❌ BROADCAST FAILED: ${event}`, error);
          this.pendingBroadcasts.add(broadcastKey);
          this.broadcastQueue.push({ event, data });
          return false;
        }
      } else {
        console.warn(`⏸️ Socket not ready - QUEUING: ${event}`);
        this.pendingBroadcasts.add(broadcastKey);
        this.broadcastQueue.push({ event, data });
        return false;
      }
    },

    broadcastCurrentStatus() {
      console.log('📢 Broadcasting current status:', {
        video: this.videoon,
        mic: this.micon,
        screenShare: this.isScreenSharing
      });
      
      this.broadcastVideoStatus(this.videoon);
      this.broadcastMicStatus(this.micon);
      if (this.isScreenSharing) {
        this.broadcastScreenShareStatus(true);
      }
    },

    broadcastVideoStatus(isVideoOn) {
      const data = {
        roomId: this.roomId,
        userId: this.userId,
        userName: this.userName,
        isVideoOn: isVideoOn
      };
      
      console.log('📹 Broadcasting video status:', isVideoOn);
      this.safeBroadcast('video-status', data);
    },

    broadcastMicStatus(isMicOn) {
      const data = {
        roomId: this.roomId,
        userId: this.userId,
        userName: this.userName,
        isMicOn: isMicOn
      };
      
      console.log('🎤 Broadcasting mic status:', isMicOn);
      this.safeBroadcast('mic-status', data);
    },

    broadcastScreenShareStatus(isSharing) {
      const data = {
        roomId: this.roomId,
        userId: this.userId,
        userName: this.userName,
        isScreenSharing: isSharing
      };
      
      console.log('🖥️ Broadcasting screen share status:', isSharing);
      this.safeBroadcast('screen-share-status', data);
    },

    async toggleMic() {
      if (this.isInitializingMedia) return;
      this.isInitializingMedia = true;

      try {
        if (this.micon) {
          console.log('🔇 Turning microphone OFF');
          if (this.localStream) {
            this.localStream.getAudioTracks().forEach(track => {
              track.stop();
              this.localStream.removeTrack(track);
            });
          }
          
          for (const peerId in this.peers) {
            const pc = this.peers[peerId];
            const audioSender = pc.getSenders().find(s => s.track?.kind === 'audio');
            if (audioSender) {
              pc.removeTrack(audioSender);
            }
          }
          
          this.micon = false;
          this.broadcastMicStatus(false);
          
        } else {
          console.log('🎤 Turning microphone ON');
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
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
        alert('Could not access microphone. Please check permissions.');
        this.micon = false;
        this.broadcastMicStatus(false);
      } finally {
        this.isInitializingMedia = false;
      }
    },

    async toggleVideo() {
      if (this.isInitializingMedia) return;
      this.isInitializingMedia = true;

      try {
        if (this.videoon) {
          console.log('📴 Turning camera OFF');
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
            if (videoSender) {
              await videoSender.replaceTrack(null);
            }
          }
          
          this.videoon = false;
          this.broadcastVideoStatus(false);
          
        } else {
          console.log('📹 Turning camera ON');
          const videoStream = await navigator.mediaDevices.getUserMedia({ 
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 }
            }
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
            const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
            
            if (videoSender) {
              await videoSender.replaceTrack(videoTrack);
            } else {
              pc.addTrack(videoTrack, this.localStream);
              await this.renegotiateConnection(peerId);
            }
          }
          
          this.videoon = true;
          this.broadcastVideoStatus(true);
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Could not access camera. Please check permissions.');
        this.videoon = false;
        this.broadcastVideoStatus(false);
      } finally {
        this.isInitializingMedia = false;
      }
    },

    async createPeerConnection(remoteId, isInitiator = false) {
      console.log(`🔗 Creating peer connection for ${remoteId} (initiator: ${isInitiator})`);

      const iceServers = [
        { urls: 'stun:stun.l.google.com:19302' }
      ];

      const turnUsername = import.meta.env.VITE_TURN_USERNAME;
      const turnPassword = import.meta.env.VITE_TURN_PASSWORD;
      const turnUrl = import.meta.env.VITE_TURN_URL || 'turn:your-turn-server.com:3478';

      if (turnUsername && turnPassword) {
        iceServers.push({
          urls: turnUrl,
          username: turnUsername,
          credential: turnPassword
        });
      }

      const pc = new RTCPeerConnection({
        iceServers,
        iceCandidatePoolSize: 10
      });

      pc.onicecandidate = (event) => {
        if (event.candidate && this.socketReady) {
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
        console.log(`📥 Received ${event.track.kind} track from ${remoteId}`);
        
        const stream = event.streams[0];
        if (stream) {
          this.handleRemoteStream(remoteId, stream);
          
          event.track.onended = () => {
            console.log(`Track ended: ${event.track.kind} from ${remoteId}`);
            if (event.track.kind === 'video') {
              this.updateRemoteVideoDisplay(remoteId, false);
            }
          };
          
          event.track.onmute = () => {
            console.log(`Track muted: ${event.track.kind} from ${remoteId}`);
            if (event.track.kind === 'video') {
              this.updateRemoteVideoDisplay(remoteId, false);
            }
          };
          
          event.track.onunmute = () => {
            console.log(`Track unmuted: ${event.track.kind} from ${remoteId}`);
            if (event.track.kind === 'video') {
              this.updateRemoteVideoDisplay(remoteId, true);
            }
          };
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
        console.log(`📨 Handling offer from ${from}`);
        
        let pc = this.peers[from];
        if (!pc) {
          pc = await this.createPeerConnection(from, false);
        }

        if (pc.signalingState !== 'stable') {
          console.log(`Peer ${from} not stable, waiting...`);
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (pc.signalingState === 'have-local-offer') {
          console.log(`Collision with ${from} - rolling back`);
          await pc.setLocalDescription({ type: 'rollback' });
        }

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        
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
        
        if (this.socketReady) {
          this.socket.emit('signal', {
            to: from,
            signal: { type: 'answer', sdp: pc.localDescription }
          });
          console.log(`✅ Answer sent to ${from}`);
        }
      } catch (err) {
        console.error('Error handling offer:', err);
      }
    },

    async handleAnswer(from, answer) {
      try {
        console.log(`📨 Handling answer from ${from}`);
        const pc = this.peers[from];
        
        if (!pc) {
          console.error(`No peer connection for ${from}`);
          return;
        }

        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          
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
          
          console.log(`✅ Answer handled from ${from}`);
          this.peerNegotiating[from] = false;
        } else {
          console.log(`Ignoring answer from ${from} - wrong state`);
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
        } else {
          if (!this.pendingCandidates[from]) {
            this.pendingCandidates[from] = [];
          }
          this.pendingCandidates[from].push(candidate);
        }
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    },

    handleRemoteStream(remoteId, stream) {
      console.log(`🎬 Setting up remote stream for ${remoteId}`);
      
      let wrapper = document.querySelector(`[data-peer-id="${remoteId}"]`);
      
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

        const placeholder = document.createElement('div');
        placeholder.className = 'video-placeholder';
        placeholder.style.cssText = `
          width: 280px;
          height: 160px;
          border-radius: 8px;
          background-color: #000;
          display: none;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 16px;
          font-weight: bold;
        `;
        placeholder.textContent = 'Video Off';

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
        wrapper.appendChild(placeholder);
        wrapper.appendChild(label);
        this.remoteVideos[remoteId] = vid;

        if (this.$refs.participantsBox) {
          this.$refs.participantsBox.appendChild(wrapper);
        }
      }

      const vid = wrapper.querySelector('video');
      if (vid && stream) {
        vid.srcObject = stream;
        
        const videoTracks = stream.getVideoTracks();
        const hasActiveVideo = videoTracks.some(t => t.enabled && t.readyState === 'live');
        
        vid.play().then(() => {
          console.log(`✅ Video playing for ${remoteId}`);
          this.updateRemoteVideoDisplay(remoteId, hasActiveVideo);
        }).catch(err => {
          console.warn(`⚠️ Video play failed for ${remoteId}:`, err.message);
          this.updateRemoteVideoDisplay(remoteId, hasActiveVideo);
        });
      }
      
      stream.getTracks().forEach(track => {
        track.onended = () => {
          if (track.kind === 'video') {
            this.updateRemoteVideoDisplay(remoteId, false);
          }
        };
        
        track.onmute = () => {
          if (track.kind === 'video') {
            this.updateRemoteVideoDisplay(remoteId, false);
          }
        };
        
        track.onunmute = () => {
          if (track.kind === 'video') {
            this.updateRemoteVideoDisplay(remoteId, true);
          }
        };
      });
    },

    async startOffer(remoteId) {
      if (remoteId === this.socket?.id || remoteId === this.userId) {
        return;
      }

      console.log(`📤 Starting offer to ${remoteId}`);
      
      try {
        const pc = await this.createPeerConnection(remoteId, true);
        
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        
        await pc.setLocalDescription(offer);

        if (this.socketReady) {
          this.socket.emit('signal', {
            to: remoteId,
            signal: { type: 'offer', sdp: offer }
          });
          console.log(`✅ Offer sent to ${remoteId}`);
        }
      } catch (err) {
        console.error(`Error creating offer to ${remoteId}:`, err);
      }
    },

    cleanupPeer(peerId) {
      console.log(`🧹 Cleaning up peer: ${peerId}`);
      
      if (this.peers[peerId]) {
        try {
          this.peers[peerId].close();
        } catch (e) {
          console.error('Error closing peer connection:', e);
        }
        delete this.peers[peerId];
      }

      delete this.peerNegotiating[peerId];
      delete this.pendingCandidates[peerId];

      const wrapper = document.querySelector(`[data-peer-id="${peerId}"]`);
      if (wrapper?.parentNode) {
        wrapper.parentNode.removeChild(wrapper);
      }

      delete this.remoteVideos[peerId];
    },

    updateParticipantsList(list) {
      console.log('Updating participants list:', list);
      
      const participantsMap = new Map();
      
      for (const p of list || []) {
        if (!p || !p.id || p.id === this.socket?.id || p.id === this.userId) {
          continue;
        }
        
        let displayName = p.name || p.userName || p.username;
        
        if (displayName?.includes('@')) {
          displayName = displayName.split('@')[0];
        }
        
        if (!displayName || displayName === 'undefined' || displayName === 'null') {
          displayName = `User-${p.id.substring(0, 8)}`;
        }
        
        participantsMap.set(p.id, {
          id: p.id,
          socketId: p.id,
          userId: p.userId || p._id || p.id,
          name: displayName,
          isHost: p.isHost || false,
          hasMic: p.hasMic || false,
          hasVideo: p.hasVideo || false
        });
      }
      
      this.participants = Array.from(participantsMap.values());
    },

    addParticipant(user) {
      if (!user || !user.id || user.id === this.socket?.id || user.id === this.userId) {
        return;
      }
      
      const existingIndex = this.participants.findIndex(p => p.id === user.id);
      
      let displayName = user.name || user.userName || user.username || 'Anonymous';
      
      if (displayName?.includes('@')) {
        displayName = displayName.split('@')[0];
      }
      
      if (!displayName || displayName === 'undefined') {
        displayName = `User-${user.id.substring(0, 8)}`;
      }
      
      const participantData = {
        id: user.id,
        socketId: user.id,
        userId: user.userId || user._id || user.id,
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
      const participant = this.participants.find(p => 
        p.userId === userId || p.id === userId || p.socketId === userId
      );
      
      if (participant) {
        if (statusType === 'video') {
          participant.hasVideo = isEnabled;
        } else if (statusType === 'mic') {
          participant.hasMic = isEnabled;
        } else if (statusType === 'screenShare') {
          participant.isScreenSharing = isEnabled;
        }
        
        this.$forceUpdate();
      }
    },

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

    toggle_info() {
      this.show_info = !this.show_info;
    },

    close_info() {
      this.show_info = false;
    },

    copystring() {
      const meetingLink = window.location.href;
      navigator.clipboard.writeText(meetingLink)
        .then(() => alert("Meeting link copied!"))
        .catch(() => {
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

    async sharescreen() {
      try {
        if (!this.isScreenSharing) {
          const stream = await navigator.mediaDevices.getDisplayMedia({ 
            video: { cursor: "always" },
            audio: false 
          });
          
          this.screenStream = stream;
          this.screenTrack = stream.getVideoTracks()[0];
          
          const el = this.$refs.localVideo;
          if (el) {
            el.srcObject = stream;
            await el.play().catch(() => {});
          }

          for (const peerId in this.peers) {
            const pc = this.peers[peerId];
            const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
            
            if (videoSender) {
              await videoSender.replaceTrack(this.screenTrack);
            } else {
              pc.addTrack(this.screenTrack, stream);
              await this.renegotiateConnection(peerId);
            }
          }

          this.screenTrack.onended = () => {
            this.stopScreenShare();
          };
          
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
        if (this.screenTrack) {
          this.screenTrack.stop();
          this.screenTrack = null;
        }
        
        if (this.screenStream) {
          this.screenStream.getTracks().forEach(t => t.stop());
          this.screenStream = null;
        }

        if (this.videoon) {
          const videoStream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: { ideal: 1280 }, height: { ideal: 720 } }
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
            }
          }
        }
        
        this.isScreenSharing = false;
        this.broadcastScreenShareStatus(false);
      } catch (err) {
        console.error("Error stopping screen share:", err);
        this.isScreenSharing = false;
      }
    },

    async renegotiateConnection(peerId) {
      const pc = this.peers[peerId];
      if (!pc || this.peerNegotiating[peerId]) return;

      try {
        this.peerNegotiating[peerId] = true;
        
        if (pc.signalingState !== 'stable') {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        if (this.socketReady) {
          this.socket.emit('signal', {
            to: peerId,
            signal: { type: 'offer', sdp: offer }
          });
        }
      } catch (err) {
        console.error(`Renegotiation error for ${peerId}:`, err);
      } finally {
        setTimeout(() => {
          this.peerNegotiating[peerId] = false;
        }, 2000);
      }
    },

    async recording() {
      if (!this.isHost) {
        alert("Only host can start recording");
        return;
      }
      alert("Recording feature - Work in progress");
    },

    async silent_background() {
      alert("Silent background mode - Work in progress");
    },

    async checkNetworkQuality() {
      if (!this.localStream || Object.keys(this.peers).length === 0) return;

      let poorConnection = false;
      
      for (const peerId in this.peers) {
        const pc = this.peers[peerId];
        try {
          const stats = await pc.getStats();
          stats.forEach(report => {
            if (report.type === "outbound-rtp" && !report.isRemote) {
              const packetsSent = report.packetsSent || 0;
              const packetsLost = report.packetsLost || 0;
              
              if (packetsSent > 50) {
                const lossRate = packetsLost / (packetsSent + packetsLost);
                if (lossRate > 0.05) {
                  poorConnection = true;
                }
              }
            }
          });
        } catch(err) {
          console.error("Error getting stats:", err);
        }
      }
      
      this.isPoorNetwork = poorConnection;
    },

    initTranscription() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) return;

      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;

      this.recognition.onresult = (event) => {
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript.trim() + ' ';
          }
        }
        if (final) {
          this.transcript.push(final);
        }
      };

      this.recognition.onend = () => {
        if (this.isPoorNetwork) this.recognition.start();
      };
    },

    cleanup() {
      console.log('🧹 Cleaning up resources...');
      
      if (this.broadcastRetryTimer) {
        clearInterval(this.broadcastRetryTimer);
      }
      
      if (this.statusBroadcastTimer) {
        clearInterval(this.statusBroadcastTimer);
      }
      
      for (const id in this.peers) {
        try { this.peers[id].close(); } catch (e) {}
      }
      this.peers = {};
      
      if (this.localStream) {
        this.localStream.getTracks().forEach(t => {
          try { t.stop(); } catch (e) {}
        });
      }
      
      if (this.screenStream) {
        this.screenStream.getTracks().forEach(t => {
          try { t.stop(); } catch (e) {}
        });
      }
      
      if (this.socket) {
        this.socket.disconnect();
      }
      
      if (this.networkCheckInterval) {
        clearInterval(this.networkCheckInterval);
      }
      
      if (this.recognition) {
        try { this.recognition.stop(); } catch (e) {}
      }
    }
  },

  beforeUnmount() {
    this.cleanup();
    document.removeEventListener("mousemove", this.resetinactivityTimer);
  },

  async mounted() {
    console.log('🚀 MEETING ROOM MOUNTING');
    
    if (!this.initUserFromToken()) return;

    this.roomId = this.computedRoomId;
    this.localStream = new MediaStream();
    
    this.initSocket();
    this.initTranscription();
    
    setTimeout(() => {
      this.networkCheckInterval = setInterval(() => {
        this.checkNetworkQuality();
      }, 5000);
    }, 5000);

    this.resetinactivityTimer();
    document.addEventListener("mousemove", this.resetinactivityTimer);
  }
};
</script>

<style>
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
}
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
  transition: left 0.4s ease, right 0.4s ease;
  z-index: 5;
}
.left-tray-left { left: 0; }
.left-tray-right { right: 0; }

#left-tray button {
  background-color: #444;
  color: white;
  border: none;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
}

#main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  transition: margin 0.4s ease;
}

#page:not(.tray-on-right):not(.tray-hidden) #main-content {
  margin-left: 200px;
}
#page.tray-on-right:not(.tray-hidden) #main-content {
  margin-right: 200px;
}

#host {
  flex: 3;
  background-color: #1a1a1a;
  border-radius: 10px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

#host video {
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-off-indicator {
  position: absolute;
  color: #fff;
  font-size: 24px;
  font-weight: bold;
  z-index: 2;
}

#participants {
  flex: 1;
  background-color: #3a3f47;
  border-radius: 10px;
  display: flex;
  gap: 8px;
  padding: 10px;
  margin-bottom: 80px;
  flex-wrap: wrap;
}

#navbar {
  position: fixed;
  bottom: 0;
  width: 100%;
  background-color: #1f1f1f;
  height: 60px;
  display: flex;
  justify-content: space-between;
  padding: 0 40px;
  z-index: 10;
}

#navbar ul {
  display: flex;
  gap: 20px;
  margin: 0;
  padding: 0;
}

#navbar button {
  background-color: white;
  color: black;
  border: none;
  border-radius: 10px;
  padding: 10px 16px;
  cursor: pointer;
}

.tooltip {
  position: absolute;
  bottom: 60px;
  background-color: black;
  color: white;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 12px;
  z-index: 99;
}

#chat-box, #list-box {
  position: fixed;
  bottom: 70px;
  right: 0;
  width: 320px;
  height: calc(100vh - 70px);
  background-color: #f8f9fa;
  display: flex;
  flex-direction: column;
  z-index: 100;
}

.chat-header, .list-header {
  padding: 14px;
  background-color: #e8eaed;
  display: flex;
  justify-content: space-between;
  color: black;
  font-weight: 600;
}

.chat-body, .list-body {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  color: #202124;
}

.chat-input-section {
  display: flex;
  padding: 12px;
  background-color: #e8eaed;
}

.chat-input {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #ccc;
}

.transcript-box {
  position: absolute;
  bottom: 100px;
  left: 20px;
  background: rgba(0,0,0,0.7);
  color: white;
  padding: 10px;
  max-width: 300px;
  border-radius: 8px;
}

.remote-participant video {
  display: block;
}

.video-placeholder {
  display: none;
}
</style>
