<template>
  <div :class="{'tray-on-right':!turned, 'tray-hidden':!trayVisible}" id="page">
    <!-- Left Tray -->
    <transition name="slide-left">
      <div id="left-tray" :class="turned ? 'left-tray-left' : 'left-tray-right'" v-if="trayVisible">
        <button @click="toggleSilentBackground" :class="{ 'active-feature': silentBackgroundEnabled }">
          {{ silentBackgroundEnabled ? 'Silent Mode ON' : 'Silent Background' }}
        </button>
        <button @click="recording">
          {{ isRecording ? 'Stop Recording' : 'Start Recording' }}
        </button>
        <button @click="turn">Change Panel</button>
        <button @click="toggleFullscreen" :class="{ 'active-feature': isFullscreen }">
          {{ isFullscreen ? 'Exit Fullscreen' : 'Fullscreen' }}
        </button>
        <button @click="emailEnact">Gmail Enact
        </button>
      </div>
    </transition>

    <!-- Main Grid View -->
    <div id="main-content">
      <!-- Grid Container for All Participants -->
      <div id="grid-container" :class="gridClass">
        <!-- Local User (You) -->
        <div class="participant-tile local-participant">
          <video ref="localVideo" autoplay muted playsinline></video>
          <div v-if="!videoon" class="video-placeholder">
            <div class="avatar-circle">{{ userInitials }}</div>
          </div>
          
          <!-- Captions for Local User -->
          <div v-if="showCaptions && localCaptions" class="captions-overlay">
            {{ localCaptions }}
          </div>
          
          <div class="participant-info">
            <span class="participant-name">{{ userName }} (You)</span>
            <div class="participant-controls">
              <span v-if="!micon" class="control-icon muted">🎤</span>
              <span v-if="!videoon" class="control-icon muted">📹</span>
            </div>
          </div>
        </div>

        <!-- Remote Participants -->
        <div 
          v-for="participant in participants" 
          :key="participant.id"
          class="participant-tile"
          :data-peer-id="participant.id"
        >
          <video 
            :ref="`remoteVideo-${participant.id}`"
            autoplay 
            playsinline
          ></video>
          <div class="video-placeholder" v-show="!participant.hasVideo">
            <div class="avatar-circle">{{ getInitials(participant.name) }}</div>
          </div>
          
          <!-- Captions for Remote Participants -->
          <div v-if="showCaptions && participant.captions" class="captions-overlay">
            {{ participant.captions }}
          </div>
          
          <div class="participant-info">
            <span class="participant-name">{{ participant.name }}</span>
            <div class="participant-controls">
              <span v-if="!participant.hasMic" class="control-icon muted">🎤</span>
              <span v-if="!participant.hasVideo" class="control-icon muted">📹</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Captions Panel (when enabled) -->
    <div v-if="showCaptions" class="captions-panel">
      <div class="captions-header">
        <span>📝 Live Captions</span>
        <button @click="toggleCaptions" class="close-captions">✕</button>
      </div>
      <div class="captions-content">
        <div v-for="(caption, index) in captionHistory" :key="index" class="caption-line">
          <strong>{{ caption.speaker }}:</strong> {{ caption.text }}
        </div>
      </div>
    </div>

    <!-- Bottom Navigation Bar -->
    <transition name="slide-fade">
      <div id="navbar" v-show="trayVisible">
        <ul>
          <li>
            <button
              @mouseenter="() => setHover('mic')"
              @mouseleave="() => setHover(null)"
              @click="toggleMic"
              :class="{ 'active': micon, 'inactive': !micon }"
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
              :class="{ 'active': videoon, 'inactive': !videoon }"
            >
              <IconMaterialSymbolsVideocam />
            </button>
            <ul v-if="hoveredIcon === 'video'" class="tooltip">
              <li>{{ videoon ? 'Stop Video' : 'Start Video' }}</li>
            </ul>
          </li>
          <li>
            <button
              v-show="!isMobile"
              @mouseenter="() => setHover('share')"
              @mouseleave="() => setHover(null)"
              @click="sharescreen"
              :class="{ 'active': isScreenSharing }"
            >
              <IconMaterialSymbolsScreenShare />
            </button>
            <ul v-if="hoveredIcon === 'share'" class="tooltip">
              <li>{{ isScreenSharing ? 'Stop Sharing' : 'Share Screen' }}</li>
            </ul>
          </li>
          <li>
            <button
              @click="leave"
              @mouseenter="() => setHover('leave')"
              @mouseleave="() => setHover(null)"
              class="leave-button"
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
              <span class="participant-count">{{ totalParticipantCount }}</span>
            </button>
            <ul v-if="hoveredIcon === 'participants'" class="tooltip">
              <li>Participants</li>
            </ul>
            <div id="list-box" v-if="activePanel === 'list'">
              <div class="list-header">
                Participants ({{ totalParticipantCount }})
                <button @click="togglePanel(null)">✕</button>
              </div>
              <div class="list-body">
                <div class="participant self">
                  <div class="participant-avatar">{{ userInitials }}</div>
                  <div class="participant-details">
                    <div class="participant-name-text">{{ userName }} (You)</div>
                    <div class="participant-status">{{ isHost ? 'Host' : 'Participant' }}</div>
                  </div>
                </div>
                <div class="participant" v-for="p in participants" :key="p.id">
                  <div class="participant-avatar">{{ getInitials(p.name) }}</div>
                  <div class="participant-details">
                    <div class="participant-name-text">{{ p.name }}</div>
                    <div class="participant-status">{{ p.isHost ? 'Host' : 'Participant' }}</div>
                  </div>
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
                <button @click="togglePanel(null)">✕</button>
              </div>
              <div class="chat-body" ref="chatBody">
                <div v-for="(msg, index) in messages" :key="index" class="message">
                  <div class="message-sender">{{ msg.sender }}</div>
                  <div class="message-text">{{ msg.text }}</div>
                  <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
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
                <button class="chat-send" @click="sendMessage" :disabled="!newMessage.trim()">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                  </svg>
                </button>
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
                {{ hand ? '✋ Lower hand' : '✋ Raise hand' }}
              </li>
              <li @click.stop="toggleCaptions">
                {{ showCaptions ? '📝 Hide Captions' : '📝 Show Captions' }}
              </li>
              <li @click.stop="toggle_info">
                ℹ️ Meeting Info
              </li>
              <li v-if="isHost" @click.stop="muteAll">
                🔇 Mute All
              </li>
              <li v-if="isHost" @click.stop="endMeeting">
                🛑 End Meeting
              </li>
            </ul>
          </li>

          <!--Add extras option-->
        </ul>
      </div>
    </transition>

    <!-- Meeting Info Modal - REPOSITIONED TO BOTTOM RIGHT -->
    <div id="info_box" v-if="show_info" @click.stop>
      <div id="inside_info">
        <div id="info_header">
          <b>Meeting Info</b>
          <button @click.stop="close_info">✕</button>
        </div>
        <hr />
        <div class="info-row">
          <span class="info-label">Meeting Title:</span>
          <span class="info-value">{{ title }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Room ID:</span>
          <span class="info-value">{{ roomId.substring(0, 20) }}...</span>
        </div>
        <div class="info-row">
          <span class="info-label">Participants:</span>
          <span class="info-value">{{ totalParticipantCount }}</span>
        </div>
        <button id="copylink" @click="copystring">📋 Copy Meeting Link</button>
      </div>
    </div>

    <!-- Hand Raised Notification -->
    <div id="hand_warning" v-if="hand">
      <p>✋ Your hand is raised</p>
    </div>

    <!-- Email Permission Dialog -->
    <div v-if="showEmailPermissionDialog" class="email-permission-overlay">
    <div class="email-permission-box">
      <h3>Gmail Access</h3>
      <p>Allow Coretalk to send emails on your behalf via Gmail?</p>
      <div class="email-permission-buttons">
        <button @click="emailPermissionResponse('deny')" class="perm-deny">Deny</button>
        <button @click="emailPermissionResponse('once')" class="perm-once">Allow Once</button>
        <button @click="emailPermissionResponse('always')" class="perm-always">Always Allow</button>
      </div>
    </div>
  </div>

  <!-- Email Panel -->
  <div v-if="showEmailPanel" id="email-box">
    <div class="email-header">
      <span>New Email</span>
      <button @click="showEmailPanel = false">✕</button>
    </div>
    <div class="email-body-panel">
      <input v-model="emailTo" type="email" placeholder="To" class="email-field" />
      <input v-model="emailSubject" type="text" placeholder="Subject" class="email-field" />
      <textarea v-model="emailBody" placeholder="Write your message..." class="email-textarea"></textarea>
    </div>
    <div class="email-footer">
      <button @click="sendEmail" :disabled="emailSending" class="email-send-btn">
        {{ emailSending ? 'Sending...' : 'Send' }}
      </button>
    </div>
  </div>
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
      isFullscreen: false,
      
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
      
      livekitRoom: null,
      livekitToken: null,
      remoteParticipants: new Map(),
      
      isPoorNetwork: false,
      transcript: [],
      networkCheckInterval: null,
      recognition: null,
      
      broadcastQueue: [],
      isInitializingMedia: false,
      broadcastRetryTimer: null,

      // New features
      showCaptions: false,
      captionHistory: [],
      localCaptions: '',
      silentBackgroundEnabled: false,
      backgroundNoiseSuppressionStream: null,
      backgroundNoiseSuppressionTrack: null,

      showEmailPanel: false,
      showEmailPermissionDialog: false,
      emailPermissionGranted: false,
      gmailAccessToken: null,
      emailTo: '',
      emailSubject: '',
      emailBody: '',
      emailSending: false,

      isMobile: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || !navigator.mediaDevices?.getDisplayMedia,
    };
  },

  computed: {
    computedRoomId() {
      return this.$route.params.id || 'default-room';
    },
    
    totalParticipantCount() {
  // Use participants array (socket-synced) + self = most accurate count
      return this.participants.length + 1;
    },

    userInitials() {
      return this.getInitials(this.userName);
    },

    gridClass() {
      const total = this.totalParticipantCount;
      if (total === 1) return 'grid-1';
      if (total === 2) return 'grid-2';
      if (total <= 4) return 'grid-4';
      if (total <= 6) return 'grid-6';
      if (total <= 9) return 'grid-9';
      return 'grid-many';
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
    getInitials(name) {
      if (!name) return '?';
      const parts = name.trim().split(' ');
      if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    },

    formatTime(timestamp) {
      const date = new Date(timestamp);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    },

    toggleFullscreen() {
      if (!this.isFullscreen) {
        this.enterFullscreen();
      } else {
        this.exitFullscreen();
      }
    },

    enterFullscreen() {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      }
      this.isFullscreen = true;
    },

    exitFullscreen() {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
      this.isFullscreen = false;
    },

    handleFullscreenChange() {
      this.isFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement
      );
    },

    handleEscKey(e) {
      if (e.key === 'Escape' && this.isFullscreen) {
        this.exitFullscreen();
      }
    },

    toggleCaptions() {
      this.showCaptions = !this.showCaptions;
      this.activeDropdown = null;
      
      if (this.showCaptions) {
        this.startCaptionRecognition();
      } else {
        this.stopCaptionRecognition();
      }
    },

    startCaptionRecognition() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert('Speech recognition not supported in this browser');
        this.showCaptions = false;
        return;
      }

      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        this.localCaptions = interimTranscript || finalTranscript;

        if (finalTranscript) {
          this.captionHistory.push({
            speaker: this.userName,
            text: finalTranscript.trim(),
            timestamp: Date.now()
          });

          if (this.captionHistory.length > 50) {
            this.captionHistory.shift();
          }

          setTimeout(() => {
            this.localCaptions = '';
          }, 2000);
        }
      };

      this.recognition.onerror = (e) => {
        console.error('Speech recognition error:', e);
      };

      this.recognition.onend = () => {
        if (this.showCaptions) {
          this.recognition.start();
        }
      };

      this.recognition.start();
    },

    stopCaptionRecognition() {
      if (this.recognition) {
        this.recognition.stop();
        this.recognition = null;
      }
      this.localCaptions = '';
    },

    // ==================== SILENT BACKGROUND (FIXED) ====================

