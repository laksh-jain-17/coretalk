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
        this.participants = this.participants.filter(p => p.id !== userId && p.socketId !== userId);
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

      // CRITICAL FIX: Handle video status changes
   /*   this.socket.on('video-status', ({ userId, userName, isVideoOn }) => {
        console.log(`${userName} video: ${isVideoOn ? 'ON' : 'OFF'}`);
        this.updateParticipantStatus(userId, 'video', isVideoOn);
        
        // Find the participant to get their socketId
        const participant = this.participants.find(p => p.userId === userId);
        const socketId = participant?.socketId || participant?.id;
        
        console.log(`Looking for wrapper with socketId: ${socketId} (userId: ${userId})`);
        
        // Show or hide video placeholder based on status
        if (socketId) {
          this.updateRemoteVideoDisplay(socketId, isVideoOn);
        }
      });*/

      this.socket.on('video-status', ({ userId, userName, isVideoOn }) => {
        // 1. Update the data state
        this.updateParticipantStatus(userId, 'video', isVideoOn);
  
        // 2. Find the participant by EITHER userId or socketId
        const participant = this.participants.find(p => p.userId === userId || p.id === userId);
        const targetId = participant?.id || userId;

        // 3. Update the UI
        this.updateRemoteVideoDisplay(targetId, isVideoOn);
      });

      this.socket.on('mic-status', ({ userId, userName, isMicOn }) => {
        console.log(`${userName} mic: ${isMicOn ? 'ON' : 'OFF'}`);
        this.updateParticipantStatus(userId, 'mic', isMicOn);
      });

      this.socket.on('screen-share-status', ({ userId, userName, isScreenSharing }) => {
        console.log(`${userName} ${isScreenSharing ? 'started' : 'stopped'} screen sharing`);
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

      this.hasInitializedSocket = true;
    },

    // NEW METHOD: Update remote video display based on video status
    updateRemoteVideoDisplay(userId, isVideoOn) {
      const wrapper = document.querySelector(`[data-peer-id="${userId}"]`);
      
      if (!wrapper) {
        console.log(`No wrapper found for ${userId}`);
        return;
      }
      
      const vid = wrapper.querySelector('video');
      let placeholder = wrapper.querySelector('.video-placeholder');
      
      console.log(`Updating display for ${userId}: video ${isVideoOn ? 'ON' : 'OFF'}`);
      
      if (isVideoOn) {
        // Show video, hide placeholder
        if (vid) {
          vid.style.display = 'block';
          console.log(`Showing video element for ${userId}`);
        }
        if (placeholder) {
          placeholder.style.display = 'none';
          console.log(`Hiding placeholder for ${userId}`);
        }
      } else {
        // Hide video, show placeholder
        if (vid) {
          vid.style.display = 'none';
          console.log(`Hiding video element for ${userId}`);
        }
        
        if (!placeholder) {
          // Create placeholder if it doesn't exist
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
            font-size: 14px;
          `;
          placeholder.textContent = 'Video Off';
          
          // Insert before label
          const label = wrapper.querySelector('div:last-child');
          wrapper.insertBefore(placeholder, label);
          console.log(`Created placeholder for ${userId}`);
        } else {
          placeholder.style.display = 'flex';
          console.log(`Showing placeholder for ${userId}`);
        }
      }
    },

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

    async toggleMic() {
      if (this.isInitializingMedia) return;
      this.isInitializingMedia = true;

      try {
        if (this.micon) {
          console.log('Turning microphone OFF');
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
          console.log('Turning camera OFF');
          if (this.localStream) {
            this.localStream.getVideoTracks().forEach(track => {
              track.stop();
              this.localStream.removeTrack(track);
            });
          }
          
          const videoElement = this.$refs.localVideo;
          if (videoElement) videoElement.srcObject = null;
          
          for (const peerId in this.peers) {
            const pc = this.peers[peerId];
            const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (videoSender) await videoSender.replaceTrack(null);
          }
          
          this.videoon = false;
          this.broadcastVideoStatus(false);
          
        } else {
          console.log('Turning camera ON');
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
        this.videoon = false;
        this.broadcastVideoStatus(false);
      } finally {
        this.isInitializingMedia = false;
      }
    },

    async createPeerConnection(remoteId, isInitiator = false) {
      console.log(`Creating peer connection for ${remoteId} (initiator: ${isInitiator})`);

    /*  const iceServers = [
        { urls: 'stun:stun.l.google.com:19302' }
      ];*/
      const iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        {
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
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
      } else {
        console.warn('⚠️ TURN credentials missing — using STUN only');
      }

      const pc = new RTCPeerConnection({
        iceServers,
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
        console.log(`Received ${event.track.kind} track from ${remoteId}`, {
          enabled: event.track.enabled,
          readyState: event.track.readyState,
          muted: event.track.muted
        });
        
        const stream = event.streams[0];
        if (stream) {
          this.handleRemoteStream(remoteId, stream);
          
          // Also listen for track state changes directly
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
        console.log(`Handling offer from ${from}`);
        
        let pc = this.peers[from];
        if (!pc) {
          pc = await this.createPeerConnection(from, false);
        }

        if (pc.signalingState !== 'stable') {
          console.log(`Peer ${from} not stable (${pc.signalingState}), waiting...`);
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
      
      // Always create or maintain the video box
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

        // Create video element
        const vid = document.createElement('video');
        vid.autoplay = true;
        vid.playsInline = true;
        vid.muted = true;
        vid.style.cssText = `
          width: 280px;
          height: 160px;
          border-radius: 8px;
          object-fit: cover;
          background-color: #000;
        `;

        // Create placeholder for when video is off
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
          font-size: 14px;
        `;
        placeholder.textContent = 'Video Off';

        // Create label
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
        // Always set the stream
        vid.srcObject = stream;
        
        // Check if there are active video tracks
        const videoTracks = stream.getVideoTracks();
        const hasActiveVideoTrack = videoTracks.some(track => track.enabled && track.readyState === 'live');
        
        console.log(`Remote ${remoteId} has active video: ${hasActiveVideoTrack}`, {
          tracks: videoTracks.length,
          enabled: videoTracks.map(t => t.enabled),
          readyState: videoTracks.map(t => t.readyState)
        });
        
        // Try to play with better error handling
        vid.play().then(() => {
          console.log(`✅ Remote video playing for ${remoteId}`);
          // Update display based on actual video track presence
          this.updateRemoteVideoDisplay(remoteId, hasActiveVideoTrack);
        }).catch(err => {
          console.warn(`❌ Video play failed for ${remoteId}:`, err.name, err.message);
          // Even if play fails, show placeholder if no video track
          this.updateRemoteVideoDisplay(remoteId, hasActiveVideoTrack);
          
          // Try to play again with user interaction workaround
          setTimeout(() => {
            vid.play().catch(() => {
              console.log(`Retry play also failed for ${remoteId}`);
            });
          }, 500);
        });
      }
      
      // Monitor track changes
      stream.getTracks().forEach(track => {
        console.log(`Monitoring track for ${remoteId}: ${track.kind}, enabled: ${track.enabled}, state: ${track.readyState}`);
        
        track.onended = () => {
          console.log(`Track ended for ${remoteId}: ${track.kind}`);
          if (track.kind === 'video') {
            this.updateRemoteVideoDisplay(remoteId, false);
          }
        };
        
        track.onmute = () => {
          console.log(`Track muted for ${remoteId}: ${track.kind}`);
          if (track.kind === 'video') {
            this.updateRemoteVideoDisplay(remoteId, false);
          }
        };
        
        track.onunmute = () => {
          console.log(`Track unmuted for ${remoteId}: ${track.kind}`);
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
          console.error('Error closing peer connection:', e);
        }
        delete this.peers[peerId];
      }

      if (this.peerNegotiating[peerId]) {
        delete this.peerNegotiating[peerId];
      }

      if (this.pendingCandidates[peerId]) {
        delete this.pendingCandidates[peerId];
      }

      const wrapper = document.querySelector(`[data-peer-id="${peerId}"]`);
      if (wrapper && wrapper.parentNode) {
        wrapper.parentNode.removeChild(wrapper);
      }

      if (this.remoteVideos[peerId]) {
        delete this.remoteVideos[peerId];
      }
    },

    updateParticipantsList(list) {
      console.log('Updating participants list:', list);
      
      const participantsMap = new Map();
      
      for (const p of list || []) {
        if (!p || !p.id || p.id === this.socket?.id || p.id === this.userId) {
          continue;
        }
        
        let displayName = p.name || p.userName || p.username;
        
        if (displayName && displayName.includes('@')) {
          displayName = displayName.split('@')[0];
        }
        
        if (!displayName || displayName === 'undefined' || displayName === 'null') {
          displayName = `User-${p.id.substring(0, 8)}`;
        }
        
        participantsMap.set(p.id, {
          id: p.id,  // socketId
          socketId: p.id,  // Store socketId explicitly
          userId: p.userId || p._id || p.id,  // Store actual userId from database
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
      
      const existingIndex = this.participants.findIndex(p => p.id === user.id || p.socketId === user.id);
      
      let displayName = user.name || user.userName || user.username || 'Anonymous';
      
      if (displayName && displayName.includes('@')) {
        displayName = displayName.split('@')[0];
      }
      
      if (!displayName || displayName === 'undefined' || displayName === 'null') {
        displayName = `User-${user.id.substring(0, 8)}`;
      }
      
      const participantData = {
        id: user.id,  // This is the socketId
        socketId: user.id,  // Store socketId explicitly
        userId: user.userId || user._id || user.id,  // Store actual userId from database
        name: displayName,
        isHost: user.isHost || false,
        hasMic: user.hasMic || false,
        hasVideo: user.hasVideo || false
      };
      
      console.log('Adding participant with IDs:', {
        socketId: participantData.socketId,
        userId: participantData.userId,
        name: participantData.name
      });
      
      if (existingIndex >= 0) {
        this.participants[existingIndex] = participantData;
      } else {
        this.participants.push(participantData);
      }
    },

    updateParticipantStatus(userId, statusType, isEnabled) {
      // Try to find by userId first, then by socketId
      const participant = this.participants.find(p => p.userId === userId || p.id === userId || p.socketId === userId);
      
      if (participant) {
        if (statusType === 'video') {
          participant.hasVideo = isEnabled;
        } else if (statusType === 'mic') {
          participant.hasMic = isEnabled;
        } else if (statusType === 'screenShare') {
          participant.isScreenSharing = isEnabled;
        }
        
        this.$forceUpdate();
        
        // Update status indicator using socketId
        const socketId = participant.socketId || participant.id;
        const wrapper = document.querySelector(`[data-peer-id="${socketId}"]`);
        
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
      } else {
        console.warn(`Participant not found for userId: ${userId}`);
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
        .then(() => {
          alert("Meeting link copied to clipboard!");
        })
        .catch(err => {
          console.error("Failed to copy link:", err);
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

    async endMeeting() {
      if (!this.isHost) {
        alert("Only host can end the meeting");
        return;
      }

      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/end-meeting`, {
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
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/mute-all`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId: this.roomId })
        });
        
        if (res.ok) {
          console.log("All participants muted");
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
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/lock-meeting`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId: this.roomId })
        });
        
        if (res.ok) {
          console.log("Meeting locked");
          alert("Meeting has been locked");
        }
      } catch(err) {
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
            await el.play().catch(err => {
              console.error('Error playing local screen share:', err);
            });
          }

          let replacementCount = 0;
          for (const peerId in this.peers) {
            const pc = this.peers[peerId];
            console.log(`Replacing track for peer ${peerId}`);
            
            const senders = pc.getSenders();
            const videoSender = senders.find(s => s.track?.kind === 'video');
            
            if (videoSender && videoSender.track) {
              await videoSender.replaceTrack(this.screenTrack);
              console.log(`✅ Replaced video track for peer ${peerId}`);
              replacementCount++;
            } else {
              pc.addTrack(this.screenTrack, stream);
              console.log(`✅ Added screen track for peer ${peerId}`);
              replacementCount++;
              
              await this.renegotiateConnection(peerId);
            }
          }
          
          console.log(`Screen track sent to ${replacementCount} peers`);

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
              console.log(`✅ Restored camera for peer ${peerId}`);
            } else {
              pc.addTrack(videoTrack, this.localStream);
              await this.renegotiateConnection(peerId);
            }
          }
          
        } else {
          const el = this.$refs.localVideo;
          if (el) {
            el.srcObject = null;
          }
          
          for (const peerId in this.peers) {
            const pc = this.peers[peerId];
            const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
            
            if (videoSender) {
              await videoSender.replaceTrack(null);
              console.log(`✅ Removed video for peer ${peerId}`);
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

    async renegotiateConnection(peerId) {
      const pc = this.peers[peerId];
      if (!pc || this.peerNegotiating[peerId]) {
        console.log(`Cannot renegotiate peer ${peerId}`);
        return;
      }

      try {
        this.peerNegotiating[peerId] = true;
        console.log(`Renegotiating connection with ${peerId}...`);
        
        if (pc.signalingState !== 'stable') {
          console.log(`Peer ${peerId} not in stable state: ${pc.signalingState} - waiting...`);
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
          console.log(`✅ Renegotiation offer sent to ${peerId}`);
        } else {
          console.error('Socket not connected - cannot send renegotiation offer');
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

      this.record = !this.record;
      
      if(this.record) {
        try {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
          });
          
          this.recordedChunks = [];
          this.mediaRecorder = new MediaRecorder(screenStream, {mimeType: "video/webm"});
          
          this.mediaRecorder.ondataavailable = (e) => {
            if(e.data && e.data.size > 0) {
              this.recordedChunks.push(e.data);
            }
          };
          
          this.mediaRecorder.onstop = () => {
            const blob = new Blob(this.recordedChunks, {type:"video/webm"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `meeting-${this.roomId}-${Date.now()}.webm`;
            a.click();
            URL.revokeObjectURL(url);
          };
          
          this.mediaRecorder.start();
          this.isRecording = true;
          console.log("Recording started");
        } catch(err) {
          console.error("Recording failed:", err);
          this.record = false;
        }
      } else {
        if(this.mediaRecorder && this.isRecording) {
          this.mediaRecorder.stop();
          this.isRecording = false;
          console.log("Recording stopped");
        }
      }
    },

    async silent_background() {
      if (!this.isHost) {
        alert("Only host can toggle silent background mode");
        return;
      }
      alert("Silent background mode - Work in progress");
    },

    async checkNetworkQuality() {
      if (!this.localStream || Object.keys(this.peers).length === 0) {
        return;
      }

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

    cleanup() {
      console.log('Cleaning up resources...');
      
      if (this.broadcastRetryTimer) {
        clearInterval(this.broadcastRetryTimer);
        this.broadcastRetryTimer = null;
      }
      
      for (const id in this.peers) {
        try { 
          this.peers[id].close(); 
        } catch (e) {
          console.error('Error closing peer connection:', e);
        }
      }
      this.peers = {};
      this.remoteVideos = {};
      this.pendingCandidates = {};
      this.peerNegotiating = {};

      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (e) {
            console.error('Error stopping track:', e);
          }
        });
        this.localStream = null;
      }

      if (this.screenStream) {
        this.screenStream.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (e) {
            console.error('Error stopping screen track:', e);
          }
        });
        this.screenStream = null;
      }

      if (this.mediaRecorder && this.isRecording) {
        try {
          this.mediaRecorder.stop();
        } catch (e) {
          console.error('Error stopping recorder:', e);
        }
      }

      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }

      if (this.networkCheckInterval) {
        clearInterval(this.networkCheckInterval);
        this.networkCheckInterval = null;
      }
      
      if (this.inactivityTimer) {
        clearTimeout(this.inactivityTimer);
        this.inactivityTimer = null;
      }

      if (this.recognition) {
        try {
          this.recognition.stop();
        } catch (e) {
          console.error('Error stopping recognition:', e);
        }
      }

      if (this.$refs.participantsBox) {
        const remoteElements = this.$refs.participantsBox.querySelectorAll('[data-peer-id]');
        remoteElements.forEach(element => {
          try {
            element.remove();
          } catch (e) {
            console.error('Error removing element:', e);
          }
        });
      }

      this.participants = [];
      this.messages = [];
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

  beforeUnmount() {
    this.cleanup();
    
    document.removeEventListener("mousemove", this.resetinactivityTimer);
    document.removeEventListener("keydown", this.resetinactivityTimer);
    document.removeEventListener("click", this.resetinactivityTimer);
    document.removeEventListener("touchstart", this.resetinactivityTimer);
  },

  async mounted() {
    console.log('=== MEETING ROOM MOUNTING ===');
    
    if (!this.initUserFromToken()) {
      return;
    }

    this.roomId = this.computedRoomId;
    
    console.log('Meeting room initialized:', {
      roomId: this.roomId,
      userName: this.userName,
      userId: this.userId,
      isHost: this.isHost
    });
    
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
    document.addEventListener("keydown", this.resetinactivityTimer);
    document.addEventListener("click", this.resetinactivityTimer);
    document.addEventListener("touchstart", this.resetinactivityTimer);

    console.log('=== COMPONENT MOUNTED SUCCESSFULLY ===');
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
  box-shadow: 2px 0 5px rgba(0,0,0,0.3);
  position: fixed;
  top: 0;
  bottom: 0;
  transition: left 0.4s ease, right 0.4s ease;
  z-index: 5;
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

#main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  box-sizing: border-box;
  transition: margin 0.4s ease;
}

#page:not(.tray-on-right):not(.tray-hidden) #main-content {
  margin-left: 200px;
  margin-right: 0;
}
#page.tray-on-right:not(.tray-hidden) #main-content {
  margin-right: 200px;
  margin-left: 0;
}
#page.tray-hidden #main-content {
  margin-left: 0;
  margin-right: 0;
}

#host {
  flex: 3;
  background-color: blue;
  border-radius: 10px;
  margin-bottom: 20px;
  padding-bottom: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}
#host video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  background-color: transparent;
  z-index: 1;
}

#participants {
  flex: 1;
  background-color: #3a3f47;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  padding: 10px;
  margin-bottom: 80px;
  flex-wrap: wrap;
}

#navbar {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  background-color: #1f1f1f;
  height: 60px;
  border-top: 1px solid #444;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 40px;
  box-sizing: border-box;
  z-index: 10;
}
#navbar ul {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 20px;
}
#navbar li { position: relative; }
#navbar li button {
  background-color: white;
  color: black;
  border: none;
  border-radius: 10px;
  padding: 10px 16px;
  cursor: pointer;
  font-size: 14px;
  min-width: 100px;
  text-align: center;
  transition: background 0.3s;
}
#navbar li button:hover { background-color: #ddd; }

#rightpane {
  display: flex;
  gap: 16px;
  align-items: center;
}
#rightpane li { list-style: none; position: relative; }
#rightpane li button {
  background-color: #f0f0f0;
  color: #000;
  border: none;
  border-radius: 10px;
  padding: 10px 16px;
  cursor: pointer;
  font-size: 14px;
  min-width: 100px;
  text-align: center;
  transition: background 0.3s ease;
}

.dropdown { position: relative; }
.dropdown-menu {
  position: absolute;
  bottom: 60px;
  background-color: #1f1f1f;
  border-radius: 6px;
  box-shadow: 0 0 10px rgba(0,0,0,0.3);
  list-style: none;
  min-width: 120px;
  padding: 5px 0;
  z-index: 15;
  display: flex;
  flex-direction: column;
}
.dropdown-menu li {
  margin: 0;
  color: white;
  padding: 8px 15px;
  cursor: pointer;
  transition: background-color 0.2s;
}
.dropdown-menu li:hover { background-color: #333; }

.slide-fade-enter-active, .slide-fade-leave-active { transition: all 0.3s ease; }
.slide-fade-enter-from, .slide-fade-leave-to { opacity: 0; transform: translateY(100%); }

.slide-left-enter-active, .slide-left-leave-active { transition: all 0.4s ease; }
.slide-left-enter-from { transform: translateX(-100%); opacity: 0; }
.slide-left-leave-to { transform: translateX(-100%); opacity: 0; }
.slide-left-enter-to, .slide-left-leave-from { transform: translateX(0); opacity: 1; }

.extras-menu {
  right: 0;
  left: auto;
  bottom: 60px;
  background-color: #1f1f1f;
  padding: 5px 0;
  border-radius: 6px;
  box-shadow: 0 0 10px rgba(0,0,0,0.3);
  list-style: none;
  min-width: 140px;
  position: absolute;
  text-align: left;
  z-index: 15;
  display: flex;
  flex-direction: column;
}
.extras-menu li {
  margin: 0;
  color: white;
  text-decoration: none;
  display: block;
  padding: 8px 15px;
  cursor: pointer;
  transition: background-color 0.2s;
}
.extras-menu li:hover { background-color: #333; }

#chat-box,
#chat-box .chat-body,
#chat-box .message { color: #202124; }

#chat-box {
  position: fixed;
  bottom: 70px;
  right: 0;
  width: 320px;
  height: calc(100vh - 70px);
  background-color: #f8f9fa;
  border-left: 1px solid #ccc;
  display: flex;
  flex-direction: column;
  z-index: 100;
  box-shadow: -2px 0 10px rgba(0,0,0,0.1);
  font-family: 'Segoe UI', sans-serif;
}
.chat-header {
  padding: 14px 16px;
  font-size: 18px;
  font-weight: 600;
  background-color: #e8eaed;
  border-bottom: 1px solid #ccc;
  display: flex;
  color: black;
  justify-content: space-between;
  align-items: center;
}
.chat-body { flex: 1; padding: 16px; overflow-y: auto; }
.message {
  background-color: white;
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 10px;
  border: 1px solid #dadce0;
  box-shadow: 0 1px 3px rgba(60,64,67,0.08);
  max-width: 80%;
}
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
  color: black;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
.chat-send:hover { background-color: #1558d6; }

#list-box,
#list-box .list-body,
#list-box .participant { color: #202124; }

#list-box {
  position: fixed;
  bottom: 70px;
  right: 0;
  width: 320px;
  height: calc(100vh - 70px);
  background-color: #f8f9fa;
  border-left: 1px solid #ccc;
  display: flex;
  flex-direction: column;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
  z-index: 100;
  font-family: 'Segoe UI', sans-serif;
  transition: transform 0.3s ease;
}
.list-header {
  padding: 14px 16px;
  font-size: 18px;
  font-weight: 600;
  background-color: #e8eaed;
  border-bottom: 1px solid #ccc;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.list-body { flex: 1; padding: 16px; overflow-y: auto; }
.participant {
  background-color: white;
  border: 1px solid #dadce0;
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 10px;
  box-shadow: 0 1px 3px rgba(60,64,67,0.1);
}

.tooltip {
  position: absolute;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  background-color: black;
  color: white;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 99;
  pointer-events: none;
}

#info_box {
  position: fixed;
  right: 70px;
  bottom: 70px;
  width: 240px;
  background-color: white;
  color: black;
  border-radius: 10px;
  padding: 15px;
  font-family: 'Segoe UI', sans-serif;
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
#info_header button {
  background: none;
  border: none;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  color: #666;
  padding: 2px 6px;
  border-radius: 3px;
}
#info_header button:hover { background-color: #f0f0f0; }
#info_box hr { border: none; border-top: 1px solid #ddd; margin: 10px 0; }
#info_box p { margin: 8px 0; font-size: 14px; }
#hand_warning {
  position: fixed;
  right: 640px;
  width: 200px;
  bottom: 70px;
  background-color: #333;
  color: white;
  display: flex;
  border-radius: 5px;
  padding-top: 10px;
  padding-left: 10px;
  font-family: 'Segoe UI', sans-serif;
  flex-direction: column;
  z-index: 101;
}
.transcript-box {
  position: absolute;
  bottom: 100px;
  left: 20px;
  background: rgba(0,0,0,0.7);
  color: white;
  padding: 10px;
  max-width: 300px;
  max-height: 200px;
  overflow-y: auto;
  border-radius: 8px;
  font-size: 14px;
}
#copylink {
  background-color: black;
  color: white;
  border-radius: 2px;
}
</style>




