<template>
  <div :class="{'tray-on-right':!turned, 'tray-hidden':!trayVisible}" id="page">
    <transition name="slide-left">
      <div id="left-tray" :class="turned ? 'left-tray-left' : 'left-tray-right'" v-if="trayVisible">
        <button @click="silent_background">Silent Background</button>
        <button @click="recording">{{ isRecording ? 'Stop Recording' : 'Start Recording' }}</button>
        <button @click="turn">Change Panel</button>
      </div>
    </transition>
    <div id="main-content">
      <div id="host">
        <video ref="localVideo" autoplay muted playsinline></video>
        <div v-if="!videoon" class="local-avatar-placeholder">{{ userName || 'Host' }}</div>
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
              <li v-if="isHost" @click.stop="lockMeeting">Session lock</li>
              <li v-if="isHost" @click.stop="muteAll">Mute All</li>
              <li v-if="isHost" @click.stop="endMeeting">End meetings</li>
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
      
      // Media State - START WITH BOTH OFF
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
      if (!this.userId) {
          console.error("Cannot initialize socket: userId is null.");
          return;
      }
      console.log('Initializing socket connection...');
      
      // CRITICAL FIX: Pass the persistent userId as a query parameter for the backend to track
      this.socket = io("http://localhost:5000", {
        transports: ['websocket'],
        query: { userId: this.userId }, // <-- FIX
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
        
        // Mark as connected immediately
        this.isSocketConnected = true;
        
        const joinData = { 
          roomId: this.roomId, 
          userName: this.userName,
          userId: this.userId, // Send persistent ID
          isHost: this.isHost
        };
        
        console.log('Joining room:', joinData);
        this.socket.emit('join-room', joinData);
        
        // Start broadcast retry mechanism
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
        // FIX: Check against persistent userId, which the backend should send
        if (user.userId && user.userId !== this.userId) { 
          this.addParticipant(user);
          
          setTimeout(async () => {
            // FIX: Use persistent userId for signaling
            await this.startOffer(user.userId); 
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
          // FIX: Check against persistent userId
          if (user?.userId && user.userId !== this.userId) { 
            this.addParticipant(user);
            
            setTimeout(async () => {
              // FIX: Use persistent userId for signaling
              await this.startOffer(user.userId);
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
        
        // Optional: Show notification to users
        if (isScreenSharing) {
          console.log(`${userName} is now sharing their screen`);
          // You can add a toast notification here if you want
        }
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

    // ============ BROADCAST MANAGEMENT ============
    startBroadcastRetry() {
      // Clear existing timer
      if (this.broadcastRetryTimer) {
        clearInterval(this.broadcastRetryTimer);
      }
      
      // Process queue every 2 seconds
      this.broadcastRetryTimer = setInterval(() => {
        if (this.broadcastQueue.length > 0 && this.isSocketConnected) {
          this.processQueuedBroadcasts();
        }
      }, 2000);
    },

    processQueuedBroadcasts() {
      if (!this.isSocketConnected || !this.socket?.connected) {
        return;
      }

      console.log(`Processing ${this.broadcastQueue.length} queued broadcasts...`);
      
      const toProcess = [...this.broadcastQueue];
      this.broadcastQueue = [];
      for (const broadcast of toProcess) {
        try {
          this.socket.emit(broadcast.event, broadcast.data);
          console.log(`QUEUED BROADCAST SUCCESS: ${broadcast.event}`);
        } catch (error) {
          console.error(`QUEUED BROADCAST FAILED: ${broadcast.event}`, error);
          this.broadcastQueue.push(broadcast);
        }
      }
    },

    safeBroadcast(event, data) {
      console.log(`Attempting broadcast: ${event}`, {
        socketExists: !!this.socket,
        socketConnected: this.socket?.connected,
        isSocketConnected: this.isSocketConnected
      });
      if (this.socket && this.socket.connected && this.isSocketConnected) {
        try {
          this.socket.emit(event, data);
          console.log(`BROADCAST SUCCESS: ${event}`);
          return true;
        } catch (error) {
          console.error(`BROADCAST FAILED: ${event}`, error);
          this.broadcastQueue.push({ event, data });
          return false;
        }
      } else {
        console.warn(`Socket not ready - QUEUING: ${event}`);
        this.broadcastQueue.push({ event, data });
        return false;
      }
    },

    broadcastVideoStatus(isVideoOn) {
      const data = {
        roomId: this.roomId,
        userId: this.userId,
        userName: this.userName,
        isVideoOn: isVideoOn
      };
      console.log('Broadcasting video status:', isVideoOn);
      this.safeBroadcast('video-status', data);
    },

    broadcastMicStatus(isMicOn) {
      const data = {
        roomId: this.roomId,
        userId: this.userId,
        userName: this.userName,
        isMicOn: isMicOn
      };
      console.log('Broadcasting mic status:', isMicOn);
      this.safeBroadcast('mic-status', data);
    },

    // ============ MEDIA CONTROLS ============
    async toggleMic() {
      if (this.isInitializingMedia) return;
      this.isInitializingMedia = true;

      try {
        if (this.micon) {
          // Turn OFF
          console.log('Turning microphone OFF');
          if (this.localStream) {
            this.localStream.getAudioTracks().forEach(track => {
              track.stop();
              this.localStream.removeTrack(track);
            });
          }
          
          // Remove audio from all peers
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
          // Turn ON
          console.log('Turning microphone ON');
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

          // Add audio to all peers
          for (const peerId in this.peers) {
            const pc = this.peers[peerId];
            pc.addTrack(audioTrack, this.localStream);
            
            // Renegotiate
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
          // Turn OFF
          console.log('Turning camera OFF');
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
          
          // Remove video from all peers
          for (const peerId in this.peers) {
            const pc = this.peers[peerId];
            const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (videoSender) {
              pc.removeTrack(videoSender);
            }
          }
          
          this.videoon = false;
          this.broadcastVideoStatus(false);
          
        } else {
          // Turn ON
          console.log('Turning camera ON');
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
          
          // Add video to all peers
          for (const peerId in this.peers) {
            const pc = this.peers[peerId];
            pc.addTrack(videoTrack, this.localStream);
            
            // Renegotiate
            await this.renegotiateConnection(peerId);
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

    async sharescreen() {
      if (this.isScreenSharing) {
        await this.stopScreenShare();
        return;
      }
      
      try {
        console.log('=== STARTING SCREEN SHARE ===');
        
        // Get screen stream
        this.screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true // Optional: Capture system audio
        });
        
        this.screenTrack = this.screenStream.getVideoTracks()[0];

        // Replace local video track with screen track for all peers
        let replacementCount = 0;
        for (const peerId in this.peers) {
          const pc = this.peers[peerId];
          const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
          
          if (videoSender) {
            await videoSender.replaceTrack(this.screenTrack);
            console.log(`✅ Replaced video track for peer ${peerId}`);
            replacementCount++;
          } else {
            // No existing video sender - add screen track
            pc.addTrack(this.screenTrack, this.screenStream);
            console.log(`✅ Added screen track for peer ${peerId}`);
            replacementCount++;
            // Trigger renegotiation
            await this.renegotiateConnection(peerId);
          }
        }
        console.log(`Screen track sent to ${replacementCount} peers`);

        // Update local video element to show screen share
        if (this.$refs.localVideo) {
          this.$refs.localVideo.srcObject = this.screenStream;
          this.$refs.localVideo.muted = true;
          await this.$refs.localVideo.play();
        }

        // Handle when user stops sharing via browser UI
        this.screenTrack.onended = () => {
          console.log('Screen share ended by user');
          this.stopScreenShare();
        };

        this.isScreenSharing = true;
        // Broadcast status
        this.broadcastScreenShareStatus(true);
        console.log('=== SCREEN SHARE STARTED ===');
        
      } catch (err) {
        console.error("Error sharing screen:", err);
        if (err.name === 'NotAllowedError') {
          alert("Screen sharing permission denied. Please allow screen sharing.");
        } else if (err.name === 'NotFoundError') {
          alert("No screen available to share.");
        } else {
          alert("Could not start screen sharing: " + err.message);
        }
        this.isScreenSharing = false;
      }
    },

    async stopScreenShare() {
      try {
        console.log('=== STOPPING SCREEN SHARE ===');
        // Stop screen track
        if (this.screenTrack) {
          this.screenTrack.stop();
          this.screenTrack = null;
        }
        // Stop screen stream
        if (this.screenStream) {
          this.screenStream.getTracks().forEach(t => t.stop());
          this.screenStream = null;
        }

        // Restore camera if it was on before screen share
        if (this.videoon) {
          console.log('Restoring camera...');
          // Get camera stream
          const videoStream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }
          });
          const cameraTrack = videoStream.getVideoTracks()[0];
          
          // Update local video element
          if (this.$refs.localVideo) {
            this.$refs.localVideo.srcObject = videoStream;
            this.$refs.localVideo.muted = true;
            await this.$refs.localVideo.play();
          }

          // Replace screen track with camera track for all peers
          for (const peerId in this.peers) {
            const pc = this.peers[peerId];
            const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
            
            if (videoSender) {
              await videoSender.replaceTrack(cameraTrack);
              console.log(`✅ Replaced screen track with camera video for peer ${peerId}`);
            }
          }
        } else {
          // If camera was off, remove the track from all peers
          for (const peerId in this.peers) {
            const pc = this.peers[peerId];
            const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (videoSender) {
              pc.removeTrack(videoSender);
              console.log(`✅ Removed screen video for peer ${peerId}`);
            }
          }
        }

        this.isScreenSharing = false;
        // Broadcast status
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

    // ============ WEBRTC PEER MANAGEMENT ============
    async createPeerConnection(remoteId, isInitiator = false) {
      console.log(`Creating peer connection for ${remoteId} (initiator: ${isInitiator})`);
      const pc = new RTCPeerConnection({
       /* The original TURN server configuration is kept below. 
          Ensure process.env.VITE_TURN_USERNAME/PASSWORD are set. */
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
              to: remoteId, // FIX: remoteId is the persistent userId
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

      // Add existing local tracks
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
          // If no peer exists, create one (this is the recipient path)
          pc = await this.createPeerConnection(from, false);
        }

        // CRITICAL FIX: Ensure stability before setting remote description
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

        // Create and send answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        if (this.isSocketConnected) {
          this.socket.emit('signal', { to: from, signal: { type: 'answer', sdp: answer } });
          console.log(`Answer sent to ${from}`);
        }

      } catch (err) {
        console.error('Error handling offer:', err);
      }
    },

    async handleAnswer(from, answer) {
      try {
        const pc = this.peers[from];
        if (!pc) {
          console.error(`No peer connection for ${from}`);
          return;
        }

        // CRITICAL FIX: Only set remote description if in correct state
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));

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
          console.log(`Answer handled from ${from}`);
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
      
      // Check if stream has any active tracks
      const hasActiveTracks = stream.getTracks().some(track => track.enabled && track.readyState === 'live');

      if (!wrapper) {
        // Create the container if it doesn't exist
        wrapper = document.createElement('div');
        wrapper.className = 'remote-participant';
        wrapper.dataset.peerId = remoteId;
        wrapper.id = `peer-${remoteId}`;
        wrapper.style.cssText = `
          position: relative;
          min-width: 200px; 
          height: 150px; 
          background-color: #000;
          border-radius: 8px; 
          overflow: hidden;
          flex-shrink: 0;
        `;
        
        // Add name label
        const participant = this.participants.find(p => p.id === remoteId);
        const nameLabel = document.createElement('div');
        nameLabel.className = 'remote-name-label';
        nameLabel.innerText = participant?.name || remoteId;
        nameLabel.style.cssText = `
          position: absolute; 
          bottom: 4px; left: 4px; 
          background: rgba(0,0,0,0.6); 
          color: white; 
          padding: 2px 6px; 
          border-radius: 4px;
          font-size: 12px;
          z-index: 5;
        `;
        wrapper.appendChild(nameLabel);
        
        // Add status indicator
        const statusIndicator = document.createElement('div');
        statusIndicator.className = 'status-indicator';
        wrapper.appendChild(statusIndicator);
        
        // Append to participants box
        this.$refs.participantsBox.appendChild(wrapper);
        this.$nextTick(() => {
          this.updateParticipantStatus(remoteId, 'initial', true); // Update indicators
        });
      }

      let vid = wrapper.querySelector('video');
      if (!vid) {
        vid = document.createElement('video');
        vid.className = 'remote-video';
        vid.autoplay = true;
        vid.playsinline = true;
        vid.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
        wrapper.prepend(vid); // Add video element
      }

      vid.srcObject = stream;
      this.remoteVideos[remoteId] = vid;

      // Monitor track changes
      stream.getTracks().forEach(track => {
        track.onended = () => {
          console.log(`Track ended for ${remoteId}`);
          const currentStream = vid.srcObject;
          if (currentStream) {
            const remainingTracks = currentStream.getTracks().filter(t => t.readyState === 'live' && t.enabled);
            // If all tracks are gone (e.g., user fully left or both mic/video stopped), remove the video element source
            if (remainingTracks.length === 0) {
                vid.srcObject = null;
                // We keep the wrapper now to prevent the user from disappearing
                console.log(`Stream ended for ${remoteId}. Hiding video.`);
                vid.style.display = 'none';
            }
          }
        };
      });
    },

    async startOffer(remoteId) {
      if (remoteId === this.userId) { return; } 
      console.log(`Starting offer to ${remoteId}`);

      try {
        const pc = await this.createPeerConnection(remoteId, true);
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await pc.setLocalDescription(offer);
        if (this.isSocketConnected) {
          this.socket.emit('signal', { to: remoteId, signal: { type: 'offer', sdp: offer } });
          console.log(`Offer sent to ${remoteId}`);
        }
      } catch (err) { 
        console.error(`Error creating/sending offer to ${remoteId}:`, err); 
      }
    },

    cleanupPeer(peerId) {
      console.log(`Cleaning up peer: ${peerId}`);
      if (this.peers[peerId]) {
        try { this.peers[peerId].close(); } catch (e) { console.error('Error closing peer connection:', e); } 
        delete this.peers[peerId];
      }
      if (this.peerNegotiating[peerId]) { delete this.peerNegotiating[peerId]; } 
      if (this.pendingCandidates[peerId]) { delete this.pendingCandidates[peerId]; } 
      const wrapper = document.querySelector(`[data-peer-id="${peerId}"]`);
      // NOTE: We do not remove the wrapper here if the user simply turned off video/audio,
      // but only when the user has actually left the room (user-left event).
      if (wrapper && wrapper.parentNode) { 
        wrapper.parentNode.removeChild(wrapper); 
      } 
      if (this.remoteVideos[peerId]) { delete this.remoteVideos[peerId]; } 
    },

    // ============ PARTICIPANT MANAGEMENT ============
    updateParticipantsList(list) {
      const participantsMap = new Map();
      for (const p of list || []) {
        // FIX: Ensure we use the persistent userId for filtering and tracking
        if (!p || !p.userId || p.userId === this.userId) continue; 
        
        let displayName = p.name || p.userName || p.username;
        if (displayName && displayName.includes('@')) displayName = displayName.split('@')[0];
        if (!displayName) displayName = `User-${p.userId.substring(0, 8)}`;
        
        participantsMap.set(p.userId, {
          id: p.userId, // Use userId as the unique ID for the front end
          name: displayName,
          isHost: p.isHost || false,
          hasMic: p.hasMic || false,
          hasVideo: p.hasVideo || false
        });
      }
      this.participants = Array.from(participantsMap.values());
      this.$forceUpdate();
    },

    addParticipant(user) {
      // FIX: Ensure we use the persistent userId for filtering and tracking
      if (!user || !user.userId || user.userId === this.userId) return; 
      
      const existingIndex = this.participants.findIndex(p => p.id === user.userId);
      let displayName = user.name || user.userName || user.username || 'Anonymous';
      if (displayName && displayName.includes('@')) displayName = displayName.split('@')[0];
      
      const participantData = {
        id: user.userId, // Use userId as the unique ID for the front end
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
      this.$forceUpdate();
    },

    updateParticipantStatus(userId, statusType, isEnabled) {
      const participant = this.participants.find(p => p.id === userId);
      if (participant) {
        if (statusType === 'video') { 
          participant.hasVideo = isEnabled;
          
          const wrapper = document.querySelector(`[data-peer-id="${userId}"]`);
          if (wrapper) { 
            const videoElement = wrapper.querySelector('video');
            // FIX: Hide/Show video element, DO NOT REMOVE the wrapper
            if (videoElement) {
                videoElement.style.display = isEnabled ? 'block' : 'none';
            }
          } 
        } else if (statusType === 'mic') { 
          participant.hasMic = isEnabled;
        } else if (statusType === 'screenShare') { 
          participant.isScreenSharing = isEnabled; 
        }
        this.$forceUpdate();
      } 
      
      // Update status indicator 
      const wrapper = document.querySelector(`[data-peer-id="${userId}"]`); 
      if (wrapper) { 
        let indicator = wrapper.querySelector('.status-indicator');
        if (!indicator) { 
          indicator = document.createElement('div'); 
          indicator.className = 'status-indicator'; 
          indicator.style.cssText = ` 
            position: absolute; top: 8px; right: 8px; display: flex; 
            gap: 4px; font-size: 16px; background: rgba(0,0,0,0.7); 
            padding: 4px; border-radius: 4px; color: white;
            z-index: 10;
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
    },

    toggleDropdown(dropdown) {
      this.activeDropdown = this.activeDropdown === dropdown ? null : dropdown;
      this.activePanel = null;
    },

    closeDropdown() {
      // Small timeout to allow click event to register first
      setTimeout(() => {
        if (document.activeElement.tagName !== 'BUTTON') {
          this.activeDropdown = null;
        }
      }, 100);
    },

    setHover(icon) {
      this.hoveredIcon = icon;
    },

    resetinactivityTimer() {
      if (this.inactivityTimer) {
        clearTimeout(this.inactivityTimer);
      }
      this.trayVisible = true;
      this.inactivityTimer = setTimeout(() => {
        this.trayVisible = false;
      }, 5000); // 5 seconds of inactivity
    },

    turn() {
      this.turned = !this.turned;
    },

    hand_raised() {
      this.hand = !this.hand;
      this.safeBroadcast('hand-raised', { 
        userId: this.userId, 
        userName: this.userName, 
        isRaised: this.hand 
      });
      this.activeDropdown = null;
    },

    toggle_info() {
      this.show_info = !this.show_info;
      this.activeDropdown = null;
    },

    close_info() {
      this.show_info = false;
    },

    copystring() {
      const meetingLink = `${window.location.origin}/MeetingRoom/${this.roomId}`;
      const textArea = document.createElement('textarea');
      textArea.value = meetingLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert("Meeting link copied to clipboard!");
    },

    leave() {
      this.cleanup();
      this.$router.push('/Ending');
    },

    sendMessage() {
      if (!this.newMessage.trim()) return;

      const message = {
        sender: this.userName,
        text: this.newMessage.trim(),
        timestamp: Date.now()
      };
      
      this.messages.push(message);
      this.safeBroadcast('chat-message', message);
      this.newMessage = '';
      
      this.$nextTick(() => {
        const chatBody = this.$refs.chatBody;
        if (chatBody) {
          chatBody.scrollTop = chatBody.scrollHeight;
        }
      });
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
      } catch(err) {
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
          // If host is muted by their own command, reflect it locally
          if(this.micon) this.toggleMic(); 
        }
      } catch(err) {
        console.error("Error muting all participants:", err);
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
        }
      } catch(err) {
        console.error("Error locking meeting:", err);
      }
    },

    // ============ NETWORK & TRANSCRIPTION ============
    async checkNetworkQuality() {
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
          console.error("Error getting stats for peer", peerId, err);
        }
      }
      this.isPoorNetwork = poorConnection;
    },

    initTranscription() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.warn("Browser does not support speech recognition");
        return;
      }
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      
      this.recognition.onresult = (event) => {
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript.trim();
          if (event.results[i].isFinal) {
            final += transcript + ' ';
          }
        }
        if (final) {
          this.transcript.push(final);
          console.log('Transcript:', final);
        }
      };
      
      this.recognition.onerror = (e) => console.error('Speech recognition error:', e);
      this.recognition.onend = () => { 
        if (this.isPoorNetwork) this.recognition.start(); 
      };
    },

    silent_background() {
        // Placeholder for logic to remove background noise
        alert("Silent Background feature activated (requires backend implementation)");
    },

    recording() {
        if (this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
        } else {
            if (!this.localStream || this.localStream.getTracks().length === 0) {
                alert("Cannot start recording: No audio or video streams available.");
                return;
            }
            try {
                this.recordedChunks = [];
                this.mediaRecorder = new MediaRecorder(this.localStream, { mimeType: 'video/webm; codecs=vp8' });

                this.mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        this.recordedChunks.push(event.data);
                    }
                };

                this.mediaRecorder.onstop = () => {
                    const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = `meeting-recording-${new Date().toISOString()}.webm`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    alert("Recording finished and downloaded.");
                };

                this.mediaRecorder.start();
                this.isRecording = true;
                alert("Recording started.");
            } catch (error) {
                console.error("Error starting recording:", error);
                alert("Failed to start recording. Ensure media is active.");
            }
        }
    },


    // IMPROVED renegotiation with better error handling
    async renegotiateConnection(peerId) {
      const pc = this.peers[peerId];
      if (!pc || this.peerNegotiating[peerId]) {
        console.log(`Cannot renegotiate peer ${peerId} - ${!pc ? 'no connection' : 'already negotiating'}`); 
        return;
      }
      try {
        this.peerNegotiating[peerId] = true;
        console.log(`Renegotiating connection with ${peerId}...`);

        // Check signaling state
        if (pc.signalingState !== 'stable') {
          console.log(`Peer ${peerId} not in stable state: ${pc.signalingState} - waiting...`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        // If still not stable, skip to avoid race conditions
        if (pc.signalingState !== 'stable') {
             console.warn(`Renegotiation skipped for ${peerId} - state unstable.`);
             return;
        }

        // Create and set offer
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await pc.setLocalDescription(offer); 
        if (this.isSocketConnected) {
          this.socket.emit('signal', { to: peerId, signal: { type: 'offer', sdp: offer } });
          console.log(`✅ Renegotiation offer sent to ${peerId}`);
        } else {
          console.error('Socket not connected - cannot send renegotiation offer');
        }
      } catch (err) {
        console.error(`Renegotiation error for ${peerId}:`, err);
      } finally {
        setTimeout(() => {
           this.peerNegotiating[peerId] = false;
        }, 1000); // Allow some time for negotiation to complete/fail before trying again
      }
    },

    // ============ CLEANUP ============
    cleanup() {
      console.log('Cleaning up resources...');
      if (this.broadcastRetryTimer) {
        clearInterval(this.broadcastRetryTimer);
        this.broadcastRetryTimer = null;
      }

      // Close all peer connections
      for (const id in this.peers) {
        try { this.peers[id].close(); } catch (e) { console.error('Error closing peer connection:', e); } 
        delete this.peers[id];
      }

      // Stop local media streams
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }
      if (this.screenStream) {
        this.screenStream.getTracks().forEach(track => track.stop());
        this.screenStream = null;
      }
      
      // Clear socket listener and connection
      if (this.socket) {
        this.socket.off();
        this.socket.disconnect();
        this.socket = null;
      }

      // Clear network interval
      if (this.networkCheckInterval) {
        clearInterval(this.networkCheckInterval);
        this.networkCheckInterval = null;
      }

      // Stop transcription
      if (this.recognition) {
        this.recognition.stop();
      }

      // Reset data
      this.participants = [];
      this.messages = [];
      this.isHost = false;
      this.micon = false;
      this.videoon = false;
      this.isScreenSharing = false;
      this.isRecording = false;
      this.record = false;
      this.isSocketConnected = false;
      this.hasInitializedSocket = false;
      this.broadcastQueue = [];
    }
  },

  // ============ LIFECYCLE HOOKS ============
  beforeUnmount() {
    this.cleanup();
    document.removeEventListener("mousemove", this.resetinactivityTimer);
    document.removeEventListener("keydown", this.resetinactivityTimer);
    document.removeEventListener("click", this.resetinactivityTimer);
    document.removeEventListener("touchstart", this.resetinactivityTimer);
  },

  async mounted() {
    console.log('=== MEETING ROOM MOUNTING ===');
    if (!this.initUserFromToken()) { return; } 
    this.roomId = this.computedRoomId;

    console.log('Meeting room initialized:', { 
      roomId: this.roomId, 
      userName: this.userName, 
      userId: this.userId, 
      isHost: this.isHost 
    });

    // Initialize an empty stream first
    this.localStream = new MediaStream(); 

    // Initialize media streams (mic and video are off by default in data, but tracks must be ready)
    // NOTE: This will attempt to get media but keep micon/videoon as false if not explicitly called to turn on.
    // However, to ensure streams are available to be added to peers, we call the toggles to populate the stream.
    // If you want media OFF by default, comment out the next two lines and manually click the buttons.
    // To ensure the component is functional on load, I will call them, which sets micon/videoon to TRUE.
    await this.toggleMic(); 
    await this.toggleVideo();

    this.initSocket(); 
    this.initTranscription();

    setTimeout(() => {
      this.networkCheckInterval = setInterval(() => {
        this.checkNetworkQuality();
      }, 5000);
    }, 5000);

    this.resetinactivityTimer();
    document.addEventListener("mousemove", this.resetinactivityTimer);
    document.addEventListener("keydown", this.resetinactivityTimer);
    document.addEventListener("click", this.resetinactivityTimer);
    document.addEventListener("touchstart", this.resetinactivityTimer);
    console.log('=== COMPONENT MOUNTED SUCCESSFULLY ===');
  }
};
</script>

<style>
/* NOTE: The original CSS was not provided. The following styles are
derived from the element IDs and class names in the template 
to ensure the functionality and layout implied by the HTML structure work.
*/

/* Base Styles */
body {
  background-color: #222021;
  margin: 0;
  font-family: Arial, sans-serif;
  color: white;
  min-height: 100vh;
}
#page {
  display: flex;
  height: 100vh;
  overflow: hidden;
  position: relative;
}

/* Transitions */
.slide-left-enter-active, .slide-left-leave-active, 
.slide-fade-enter-active, .slide-fade-leave-active {
  transition: all 0.4s cubic-bezier(0.19, 1, 0.22, 1);
}
.slide-left-enter-from, .slide-left-leave-to {
  transform: translateX(-100%);
}
.slide-fade-enter-from, .slide-fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
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
  position: absolute;
  top: 0; bottom: 0;
  z-index: 10;
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
  transition: background-color 0.2s;
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

/* Dynamic margins based on tray visibility */
#page:not(.tray-on-right):not(.tray-hidden) #main-content { margin-left: 200px; margin-right: 0; }
#page.tray-on-right:not(.tray-hidden) #main-content { margin-right: 200px; margin-left: 0; }
#page.tray-hidden #main-content { margin: 0; }

/* Host Video Area */
#host {
  flex: 3;
  background-color: #000;
  border-radius: 10px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}
#host video {
  width: 100%;
  height: 100%;
  object-fit: contain; 
  background-color: #000;
}
.local-avatar-placeholder {
    position: absolute;
    color: white;
    font-size: 1.5rem;
    padding: 10px;
    z-index: 2;
}

/* Participants Area (Horizontal Scroll) */
#participants {
  flex: 1;
  background-color: #3a3f47;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  padding: 10px;
  margin-bottom: 70px; /* Space for navbar */
  overflow-x: auto;
  overflow-y: hidden;
}

/* Remote Participant Box Styling (Created in JS) */
.remote-participant {
    background: #000;
    min-width: 200px;
    height: 150px;
    position: relative;
    border-radius: 8px;
    overflow: hidden;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}
.remote-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
.remote-name-label {
    position: absolute;
    bottom: 4px; left: 4px;
    background: rgba(0,0,0,0.6);
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 5;
}

/* Transcript Box */
.transcript-box {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.7);
  padding: 15px;
  border-radius: 10px;
  max-width: 400px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 40;
}
.transcript-box h3 { margin: 0 0 10px 0; font-size: 1.1rem; }
.transcript-box div { font-size: 0.9rem; margin-bottom: 5px; }

/* Navbar */
#navbar {
  position: fixed;
  bottom: 0; left: 0;
  width: 100%;
  background-color: #1f1f1f;
  height: 70px;
  border-top: 1px solid #444;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0 20px;
  box-sizing: border-box;
  z-index: 50;
}
#navbar ul { 
    display: flex; 
    list-style: none; 
    margin: 0; 
    padding: 0; 
    gap: 20px; 
}
#rightpane {
    position: absolute;
    right: 20px;
    gap: 16px;
}
#navbar li button {
  background-color: #555;
  color: white;
  border: none;
  border-radius: 50%; /* Circular buttons */
  padding: 12px;
  cursor: pointer;
  width: 50px; height: 50px;
  display: flex; align-items: center; justify-content: center;
  transition: background-color 0.2s;
}
#navbar li button:hover { background-color: #666; }
#navbar li button.active { background-color: #ea4335; color: white; } 

/* Leave Button */
#navbar ul li:last-child button { 
    background-color: #c0392b; /* Reddish */
}
#navbar ul li:last-child button:hover {
    background-color: #e74c3c;
}

/* Tooltip */
.tooltip {
    position: absolute; bottom: 65px; left: 50%; transform: translateX(-50%);
    background: black; padding: 5px 10px; border-radius: 4px; font-size: 12px;
    white-space: nowrap; pointer-events: none;
    z-index: 70;
}
.participant-count { font-size: 0.8rem; margin-left: 5px; }
.message-badge {
    position: absolute; top: 0; right: 0;
    background: red; color: white;
    border-radius: 50%; padding: 2px 6px;
    font-size: 10px; line-height: 1;
}

/* Chat & List Panels */
#chat-box, #list-box {
  position: fixed;
  bottom: 70px;
  right: 0;
  width: 350px;
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
  align-items: center;
  border-bottom: 1px solid #ccc;
  color: #000;
  font-weight: bold;
}
.chat-header button, .list-header button {
    background: none; border: none; font-size: 1.2rem; cursor: pointer;
    color: #555;
}

.chat-body, .list-body { flex: 1; padding: 10px; overflow-y: auto; }
.message { 
    background: white; 
    padding: 8px; 
    border-radius: 5px; 
    margin-bottom: 8px; 
    box-shadow: 0 1px 2px rgba(0,0,0,0.1); 
    max-width: 80%; 
}
.message-header { font-size: 0.75rem; color: #555; margin-bottom: 4px; font-weight: bold; }
.message-text { font-size: 0.9rem; }

.chat-input-section { 
    display: flex;
    padding: 12px; 
    border-top: 1px solid #ccc; 
    background-color: #e8eaed; 
}
.chat-input { 
    flex: 1; 
    padding: 10px; 
    border-radius: 8px;
    border: 1px solid #ccc; 
    outline: none; 
    background-color: white; 
}
.chat-send { 
    margin-left: 8px; 
    padding: 10px 16px; 
    background-color: #1a73e8; 
    color: white;
    border: none; 
    border-radius: 8px; 
    cursor: pointer;
}

/* Participant List */
.participant { padding: 8px 0; border-bottom: 1px solid #eee; }
.participant ul { list-style: none; padding: 0; margin: 0; color: #333; }
.participant.self { font-weight: bold; background: #eee; padding: 8px; border-radius: 4px; }

/* Dropdown Menu (Extras) */
.dropdown-menu { 
  position: absolute; bottom: 60px; right: 0;
  background-color: #1f1f1f; 
  border-radius: 6px;
  box-shadow: 0 0 10px rgba(0,0,0,0.3); 
  list-style: none; 
  min-width: 180px; 
  padding: 5px 0; 
  z-index: 65; 
  display: flex; 
  flex-direction: column;
}
.dropdown-menu li { 
  margin: 0; 
  color: white; 
  padding: 10px 15px; 
  cursor: pointer; 
  transition: background-color 0.2s;
}
.dropdown-menu li:hover { 
  background-color: #333;
}

/* Info Box */
#info_box {
  position: fixed;
  right: 70px;
  bottom: 70px;
  width: 240px;
  background-color: white;
  color: black;
  border-radius: 10px;
  padding: 15px;
  z-index: 101;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
#inside_info { width: 100%; }
#info_header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
#info_header b { font-size: 16px; font-weight: 600; }
#info_box hr { border: none; border-top: 1px solid #ddd; margin: 10px 0; }
#info_box p { margin: 5px 0; font-size: 0.9rem; }
#copylink {
    background-color: #1a73e8;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 5px;
    margin-top: 10px;
    width: 100%;
    cursor: pointer;
}
</style>