async toggleSilentBackground() {
  this.silentBackgroundEnabled = !this.silentBackgroundEnabled;

  if (this.silentBackgroundEnabled) {
    await this.enableBackgroundNoiseSuppression();
  } else {
    await this.disableBackgroundNoiseSuppression();
  }
},

async enableBackgroundNoiseSuppression() {
  try {
    // Guard: must be connected to LiveKit
    if (!this.livekitRoom || !this.livekitRoom.localParticipant) {
      alert('Not connected to meeting room. Please join first.');
      this.silentBackgroundEnabled = false;
      return;
    }

    // Request a new stream with maximum noise suppression constraints
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Additional suppression hints (Chrome/Edge support)
          googNoiseSuppression: true,
          googHighpassFilter: true,
          googNoiseSuppression2: true,
          googEchoCancellation: true,
          googAutoGainControl: true,
        },
        video: false,
      });
    } catch (permError) {
      console.error('Microphone permission denied:', permError);
      alert('Microphone permission denied. Please allow microphone access.');
      this.silentBackgroundEnabled = false;
      return;
    }

    const rawAudioTrack = stream.getAudioTracks()[0];

    if (!rawAudioTrack) {
      alert('Could not get audio track for noise suppression.');
      this.silentBackgroundEnabled = false;
      stream.getTracks().forEach(t => t.stop());
      return;
    }

    // Confirm the browser actually honoured noiseSuppression
    const settings = rawAudioTrack.getSettings();
    console.log('Audio track settings after constraint apply:', settings);

    if (settings.noiseSuppression === false) {
      console.warn('Browser did not honour noiseSuppression constraint.');
    }

    // Unpublish the current mic track from LiveKit
    const existingPub = this.livekitRoom.localParticipant.getTrack(
      Track.Source.Microphone
    );
    if (existingPub && existingPub.track) {
      await this.livekitRoom.localParticipant.unpublishTrack(
        existingPub.track
      );
    }

    // Wrap raw MediaStreamTrack in a LiveKit LocalAudioTrack and publish
    const { LocalAudioTrack } = await import('livekit-client');
    const livekitAudioTrack = new LocalAudioTrack(rawAudioTrack, undefined, false);

    await this.livekitRoom.localParticipant.publishTrack(livekitAudioTrack, {
      source: Track.Source.Microphone,
    });

    // Store both so we can clean up properly on disable
    this.backgroundNoiseSuppressionTrack = livekitAudioTrack;
    this.backgroundNoiseSuppressionStream = stream;

    // Keep micon state in sync
    this.micon = true;

    console.log('✅ Background noise suppression enabled and published to LiveKit.');
  } catch (error) {
    console.error('Error enabling noise suppression:', error);
    alert('Could not enable Silent Background: ' + error.message);
    this.silentBackgroundEnabled = false;

    // Clean up any partial state
    if (this.backgroundNoiseSuppressionStream) {
      this.backgroundNoiseSuppressionStream.getTracks().forEach(t => t.stop());
      this.backgroundNoiseSuppressionStream = null;
    }
    this.backgroundNoiseSuppressionTrack = null;
  }
},

