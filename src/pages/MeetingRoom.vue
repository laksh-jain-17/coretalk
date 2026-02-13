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
              <span class="participant-count">({{ totalParticipantCount }})</span>
            </button>
            <ul v-if="hoveredIcon === 'participants'" class="tooltip">
              <li>Participants</li>
            </ul>
            <div id="list-box" v-if="activePanel === 'list'">
              <div class="list-header">
                Participants ({{ totalParticipantCount }})
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
                    <p>Participants: {{ totalParticipantCount }}</p>
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
import { Room, RoomEvent, Track, ConnectionState } from 'livekit-client';

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
      isScreenSharing: false,
      
      mediaRecorder: null,
      recordedChunks: [],
      isRecording: false,
      record: false,
      
      // Socket.io for chat and signaling
      socket: null,
      isSocketConnected: false,
      participants: [],
      messages: [],
      newMessage: '',
      unreadMessages: 0,
      
      // LiveKit
      livekitRoom: null,
      livekitToken: null,
      remoteParticipants: new Map(),
      
      isPoorNetwork: false,
      transcript: [],
      networkCheckInterval: null,
      recognition: null,
      
      broadcastQueue: [],
      isInitializingMedia: false,
      broadcastRetryTimer: null
    };
  },

  computed: {
    computedRoomId() {
      return this.$route.params.id || 'default-room';
    },
    
    // FIXED: Accurate participant count from LiveKit
    totalParticipantCount() {
      if (!this.livekitRoom) return 1; // Just the local user
      
      // Get count from LiveKit room (includes local participant)
      const livekitCount = this.livekitRoom.remoteParticipants.size + 1;
      return livekitCount;
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

    async getLivekitToken() {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/livekit/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomName: this.roomId,
            participantName: this.userName,
            userId: this.userId,
            isHost: this.isHost
          })
        });

        if (!response.ok) {
          throw new Error('Failed to get LiveKit token');
        }

        const data = await response.json();
        console.log('Raw token response:', data);
        return data;
      } catch (error) {
        console.error('Error getting LiveKit token:', error);
        alert('Failed to connect to meeting room');
        return null;
      }
    },

    async initLivekit() {
      console.log('=== INITIALIZING LIVEKIT ===');
      
      const tokenData = await this.getLivekitToken();
      if (!tokenData) {
        console.error('No tokenData received');
        return;
      }

      console.log('Token data received:', tokenData);
      console.log('Token data type:', typeof tokenData);
      
      // FIXED: Properly extract the token string
      let token;
      let wsUrl;
      
      // Handle different response formats from your backend
      if (typeof tokenData === 'string') {
        // If the entire response is the token
        token = tokenData;
        wsUrl = `wss://${import.meta.env.VITE_LIVEKIT_URL || 'coretalk-e6xkfd5h.livekit.cloud'}`;
      } else if (tokenData.token) {
        // If tokenData has a token property
        if (typeof tokenData.token === 'string') {
          token = tokenData.token;
        } else if (typeof tokenData.token === 'object') {
          // If token is nested in an object
          token = tokenData.token.token || tokenData.token.value || String(tokenData.token);
        } else {
          token = String(tokenData.token);
        }
        wsUrl = tokenData.url || tokenData.wsUrl || `wss://${import.meta.env.VITE_LIVEKIT_URL || 'coretalk-e6xkfd5h.livekit.cloud'}`;
      } else {
        console.error('Unexpected token data format:', tokenData);
        alert('Failed to parse authentication token');
        return;
      }

      console.log('Extracted token type:', typeof token);
      console.log('Extracted token length:', token?.length);
      console.log('Extracted token (first 50 chars):', token?.substring(0, 50));
      console.log('WS URL:', wsUrl);
      
      // Validate token is actually a JWT string
      if (typeof token !== 'string' || token.length < 20 || token === '[object Object]') {
        console.error('❌ Invalid token format:', token);
        alert('Failed to get valid authentication token. Token format is invalid.');
        return;
      }
      
      // Validate token has JWT structure (header.payload.signature)
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        console.error('❌ Token does not have JWT structure:', token);
        alert('Invalid token structure. Expected JWT format.');
        return;
      }

      this.livekitRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      // LiveKit event handlers
      this.livekitRoom.on(RoomEvent.ConnectionStateChanged, (state) => {
        console.log('LiveKit connection state:', state);
        if (state === ConnectionState.Connected) {
          console.log('✅ Connected to LiveKit room');
          console.log('✅ Total participants:', this.livekitRoom.remoteParticipants.size + 1);
        }
      });

      this.livekitRoom.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log('LiveKit participant joined:', participant.identity);
        console.log('Updated participant count:', this.livekitRoom.remoteParticipants.size + 1);
        this.handleParticipantConnected(participant);
      });

      this.livekitRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log('LiveKit participant left:', participant.identity);
        console.log('Updated participant count:', this.livekitRoom.remoteParticipants.size + 1);
        this.handleParticipantDisconnected(participant);
      });

      this.livekitRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log('Track subscribed:', track.kind, 'from', participant.identity);
        this.handleTrackSubscribed(track, participant);
      });

      this.livekitRoom.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        console.log('Track unsubscribed:', track.kind, 'from', participant.identity);
        this.handleTrackUnsubscribed(track, participant);
      });

      this.livekitRoom.on(RoomEvent.TrackMuted, (publication, participant) => {
        console.log('Track muted:', publication.kind, 'from', participant.identity);
        this.updateRemoteTrackDisplay(participant);
      });

      this.livekitRoom.on(RoomEvent.TrackUnmuted, (publication, participant) => {
        console.log('Track unmuted:', publication.kind, 'from', participant.identity);
        this.updateRemoteTrackDisplay(participant);
      });

      // FIXED: Connect to room with proper token validation
      try {
        console.log('Attempting to connect with:');
        console.log('- Token type:', typeof token);
        console.log('- Token starts with:', token.substring(0, 20));
        console.log('- WS URL:', wsUrl);
        
        await this.livekitRoom.connect(wsUrl, token);
        
        console.log('✅ LiveKit room connected successfully');
        console.log('✅ Room name:', this.livekitRoom.name);
        console.log('✅ Local participant:', this.livekitRoom.localParticipant.identity);
        
        this.livekitToken = token;
      } catch (error) {
        console.error('❌ Failed to connect to LiveKit:', error);
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
        console.error('Token that failed (first 50 chars):', token.substring(0, 50));
        console.error('WS URL:', wsUrl);
        alert('Failed to join meeting room: ' + error.message);
      }
    },
    
    handleParticipantConnected(participant) {
      const participantData = {
        id: participant.identity,
        userId: participant.identity,
        name: participant.name || participant.identity,
        isHost: false,
        hasMic: false,
        hasVideo: false
      };

      const existingIndex = this.participants.findIndex(p => p.id === participant.identity);
      if (existingIndex >= 0) {
        this.participants[existingIndex] = participantData;
      } else {
        this.participants.push(participantData);
      }

      this.remoteParticipants.set(participant.identity, participant);
    },

    handleParticipantDisconnected(participant) {
      this.participants = this.participants.filter(p => p.id !== participant.identity);
      this.remoteParticipants.delete(participant.identity);

      // Remove video element
      const wrapper = document.querySelector(`[data-peer-id="${participant.identity}"]`);
      if (wrapper && wrapper.parentNode) {
        wrapper.parentNode.removeChild(wrapper);
      }
    },

    handleTrackSubscribed(track, participant) {
      if (track.kind === Track.Kind.Video) {
        this.attachVideo(track, participant);
      } else if (track.kind === Track.Kind.Audio) {
        this.attachAudio(track, participant);
      }

      this.updateRemoteTrackDisplay(participant);
    },

    handleTrackUnsubscribed(track, participant) {
      this.updateRemoteTrackDisplay(participant);
    },

    attachVideo(track, participant) {
      let wrapper = document.querySelector(`[data-peer-id="${participant.identity}"]`);
      
      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.setAttribute('data-peer-id', participant.identity);
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
        vid.muted = true;
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
          font-size: 14px;
        `;
        placeholder.textContent = 'Video Off';

        const label = document.createElement('div');
        label.textContent = participant.name || participant.identity;
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

        if (this.$refs.participantsBox) {
          this.$refs.participantsBox.appendChild(wrapper);
        }
      }

      const videoElement = wrapper.querySelector('video');
      if (videoElement) {
        track.attach(videoElement);
      }
    },

    attachAudio(track, participant) {
      const audioElement = track.attach();
      audioElement.play().catch(err => {
        console.error('Error playing audio:', err);
      });
    },

    updateRemoteTrackDisplay(participant) {
      const wrapper = document.querySelector(`[data-peer-id="${participant.identity}"]`);
      if (!wrapper) return;

      const videoElement = wrapper.querySelector('video');
      const placeholder = wrapper.querySelector('.video-placeholder');

      const videoPublication = participant.getTrack(Track.Source.Camera);
      const hasVideo = videoPublication && !videoPublication.isMuted;

      if (hasVideo) {
        if (videoElement) videoElement.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';
      } else {
        if (videoElement) videoElement.style.display = 'none';
        if (placeholder) placeholder.style.display = 'flex';
      }

      // Update participant status
      const p = this.participants.find(p => p.id === participant.identity);
      if (p) {
        const audioPublication = participant.getTrack(Track.Source.Microphone);
        p.hasMic = audioPublication && !audioPublication.isMuted;
        p.hasVideo = hasVideo;
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

      this.socket.on('meeting-locked', () => {
        alert('Meeting has been locked by the host');
      });

      this.socket.on('all-muted', () => {
        if (!this.isHost && this.micon) {
          this.toggleMic();
        }
      });
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

    // FIXED: Proper async media initialization with error handling
    async toggleMic() {
      if (this.isInitializingMedia) {
        console.log('Media initialization in progress, ignoring toggle');
        return;
      }
      
      if (!this.livekitRoom || !this.livekitRoom.localParticipant) {
        alert('Not connected to meeting room');
        return;
      }
      
      this.isInitializingMedia = true;

      try {
        if (this.micon) {
          // Mute microphone
          console.log('Muting microphone...');
          await this.livekitRoom.localParticipant.setMicrophoneEnabled(false);
          this.micon = false;
          console.log('✅ Microphone muted');
        } else {
          // Unmute microphone
          console.log('Unmuting microphone...');
          await this.livekitRoom.localParticipant.setMicrophoneEnabled(true);
          this.micon = true;
          console.log('✅ Microphone enabled');
        }
      } catch (error) {
        console.error('❌ Error toggling microphone:', error);
        alert('Could not access microphone. Please check permissions: ' + error.message);
        this.micon = false;
      } finally {
        this.isInitializingMedia = false;
      }
    },

    async toggleVideo() {
      if (this.isInitializingMedia) {
        console.log('Media initialization in progress, ignoring toggle');
        return;
      }
      
      if (!this.livekitRoom || !this.livekitRoom.localParticipant) {
        alert('Not connected to meeting room');
        return;
      }
      
      this.isInitializingMedia = true;

      try {
        if (this.videoon) {
          // Turn off camera
          console.log('Turning off camera...');
          await this.livekitRoom.localParticipant.setCameraEnabled(false);
          this.videoon = false;
          
          const videoElement = this.$refs.localVideo;
          if (videoElement) videoElement.srcObject = null;
          console.log('✅ Camera disabled');
        } else {
          // Turn on camera
          console.log('Turning on camera...');
          await this.livekitRoom.localParticipant.setCameraEnabled(true);
          this.videoon = true;
          
          // Attach local video track to video element
          const videoTrack = this.livekitRoom.localParticipant.getTrack(Track.Source.Camera);
          if (videoTrack) {
            const videoElement = this.$refs.localVideo;
            if (videoElement) {
              videoTrack.track.attach(videoElement);
            }
          }
          console.log('✅ Camera enabled');
        }
      } catch (error) {
        console.error('❌ Error toggling camera:', error);
        alert('Could not access camera. Please check permissions: ' + error.message);
        this.videoon = false;
      } finally {
        this.isInitializingMedia = false;
      }
    },

    async sharescreen() {
      if (!this.livekitRoom || !this.livekitRoom.localParticipant) {
        alert('Not connected to meeting room');
        return;
      }
      
      try {
        if (!this.isScreenSharing) {
          console.log('Starting screen share...');
          
          await this.livekitRoom.localParticipant.setScreenShareEnabled(true);
          this.isScreenSharing = true;
          
          // Display screen share locally
          const screenTrack = this.livekitRoom.localParticipant.getTrack(Track.Source.ScreenShare);
          if (screenTrack) {
            const videoElement = this.$refs.localVideo;
            if (videoElement) {
              screenTrack.track.attach(videoElement);
            }
          }
          console.log('✅ Screen sharing started');
        } else {
          await this.stopScreenShare();
        }
      } catch (error) {
        console.error('❌ Error sharing screen:', error);
        
        if (error.name === 'NotAllowedError') {
          alert('Screen sharing permission denied.');
        } else {
          alert('Could not start screen sharing: ' + error.message);
        }
        
        this.isScreenSharing = false;
      }
    },

    async stopScreenShare() {
      try {
        await this.livekitRoom.localParticipant.setScreenShareEnabled(false);
        this.isScreenSharing = false;
        
        // Restore camera if it was on
        if (this.videoon) {
          const videoTrack = this.livekitRoom.localParticipant.getTrack(Track.Source.Camera);
          if (videoTrack) {
            const videoElement = this.$refs.localVideo;
            if (videoElement) {
              videoTrack.track.attach(videoElement);
            }
          }
        } else {
          const videoElement = this.$refs.localVideo;
          if (videoElement) videoElement.srcObject = null;
        }
        console.log('✅ Screen sharing stopped');
      } catch (error) {
        console.error('Error stopping screen share:', error);
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
      if (!this.livekitRoom) return;
      
      // Monitor connection quality using LiveKit stats
      const stats = this.livekitRoom.getActiveDevice();
      // Implement network quality monitoring if needed
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

      if (this.livekitRoom) {
        this.livekitRoom.disconnect();
        this.livekitRoom = null;
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
      this.broadcastQueue = [];
      this.remoteParticipants.clear();
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
    
    // Initialize Socket.io for chat
    this.initSocket();
    
    // Initialize LiveKit for video/audio
    await this.initLivekit();
    
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
/* Styles remain the same */
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