async disableBackgroundNoiseSuppression() {
  try {
    if (!this.livekitRoom || !this.livekitRoom.localParticipant) {
      return;
    }

    // Unpublish the noise-suppressed track
    if (this.backgroundNoiseSuppressionTrack) {
      await this.livekitRoom.localParticipant.unpublishTrack(
        this.backgroundNoiseSuppressionTrack
      );
      this.backgroundNoiseSuppressionTrack = null;
    }

    // Stop the underlying MediaStream
    if (this.backgroundNoiseSuppressionStream) {
      this.backgroundNoiseSuppressionStream.getTracks().forEach(t => t.stop());
      this.backgroundNoiseSuppressionStream = null;
    }

    // Re-publish a standard mic track so audio continues working
    if (this.micon) {
      await this.livekitRoom.localParticipant.setMicrophoneEnabled(false);
      await this.livekitRoom.localParticipant.setMicrophoneEnabled(true);
    }

    console.log('✅ Background noise suppression disabled. Standard mic restored.');
  } catch (error) {
    console.error('Error disabling noise suppression:', error);
  }
},
    
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
      
      let token;
      let wsUrl;
      
      if (typeof tokenData === 'string') {
        token = tokenData;
        wsUrl = `wss://${import.meta.env.VITE_LIVEKIT_URL || 'coretalk-e6xkfd5h.livekit.cloud'}`;
      } else if (tokenData.token) {
        if (typeof tokenData.token === 'string') {
          token = tokenData.token;
        } else if (typeof tokenData.token === 'object') {
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
      console.log('WS URL:', wsUrl);
      
      if (typeof token !== 'string' || token.length < 20 || token === '[object Object]') {
        console.error('Invalid token format:', token);
        alert('Failed to get valid authentication token.');
        return;
      }
      
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        console.error('Token does not have JWT structure:', token);
        alert('Invalid token structure.');
        return;
      }

      this.livekitRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      this.livekitRoom.on(RoomEvent.ConnectionStateChanged, (state) => {
        console.log('LiveKit connection state:', state);
        if (state === ConnectionState.Connected) {
          console.log('Connected to LiveKit room');
        }
      });

      this.livekitRoom.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log('LiveKit participant joined:', participant.identity);
        this.handleParticipantConnected(participant);
      });

      this.livekitRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log('LiveKit participant left:', participant.identity);
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

      try {
        console.log('Attempting to connect to LiveKit...');
        await this.livekitRoom.connect(wsUrl, token);
        
        console.log('LiveKit room connected successfully');
        console.log('Room name:', this.livekitRoom.name);
        
        this.livekitToken = token;
      } catch (error) {
        console.error('Failed to connect to LiveKit:', error);
        alert('Failed to join meeting room: ' + error.message);
      }
    },
    
   /* handleParticipantConnected(participant) {
      const participantData = {
        id: participant.identity,
        userId: participant.identity,
        name: participant.name || participant.identity,
        isHost: false,
        hasMic: false,
        hasVideo: false,
        captions: ''
      };

      const existingIndex = this.participants.findIndex(p => p.id === participant.identity);
      if (existingIndex >= 0) {
        this.participants[existingIndex] = participantData;
      } else {
        this.participants.push(participantData);
      }

      this.remoteParticipants.set(participant.identity, participant);
    },*/

    handleParticipantConnected(participant) {
  // Remove any duplicate first
  this.participants = this.participants.filter(
    p => p.id !== participant.identity
  );

  this.participants.push({
    id: participant.identity,
    userId: participant.identity,
    name: participant.name || participant.identity,
    isHost: false,
    hasMic: false,
    hasVideo: false,
    captions: ''
  });

  this.remoteParticipants.set(participant.identity, participant);
},

    handleParticipantDisconnected(participant) {
      this.participants = this.participants.filter(p => p.id !== participant.identity);
      this.remoteParticipants.delete(participant.identity);
    },

    handleTrackSubscribed(track, participant) {
      if (track.kind === Track.Kind.Video) {
        this.attachVideoToGrid(track, participant);
      } else if (track.kind === Track.Kind.Audio) {
        this.attachAudio(track, participant);
      }

      this.updateRemoteTrackDisplay(participant);
    },

    handleTrackUnsubscribed(track, participant) {
      this.updateRemoteTrackDisplay(participant);
    },

    attachVideoToGrid(track, participant) {
      this.$nextTick(() => {
        const tile = document.querySelector(`[data-peer-id="${participant.identity}"]`);
        if (tile) {
          const videoElement = tile.querySelector('video');
          if (videoElement) {
            track.attach(videoElement);
          }
        }
      });
    },

    attachAudio(track, participant) {
      const audioElement = track.attach();
      audioElement.play().catch(err => {
        console.error('Error playing audio:', err);
      });
    },

    updateRemoteTrackDisplay(participant) {
      const videoPublication = participant.getTrack(Track.Source.Camera);
      const hasVideo = videoPublication && !videoPublication.isMuted;

      const audioPublication = participant.getTrack(Track.Source.Microphone);
      const hasMic = audioPublication && !audioPublication.isMuted;

      const p = this.participants.find(p => p.id === participant.identity);
      if (p) {
        p.hasMic = hasMic;
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

      this.socket.on('participants-list', (list) => {
        // LiveKit handles participant tracks — socket only syncs metadata
        list
          .filter(p => p.userId !== this.userId)
          .forEach(p => {
            const existing = this.participants.find(ep => ep.userId === p.userId);
            if (existing) {
              existing.isHost = p.isHost || false;
              existing.name = p.name || existing.name;
            }
          });
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
          console.log('Muting microphone...');
          await this.livekitRoom.localParticipant.setMicrophoneEnabled(false);
          this.micon = false;
          console.log('Microphone muted');
        } else {
          console.log('Unmuting microphone...');
          
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
          } catch (permError) {
            console.warn('Permission request failed:', permError);
          }
          
          await this.livekitRoom.localParticipant.setMicrophoneEnabled(true);
          this.micon = true;
          console.log('Microphone enabled');
        }
      } catch (error) {
        console.error('Error toggling microphone:', error);
        
        if (error.name === 'NotAllowedError') {
          alert('Microphone permission denied. Please allow microphone access in your browser settings.');
        } else if (error.message && error.message.includes('structuredClone')) {
          alert('Browser compatibility issue. Please try refreshing the page or using Chrome/Edge.');
        } else {
          alert('Could not access microphone: ' + error.message);
        }
        
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
          console.log('Turning off camera...');
          await this.livekitRoom.localParticipant.setCameraEnabled(false);
          this.videoon = false;
          
          const videoElement = this.$refs.localVideo;
          if (videoElement) videoElement.srcObject = null;
          console.log('Camera disabled');
        } else {
          console.log('Turning on camera...');
          
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
              video: { 
                width: { ideal: 1280 },
                height: { ideal: 720 }
              } 
            });
            stream.getTracks().forEach(track => track.stop());
          } catch (permError) {
            console.warn('Permission request failed:', permError);
          }
          
          await this.livekitRoom.localParticipant.setCameraEnabled(true);
          this.videoon = true;
          
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const videoTrack = this.livekitRoom.localParticipant.getTrack(Track.Source.Camera);
          if (videoTrack && videoTrack.track) {
            const videoElement = this.$refs.localVideo;
            if (videoElement) {
              videoTrack.track.attach(videoElement);
            }
          }
          console.log('Camera enabled');
        }
      } catch (error) {
        console.error('Error toggling camera:', error);
        
        if (error.name === 'NotAllowedError') {
          alert('Camera permission denied. Please allow camera access in your browser settings.');
        } else if (error.message && error.message.includes('structuredClone')) {
          alert('Browser compatibility issue. Please try:\n1. Refreshing the page\n2. Using Chrome/Edge browser\n3. Updating your browser');
        } else {
          alert('Could not access camera: ' + error.message);
        }
        
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
          
          const screenTrack = this.livekitRoom.localParticipant.getTrack(Track.Source.ScreenShare);
          if (screenTrack) {
            const videoElement = this.$refs.localVideo;
            if (videoElement) {
              screenTrack.track.attach(videoElement);
            }
          }
          console.log('Screen sharing started');
        } else {
          await this.stopScreenShare();
        }
      } catch (error) {
        console.error('Error sharing screen:', error);
        
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
        console.log('Screen sharing stopped');
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
      this.activeDropdown = null;
    },

    close_info() {
      this.show_info = false;
    },

    copystring() {
      const meetingLink = this.roomId;
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

    async checkNetworkQuality() {
      if (!this.livekitRoom) return;
    },

    emailEnact() {
      this.initiateGmailOAuth();
    },

    initiateGmailOAuth() {
      const clientId = import.meta.env.VITE_GMAIL_CLIENT_ID;
      const redirectUri = import.meta.env.VITE_GMAIL_REDIRECT_URI;
      const scope = 'https://www.googleapis.com/auth/gmail.send';
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}`;
      const popup = window.open(authUrl,'gmail-oauth','width=500,height=600');
      console.log('Auth URL:', authUrl);
      window.addEventListener('message',(event) => {
        if(event.data?.type === 'gmail-oauth-success') {
          this.gmailAccessToken = event.data.token;
          this.showEmailPanel = true;
          //popup?.close();
        }
      }, { once: true });
    },

    async sendEmail() {
      if(!this.emailTo || !this.emailSubject || !this.emailBody) {
        alert('Please fill in all fields');
        return;
      }
      this.emailSending = true;
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/send-email`, {
          method: 'POST',
          headers: {'Content-Type':'application/json' },
          body: JSON.stringify({
            accessToken: this.gmailAccessToken,
            senderEmail: localStorage.getItem('username'),
            to: this.emailTo,
            subject: this.emailSubject,
            body: this.emailBody
          })
        });
        if(response.ok) {
          this.emailTo = '';
          this.emailSubject = '';
          this.emailBody = '';
          this.showEmailPanel = false;
        }
        else{
          throw new Error('Failed to send');
        }
      }
      catch(err) 
      {
        alert('Failed to send email: ' + err.message);
      }
      finally {
        this.emailSending = false;
      }
    },
    
    async cleanup() {
      console.log('Cleaning up resources...');
      
      if (this.broadcastRetryTimer) {
        clearInterval(this.broadcastRetryTimer);
        this.broadcastRetryTimer = null;
      }

      if (this.showCaptions) {
        this.stopCaptionRecognition();
      }

      if (this.silentBackgroundEnabled) {
        await this.disableBackgroundNoiseSuppression(); 
        this.silentBackgroundEnabled = false;
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
      this.captionHistory = [];
      this.localCaptions = '';

      this.showEmailPanel = false;
      this.gmailAccessToken = null;
      this.emailTo = '';
      this.emailSubject = '',
      this.emailBody = '';
    }
  },

  async beforeUnmount() {
    this.cleanup();
    
    document.removeEventListener("mousemove", this.resetinactivityTimer);
    document.removeEventListener("keydown", this.resetinactivityTimer);
    document.removeEventListener("click", this.resetinactivityTimer);
    document.removeEventListener("touchstart", this.resetinactivityTimer);
    document.removeEventListener("fullscreenchange", this.handleFullscreenChange);
    document.removeEventListener("webkitfullscreenchange", this.handleFullscreenChange);
    document.removeEventListener("msfullscreenchange", this.handleFullscreenChange);
    document.removeEventListener("keydown", this.handleEscKey);
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
    
    this.initSocket();
    await this.initLivekit();
    
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

    // Fullscreen event listeners
    document.addEventListener("fullscreenchange", this.handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", this.handleFullscreenChange);
    document.addEventListener("msfullscreenchange", this.handleFullscreenChange);
    document.addEventListener("keydown", this.handleEscKey);

    console.log('=== COMPONENT MOUNTED SUCCESSFULLY ===');
  }
};
</script>

<style>
/* ==================== GLOBAL STYLES ==================== */
body {
  background-color: #1c1c1c;
  margin: 0;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  color: white;
  overflow: hidden;
}

#page {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background-color: #1c1c1c;
}

/* ==================== LEFT TRAY ==================== */
#left-tray {
  width: 220px;
  background-color: #2d2d2d;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 2px 0 10px rgba(0,0,0,0.3);
  position: fixed;
  top: 0;
  bottom: 0;
  transition: left 0.3s ease, right 0.3s ease;
  z-index: 5;
}

.left-tray-left { left: 0; right: auto; }
.left-tray-right { right: 0; left: auto; }

#left-tray button {
  background-color: #3a3a3a;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

#left-tray button:hover { 
  background-color: #4a4a4a; 
}

#left-tray button.active-feature {
  background-color: #4CAF50;
  box-shadow: 0 0 10px rgba(76, 175, 80, 0.5);
}

/* ==================== MAIN GRID LAYOUT ==================== */
#main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  padding-bottom: 80px;
  box-sizing: border-box;
  transition: margin 0.3s ease;
  overflow: hidden;
}

#page:not(.tray-on-right):not(.tray-hidden) #main-content {
  margin-left: 220px;
  margin-right: 0;
}
#page.tray-on-right:not(.tray-hidden) #main-content {
  margin-right: 220px;
  margin-left: 0;
}
#page.tray-hidden #main-content {
  margin-left: 0;
  margin-right: 0;
}

/* ==================== GRID CONTAINER ==================== */
#grid-container {
  display: grid;
  gap: 12px;
  width: 100%;
  height: 100%;
  padding: 0;
}

/* Dynamic Grid Layouts */
.grid-1 {
  grid-template-columns: 1fr;
  grid-template-rows: 1fr;
}

.grid-2 {
  grid-template-columns: 1fr;
  grid-template-rows: repeat(2, 1fr);
}

@media (min-width: 769px) {
  .grid-2 {
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: 1fr;
  }
}

.grid-4 {
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
}

.grid-6 {
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(2, 1fr);
}

.grid-9 {
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
}

.grid-many {
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  grid-auto-rows: minmax(200px, 1fr);
  overflow-y: auto;
}

/* ==================== PARTICIPANT TILES ==================== */
.participant-tile {
  position: relative;
  background-color: #2a2a2a;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  transition: transform 0.2s;
}

.participant-tile:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
}

.participant-tile video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: absolute;
  top: 0;
  left: 0;
}

.video-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
}

.video-placeholder.hidden {
  display: none;
}

.avatar-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: rgba(255,255,255,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: bold;
  color: white;
  border: 3px solid rgba(255,255,255,0.3);
}

.participant-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 2;
}

.participant-name {
  font-size: 14px;
  font-weight: 600;
  color: white;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}

.participant-controls {
  display: flex;
  gap: 6px;
}

.control-icon {
  font-size: 16px;
  opacity: 0.9;
}

.control-icon.muted {
  opacity: 0.5;
}

.local-participant {
  border: 2px solid #4CAF50;
}

/* ==================== CAPTIONS OVERLAY ==================== */
.captions-overlay {
  position: absolute;
  bottom: 50px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  max-width: 80%;
  text-align: center;
  z-index: 3;
  box-shadow: 0 2px 8px rgba(0,0,0,0.5);
}

.captions-panel {
  position: fixed;
  bottom: 70px;
  left: 20px;
  width: 350px;
  max-height: 250px;
  background-color: #2a2a2a;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  z-index: 50;
  display: flex;
  flex-direction: column;
}

.captions-header {
  padding: 12px 16px;
  background-color: #333;
  border-bottom: 1px solid #444;
  border-radius: 12px 12px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.close-captions {
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
}

.captions-content {
  padding: 12px 16px;
  overflow-y: auto;
  flex: 1;
}

.caption-line {
  margin-bottom: 8px;
  font-size: 13px;
  line-height: 1.4;
  color: #e0e0e0;
}

.caption-line strong {
  color: #4CAF50;
}

/* ==================== BOTTOM NAVBAR ==================== */
#navbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 70px;
  background-color: #202020;
  border-top: 1px solid #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 40px;
  box-sizing: border-box;
  z-index: 10;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.3);
}

#navbar ul {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 12px;
}

#navbar li {
  position: relative;
}

#navbar button {
  background-color: #3a3a3a;
  color: white;
  border: none;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  cursor: pointer;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

#navbar button:hover {
  background-color: #4a4a4a;
  transform: scale(1.1);
}

#navbar button.active {
  background-color: #4CAF50;
}

#navbar button.inactive {
  background-color: #d32f2f;
}

#navbar button.leave-button {
  background-color: #d32f2f;
}

#navbar button.leave-button:hover {
  background-color: #b71c1c;
}

#rightpane {
  display: flex;
  gap: 12px;
}

.participant-count {
  position: absolute;
  top: -4px;
  right: -4px;
  background-color: #4CAF50;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.message-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background-color: #f44336;
  color: white;
  border-radius: 50%;
  min-width: 20px;
  height: 20px;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  padding: 0 4px;
}

/* ==================== TOOLTIPS ==================== */
.tooltip {
  position: absolute;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0,0,0,0.9);
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 99;
  pointer-events: none;
  list-style: none;
  margin: 0;
}

.tooltip li {
  margin: 0;
  padding: 0;
}

/* ==================== DROPDOWNS ==================== */
.dropdown {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  bottom: 60px;
  right: 0;
  background-color: #2a2a2a;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  list-style: none;
  min-width: 180px;
  padding: 8px 0;
  z-index: 15;
}

.dropdown-menu li {
  margin: 0;
  color: white;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 14px;
}

.dropdown-menu li:hover {
  background-color: #3a3a3a;
}

/* ==================== PANELS (CHAT & PARTICIPANTS) - WHITE THEME ==================== */
#chat-box,
#list-box {
  position: fixed;
  bottom: 70px;
  right: 0;
  width: 340px;
  height: calc(100vh - 70px);
  background-color: #ffffff;
  border-left: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  z-index: 100;
  box-shadow: -4px 0 12px rgba(0,0,0,0.1);
}

.chat-header,
.list-header {
  padding: 16px;
  font-size: 16px;
  font-weight: 600;
  background-color: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  color: #000000;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-header button,
.list-header button {
  background: none;
  border: none;
  color: #000000;
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.chat-header button:hover,
.list-header button:hover {
  background-color: #e0e0e0;
}

.chat-body,
.list-body {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  background-color: #ffffff;
}

/* CHAT MESSAGES */
.message {
  background-color: #f5f5f5;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 12px;
  border: 1px solid #e0e0e0;
}

.message-sender {
  font-weight: 600;
  font-size: 13px;
  color: #4CAF50;
  margin-bottom: 4px;
}

.message-text {
  font-size: 14px;
  color: #333333;
  word-wrap: break-word;
}

.message-time {
  font-size: 11px;
  color: #888888;
  margin-top: 4px;
}

.chat-input-section {
  display: flex;
  padding: 12px;
  border-top: 1px solid #e0e0e0;
  background-color: #ffffff;
  gap: 8px;
}

.chat-input {
  flex: 1;
  padding: 10px 16px;
  border-radius: 24px;
  border: 1px solid #e0e0e0;
  outline: none;
  background-color: #f5f5f5;
  color: #000000;
  font-size: 14px;
}

.chat-input::placeholder {
  color: #888888;
}

.chat-send {
  padding: 10px;
  width: 44px;
  height: 44px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
  flex-shrink: 0;
}

.chat-send:hover {
  background-color: #45a049;
}

.chat-send:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.chat-send svg {
  transform: rotate(-45deg);
}

/* PARTICIPANTS LIST */
.participant {
  background-color: #f5f5f5;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid #e0e0e0;
}

.participant.self {
  border: 2px solid #4CAF50;
  background-color: #e8f5e9;
}

.participant-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: white;
  font-size: 16px;
  flex-shrink: 0;
}

.participant-details {
  flex: 1;
}

.participant-name-text {
  font-size: 14px;
  font-weight: 600;
  color: #000000;
  margin-bottom: 2px;
}

.participant-status {
  font-size: 12px;
  color: #666666;
}

/* ==================== MEETING INFO MODAL - WHITE THEME & BOTTOM RIGHT ==================== */
#info_box {
  position: fixed;
  bottom: 80px;
  right: 20px;
  width: 360px;
  max-width: 90vw;
  background-color: #ffffff;
  color: #000000;
  border-radius: 12px;
  padding: 24px;
  z-index: 101;
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  border: 1px solid #e0e0e0;
}

#info_header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

#info_header b {
  font-size: 18px;
  font-weight: 600;
  color: #000000;
}

#info_header button {
  background: none;
  border: none;
  font-size: 20px;
  color: #000000;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

#info_header button:hover {
  background-color: #f5f5f5;
}

#info_box hr {
  border: none;
  border-top: 1px solid #e0e0e0;
  margin: 16px 0;
}

.info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 14px;
}

.info-label {
  color: #666666;
}

.info-value {
  color: #000000;
  font-weight: 500;
}

#copylink {
  width: 100%;
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  margin-top: 16px;
  transition: background-color 0.2s;
}

#copylink:hover {
  background-color: #45a049;
}

/* ==================== HAND RAISED NOTIFICATION ==================== */
#hand_warning {
  position: fixed;
  top: 20px;
  right: 20px;
  background-color: #FFA726;
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  z-index: 101;
  font-weight: 600;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* ==================== TRANSITIONS ==================== */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.3s ease;
}

.slide-left-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}

.slide-left-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

/* ==================== SCROLLBAR STYLING ==================== */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #f5f5f5;
}

::-webkit-scrollbar-thumb {
  background: #cccccc;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #aaaaaa;
}

/* Dark scrollbars for dark panels */
.captions-content::-webkit-scrollbar-track {
  background: #2a2a2a;
}

.captions-content::-webkit-scrollbar-thumb {
  background: #555;
}

.captions-content::-webkit-scrollbar-thumb:hover {
  background: #666;
}

/* ==================== EMAIL PANEL ==================== */
#email-box {
  position: fixed;
  bottom: 80px;
  right: 20px;
  width: 340px;
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  border: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  z-index: 101;
}

.email-header {
  padding: 14px 16px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  border-radius: 12px 12px 0 0;
  font-weight: 600;
  font-size: 15px;
  color: #000;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.email-header button {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #000;
}

.email-body-panel {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.email-field {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  color: #000;
  background: #f9f9f9;
  outline: none;
  box-sizing: border-box;
}

.email-textarea {
  width: 100%;
  height: 120px;
  padding: 9px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  color: #000;
  background: #f9f9f9;
  outline: none;
  resize: none;
  box-sizing: border-box;
}

.email-footer {
  padding: 12px 16px;
  border-top: 1px solid #e0e0e0;
}

.email-send-btn {
  width: 100%;
  padding: 10px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.email-send-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.email-permission-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.email-permission-box {
  background: #fff;
  border-radius: 12px;
  padding: 28px;
  width: 340px;
  text-align: center;
  color: #000;
}

.email-permission-box h3 {
  margin: 0 0 10px;
  font-size: 18px;
}

.email-permission-box p {
  font-size: 14px;
  color: #555;
  margin-bottom: 20px;
}

.email-permission-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.perm-deny { background: #f44336; color: white; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; }
.perm-once { background: #FF9800; color: white; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; }
.perm-always { background: #4CAF50; color: white; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; }

/* ==================== RESPONSIVE DESIGN ==================== */
@media (max-width: 768px) {
  #left-tray {
    width: 180px;
  }
  
  #chat-box,
  #list-box {
    width: 100%;
  }
  
  .grid-many {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
  
  #navbar {
    padding: 0 16px;
  }
  
  #navbar button {
    width: 40px;
    height: 40px;
    font-size: 18px;
  }

  .captions-panel {
    width: calc(100% - 40px);
    left: 20px;
    right: 20px;
  }

  #info_box {
    width: calc(100% - 40px);
    right: 20px;
    left: 20px;
  }
}
</style>





