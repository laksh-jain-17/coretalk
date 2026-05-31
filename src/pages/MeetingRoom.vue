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
        <button v-if="!isGuest" @click="emailEnact">Gmail Enact</button>
        <button @click="showWhiteboard = !showWhiteboard" :class="{ 'active-feature': showWhiteboard }">
            {{ showWhiteboard ? 'Whiteboard ON' : 'Whiteboard' }}
        </button>
        <button @click="toggleDocEnact" :class="{'active-feature':showDocEnact}">
          {{ showDocEnact ? 'Doc Enact ON' : 'Doc Enact' }}
        </button>
        <button @click="toggleAiNotes" :class="{ 'active-feature': showAiNotes }">
          {{ showAiNotes ? 'AI Summary ON' : 'AI Summary' }}
        </button>
      </div>
    </transition>

    <!-- Main Grid View -->
    <div id="main-content">
      <!-- Grid Container for All Participants -->
      <div id="grid-container" :class="gridClass">
        <!-- Local User (You) -->
      <div class="participant-tile local-participant">
        <video
          ref="localVideo"
          autoplay
          muted
          playsinline
          :style="{ display: (videoon || isScreenSharing) ? 'block' : 'none' }"
        ></video>
          <button
              v-if="isMobile && (videoon || isScreenSharing)"
              @click="flipCamera"
            style="
              position: absolute; top: 10px; right: 10px; z-index: 3;
              background: rgba(0,0,0,0.5); border: none; border-radius: 50%;
              width: 36px; height: 36px; color: white; font-size: 18px;
              cursor: pointer; display: flex; align-items: center; justify-content: center;
            "
          >🔄</button>

          <div v-if="!videoon && !isScreenSharing" class="video-placeholder">
            <div class="avatar-circle">{{ userInitials }}</div>
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

    <!-- Bottom Navigation Bar -->
    <transition name="slide-fade">
      <div id="navbar" v-show="trayVisible">
        <ul>
          <li>
            <!-- AFTER -->
            <button
              @mouseenter="() => setHover('mic')"
              @mouseleave="() => setHover(null)"
              @click="toggleMic"
              :class="{ 'active': micon, 'inactive': !micon }"
              :disabled="isHostMuteLocked && !isHost"
              :style="isHostMuteLocked && !isHost ? 'opacity:0.4; cursor:not-allowed;' : ''"
              :title="isHostMuteLocked && !isHost ? 'Muted by host' : ''"
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
                <div style="display:flex; flex-direction:column; gap:4px; flex:1;">
                  <span style="font-size:16px; font-weight:600; color:#000;">Chat</span>
                  <select
                    v-model="selectedRecipient"
                    style="font-size:12px; border:1px solid #e0e0e0; border-radius:6px;
                    padding:3px 6px; color:#333; background:#f9f9f9; cursor:pointer;
                     max-width:200px; outline:none;"
                    >
                      <option value="all">All Participants</option>
                      <option
                        v-for="p in participants"
                        :key="p.socketId || p.id"
                        :value="p.socketId || p.userId || p.id"
                        >{{ p.name }}</option>
                  </select>
                </div>
              <button @click="togglePanel(null)">✕</button>  
            </div>
              <div class="chat-body" ref="chatBody">
                <div v-for="(msg, index) in filteredMessages" :key="index"
                   class="message"
                   :style="msg.isPrivate ? 'border-left: 3px solid #7c3aed; background:#f5f3ff;' : ''">
                  <div class="message-sender">{{ msg.sender }}</div>
                    <div v-if="msg.privateLabel"
                     style="font-size:11px; color:#7c3aed; font-weight:600; margin-bottom:3px;">
                       {{ msg.privateLabel }}
                    </div>
                  <div class="message-text">{{ msg.text }}</div>
                  <div v-if="msg.attachments && msg.attachments.length > 0">
                    <div v-for="(att, i) in msg.attachments" :key="i">
                    <img
                      v-if="att.mimeType && att.mimeType.startsWith('image/')"
                      :src="'data:' + att.mimeType + ';base64,' + att.base64"
                      style="max-width:200px; border-radius:8px; margin-top:6px;"
                    />
                    <a
                    v-else
                      :href="'data:' + att.mimeType + ';base64,' + att.base64"
                      :download="att.name"
                       style="display:block; margin-top:6px; color:#3730a3;"
                    >    
                    + {{ att.name }} ({{ formatFileSize(att.size) }})
                  </a>
                  </div>
                </div>
                  <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
                </div>
              </div>
              <div class="chat-input-section" style="flex-direction:column; gap:0;">
                <!-- Attachment previews -->
                <div v-if="chatAttachments.length > 0" style="
                display:flex; flex-wrap:wrap; gap:6px;
                padding:8px 12px; border-top:1px solid #e0e0e0; background:#fafafa;
                ">
                  <div
                    v-for="(att, i) in chatAttachments"
                    :key="i"
                    style="display:flex; align-items:center; gap:6px; background:#eef2ff;
                    border-radius:20px; padding:4px 10px; font-size:12px; color:#3730a3;"
                  >
                    <img v-if="att.previewUrl" :src="att.previewUrl"
                     style="width:24px; height:24px; border-radius:4px; object-fit:cover;" />
                    <span v-else style="font-size:14px;">📎</span>
                    <span style="max-width:100px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                      {{ att.name }}
                    </span>
                    <span style="opacity:0.6;">{{ formatFileSize(att.size) }}</span>
                      <button @click="removeChatAttachment(i)"
                    style="background:none; border:none; cursor:pointer; color:#3730a3;
                     font-size:14px; padding:0; line-height:1;">✕</button>
                  </div>
                </div>
                <!-- Input row -->
                <div style="display:flex; padding:12px; gap:8px; align-items:center;">
                  <label v-if="!isGuest" style="cursor:pointer; color:#888; font-size:20px; line-height:1; flex-shrink:0;"
                   title="Attach file">
                  +
                  <input type="file" multiple style="display:none;"
                   @change="handleChatAttachments" accept="*/*" />
                  </label>
                <input
                  type="text"
                  class="chat-input"
                  v-model="newMessage"
                  placeholder="Type a message..."
                  @keyup.enter="sendMessage"
                  maxlength="500"
                />
                <button class="chat-send" @click="sendMessage"
                  :disabled="!newMessage.trim() && chatAttachments.length === 0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                 viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
                </button>
              </div>
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
              <li @click.stop="toggle_info">
                ℹ️ Meeting Info
              </li>
              <li v-if="isHost" @click.stop="muteAll" :style="isMuteAllActive ? 'color:#f44336' : ''">
                {{ isMuteAllActive ? '🔇 Unmute All' : '🔇 Mute All' }}
              </li>
              <li v-if="isHost" @click.stop="openExpelModal">
                🚫 Expel Members
              </li>
              <li v-if="isHost" @click.stop="endMeeting">
                🛑 End Meeting
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </transition>

    <!-- Expel Members Modal (Host only) -->
    <div v-if="showExpelModal && isHost" class="expel-overlay" @click.self="showExpelModal = false">
      <div class="expel-box" @click.stop>
        <div class="expel-header">
          <b>🚫 Expel Members</b>
          <button @click="showExpelModal = false">✕</button>
        </div>
        <div class="expel-body">
          <p v-if="participants.length === 0" style="color:#888; font-size:13px; text-align:center; margin:20px 0;">
            No other participants in the meeting.
          </p>
          <label
            v-for="p in participants"
            :key="p.socketId || p.id"
            class="expel-member-row"
          >
            <input
              type="checkbox"
              :value="p.socketId || p.userId || p.id"
              v-model="expelSelected"
              class="expel-checkbox"
            />
            <div class="expel-avatar">{{ getInitials(p.name) }}</div>
            <div class="expel-member-info">
              <div class="expel-member-name">{{ p.name }}</div>
              <div class="expel-member-role">{{ p.isHost ? 'Host' : 'Participant' }}</div>
            </div>
          </label>
        </div>
        <div class="expel-footer">
          <button
            class="expel-cancel-btn"
            @click="showExpelModal = false"
          >Cancel</button>
          <button
            class="expel-confirm-btn"
            :disabled="expelSelected.length === 0"
            @click="expelSelectedMembers"
          >
            Remove ({{ expelSelected.length }})
          </button>
        </div>
      </div>
    </div>

    <!-- Meeting Info Modal -->
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
        <button id="copylink" @click="copystring">Copy Meeting Link</button>
      </div>
    </div>

    <!-- Hand Raised Notification -->
    <div id="hand_warning" v-if="hand">
      <p>✋ Your hand is raised</p>
    </div>

    <!-- Other participants' raised hands -->
    <div
      v-for="h in raisedHands.filter(h => h.userId !== userId)"
      :key="h.userId"
      style="
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
        background: #FFA726; color: white; padding: 10px 20px;
        border-radius: 8px; font-weight: 600; z-index: 101;
        animation: slideIn 0.3s ease; margin-top: 8px;
      "
    >
      ✋ {{ h.userName }} raised their hand
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
        <span>Gmail</span>
        <button @click="showEmailPanel = false">✕</button>
      </div>

      <!-- Tabs -->
      <div class="email-tabs">
        <button
          class="email-tab-btn"
          :class="{ active: emailActiveTab === 'compose' }"
          @click="emailActiveTab = 'compose'"
        >Compose</button>
        <button
          class="email-tab-btn"
          :class="{ active: emailActiveTab === 'inbox' }"
          @click="emailActiveTab = 'inbox'; fetchInbox()"
        >Inbox</button>
      </div>

      <!-- Compose Tab -->
      <template v-if="emailActiveTab === 'compose'">
  <div class="email-body-panel">
    <!--input v-model="emailTo" type="email" placeholder="To" class="email-field" /-->
    <div>
      <div class="email-recipients-wrapper" :class="{ 'field-error-border': emailErrors.recipients }">
        <div class="email-chips-row">
          <span
            v-for="(addr, i) in emailToList"
            :key="i"
            class="email-chip"
          >
            {{ addr }}
            <button @click="removeRecipient(i)">✕</button>
          </span>
          <input
            v-model="emailToInput"
            type="text"
            placeholder="Add recipient & press Enter or comma"
            class="email-chip-input"
            @keydown.enter.prevent="addRecipient"
            @keydown.tab.prevent="addRecipient"
            @keydown.","="addRecipient"
            @blur="addRecipient"
          />
        </div>
      </div>
      <span v-if="emailErrors.recipients" class="field-error-msg">{{ emailErrors.recipients }}</span>
    </div>

    <div>
      <input
        v-model="emailSubject"
        type="text"
        placeholder="Subject"
        class="email-field"
        :class="{ 'field-error-border': emailErrors.subject }"
      />
      <span v-if="emailErrors.subject" class="field-error-msg">{{ emailErrors.subject }}</span>
    </div>

    <div>
      <textarea
        v-model="emailBody"
        placeholder="Write your message..."
        class="email-textarea"
        :class="{ 'field-error-border': emailErrors.body }"
      ></textarea>
      <span v-if="emailErrors.body" class="field-error-msg">{{ emailErrors.body }}</span>
    </div>

    <div class="email-attach-row">
      <label class="email-attach-btn">
        Attach files
        <input type="file" multiple ref="emailFileInput" @change="handleEmailAttachments" style="display:none" />
      </label>
      <div class="email-attach-list">
        <span v-for="(f, i) in emailAttachments" :key="i" class="email-attach-chip">
          {{ f.name }}
          <button @click="removeAttachment(i)">✕</button>
        </span>
      </div>
    </div>
  </div>

  <div class="email-footer">
    <button @click="sendEmail" :disabled="emailSending" class="email-send-btn">
      {{ emailSending ? 'Sending...' : 'Send' }}
    </button>
  </div>
</template>

      <!-- Inbox Tab -->
      <template v-if="emailActiveTab === 'inbox'">
        <div class="email-inbox-panel">
          <div v-if="inboxLoading" class="email-inbox-loading">Loading...</div>
          <div v-else-if="inboxError" class="email-inbox-error">{{ inboxError }}</div>
          <div v-else-if="inboxMessages.length === 0" class="email-inbox-empty">No recent emails</div>
          <div
            v-for="msg in inboxMessages"
            :key="msg.id"
            class="email-inbox-item"
            @click="selectedInboxMsg = selectedInboxMsg?.id === msg.id ? null : msg"
          >
            <div class="email-inbox-item-header">
              <span class="email-inbox-from">{{ msg.from }}</span>
              <span class="email-inbox-date">{{ msg.date }}</span>
            </div>
            <div class="email-inbox-subject">{{ msg.subject }}</div>
            <div v-if="selectedInboxMsg?.id === msg.id" class="email-inbox-preview">{{ msg.snippet }}</div>
          </div>
        </div>
      </template>
    </div>

    <!-- Reconnecting overlay -->
    <transition name="slide-fade">
      <div v-if="connectionStatus === 'reconnecting'" style="
        position: fixed; inset: 0; background: rgba(0,0,0,0.7);
        display: flex; flex-direction: column; align-items: center;
        justify-content: center; z-index: 200; gap: 16px;
      ">
        <div style="width:40px;height:40px;border:3px solid #4CAF50;
          border-top-color:transparent;border-radius:50%;
          animation:spin 0.8s linear infinite;"></div>
        <p style="color:white;font-size:16px;margin:0">Reconnecting to meeting...</p>
      </div>
    </transition>
    <div
      v-for="(wp, index) in waitingParticipants"
      :key="wp.socketId"
      :style="{
        position: 'fixed',
        top: (20 + index * 84) + 'px',
        right: '20px',
        width: '290px',
        background: '#ffffff',
        border: '1px solid #e0e0e0',
        borderRadius: '12px',
        padding: '14px 16px',
        zIndex: 160,
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        animation: 'slideIn 0.3s ease'
      }"
    >
      <p style="margin:0 0 10px; font-size:13px; font-weight:600; color:#000;">
         <strong>{{ wp.userName }}</strong> wants to join
      </p>
      <div style="display:flex; gap:8px;">
        <button @click="admitParticipant(wp.socketId)" style="
          flex:1; padding:8px; background:#4CAF50; color:white;
          border:none; border-radius:8px; cursor:pointer;
          font-size:13px; font-weight:600;">Accept</button>
        <button @click="denyParticipant(wp.socketId)" style="
          flex:1; padding:8px; background:#0d0907; color:white;
          border:none; border-radius:8px; cursor:pointer;
          font-size:13px; font-weight:600;">Deny</button>
      </div>
    </div>
    <WhiteboardPanel v-if="showWhiteboard" :socket="socket" :roomId="roomId" @close="showWhiteboard = false"/>
    <div
      v-if="showAiNotes"
      class="ai-notes-wrapper"
      :class="{ 'ai-notes-faded': aiNotesFaded }"
      @mouseenter="onAiNotesMouseEnter"
      @mouseleave="onAiNotesMouseLeave"
    >
      <AiNotesPanel :roomTitle="title" @close="closeAiNotes"/>
    </div>
    <DocEnactPanel v-if="showDocEnact && livekitRoom" :livekitRoom="livekitRoom" :isHost="isHost" :userId="userId" :participants="participants" :roomId="roomId" :socket="socket" @close="toggleDocEnact"/>
  </div>
</template>
<script>
import { jwtDecode } from 'jwt-decode';
import { io } from 'socket.io-client';
import { Room, RoomEvent, Track, ConnectionState } from 'livekit-client';
import WhiteboardPanel from '../components/WhiteboardPanel.vue';
import AiNotesPanel from '../components/AiNotesPanel.vue';
import DocEnactPanel from '../components/DocEnactPanel.vue';
export default {
  name: 'MeetingRoom',
  components: {
    WhiteboardPanel,
    AiNotesPanel,
    DocEnactPanel,
  },
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
      emailErrors: { recipients: '', subject: '', body: '' },
      emailSending: false,
      emailActiveTab: 'compose',
      inboxMessages: [],
      inboxLoading: false,
      inboxError: null,
      selectedInboxMsg: null,

      isMobile: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || !navigator.mediaDevices?.getDisplayMedia,
      connectionStatus: 'connected',
      raisedHands: [],
      facingMode: 'user',
      emailAttachments: [],
      chatAttachments: [],  
      waitingParticipants: [],
      isGuest: localStorage.getItem('isGuest') === 'true',
      isCleanedUp: false,
      showWhiteboard: false,
      showAiNotes: false,
      showDocEnact: false,
      showExpelModal: false,
      expelSelected: [],
      guestInactivityTimer: null,
      aiNotesFaded: false,
      aiNotesFadeTimer: null,
      remoteAudioElements: new Map(),

      emailToList: [],       
      emailToInput: '', 
      isHostMuteLocked: false,
      isMuteAllActive: false,
      selectedRecipient: 'all',
    };
  },

  computed: {
    computedRoomId() {
      return this.$route.params.id || 'default-room';
    },

    totalParticipantCount() {
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
    },

    filteredMessages() {
      if (this.selectedRecipient === 'all') {
        return this.messages.filter(msg => !msg.isPrivate);
      }
      const recipient = this.participants.find(
        p => (p.socketId || p.userId || p.id) === this.selectedRecipient
      );
      const recipientName = recipient?.name;
      return this.messages.filter(msg => {
        if (!msg.isPrivate) return false;
        if (msg.privateLabel?.includes(recipientName)) return true;
        if (msg.sender === recipientName) return true;
        return false;
      });
    },
  },

  watch: {
    isPoorNetwork(newVal) {
      if (newVal) {
        console.log('Poor network -> Transcript enabled');
        this.recognition?.start();
      } else {
        console.log('Network normal -> Transcript disabled');
        this.recognition?.stop();
      }
    },

    showAiNotes(newVal) {
      if (newVal) {
        if (this.aiNotesFadeTimer) clearTimeout(this.aiNotesFadeTimer);
        this.aiNotesFadeTimer = setTimeout(() => {
          this.aiNotesFaded = true;
        }, 5000);
      } 
      else {
        this.aiNotesFaded = false;
        if (this.aiNotesFadeTimer) {
          clearTimeout(this.aiNotesFadeTimer);
          this.aiNotesFadeTimer = null;
        }
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

    toggleAiNotes() {
      this.showAiNotes = !this.showAiNotes;
    },

    closeAiNotes() {
      this.showAiNotes = false;
      this.aiNotesFaded = false;
      if (this.aiNotesFadeTimer) {
        clearTimeout(this.aiNotesFadeTimer);
        this.aiNotesFadeTimer = null;
      }
    },

    // ==================== SILENT BACKGROUND ====================

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
        if (!this.livekitRoom || !this.livekitRoom.localParticipant) {
         // alert('Not connected to meeting room. Please join first.');//
          this.silentBackgroundEnabled = false;
          return;
        }

        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
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
         // alert('Microphone permission denied. Please allow microphone access.');//
          this.silentBackgroundEnabled = false;
          return;
        }

        const rawAudioTrack = stream.getAudioTracks()[0];

        if (!rawAudioTrack) {
         // alert('Could not get audio track for noise suppression.');//
          this.silentBackgroundEnabled = false;
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        const settings = rawAudioTrack.getSettings();
        console.log('Audio track settings after constraint apply:', settings);

        if (settings.noiseSuppression === false) {
          console.warn('Browser did not honour noiseSuppression constraint.');
        }

        // Unpublish current mic track
        const existingPub = this._getLocalTrack(Track.Source.Microphone);
        if (existingPub && existingPub.track) {
          await this.livekitRoom.localParticipant.unpublishTrack(existingPub.track);
        }

        const { LocalAudioTrack } = await import('livekit-client');
        const livekitAudioTrack = new LocalAudioTrack(rawAudioTrack, undefined, false);

        await this.livekitRoom.localParticipant.publishTrack(livekitAudioTrack, {
          source: Track.Source.Microphone,
        });

        this.backgroundNoiseSuppressionTrack = livekitAudioTrack;
        this.backgroundNoiseSuppressionStream = stream;
        this.micon = true;

        console.log('Background noise suppression enabled and published to LiveKit.');
      } catch (error) {
        console.error('Error enabling noise suppression:', error);
        //alert('Could not enable Silent Background: ' + error.message);//
        this.silentBackgroundEnabled = false;

        if (this.backgroundNoiseSuppressionStream) {
          this.backgroundNoiseSuppressionStream.getTracks().forEach(t => t.stop());
          this.backgroundNoiseSuppressionStream = null;
        }
        this.backgroundNoiseSuppressionTrack = null;
      }
    },

    async disableBackgroundNoiseSuppression() {
      try {
        if (!this.livekitRoom || !this.livekitRoom.localParticipant) return;

        if (this.backgroundNoiseSuppressionTrack) {
          await this.livekitRoom.localParticipant.unpublishTrack(
            this.backgroundNoiseSuppressionTrack
          );
          this.backgroundNoiseSuppressionTrack = null;
        }

        if (this.backgroundNoiseSuppressionStream) {
          this.backgroundNoiseSuppressionStream.getTracks().forEach(t => t.stop());
          this.backgroundNoiseSuppressionStream = null;
        }

        if (this.micon) {
          await this.livekitRoom.localParticipant.setMicrophoneEnabled(false);
          await this.livekitRoom.localParticipant.setMicrophoneEnabled(true);
        }

        console.log('Background noise suppression disabled. Standard mic restored.');
      } catch (error) {
        console.error('Error disabling noise suppression:', error);
      }
    },

    // ==================== HELPER: safely get local track publication ====================
    // FIXED: replaces getTrackPublication (not available in all livekit-client versions)
    _getLocalTrack(source) {
      if (!this.livekitRoom || !this.livekitRoom.localParticipant) return null;
      const lp = this.livekitRoom.localParticipant;

      // Method 1: getTrack (available in most versions)
      if (typeof lp.getTrack === 'function') {
        const pub = lp.getTrack(source);
        if (pub) return pub;
      }

      // Method 2: iterate trackPublications map
      const pubs = lp.trackPublications;
      if (pubs) {
        const entries = typeof pubs.values === 'function'
          ? [...pubs.values()]
          : Object.values(pubs);
        for (const pub of entries) {
          if (pub.source === source) return pub;
        }
      }

      // Method 3: videoTrackPublications / audioTrackPublications
      const subMap = source === Track.Source.Camera || source === Track.Source.ScreenShare
        ? lp.videoTrackPublications
        : lp.audioTrackPublications;

      if (subMap) {
        const entries = typeof subMap.values === 'function'
          ? [...subMap.values()]
          : Object.values(subMap);
        for (const pub of entries) {
          if (pub.source === source) return pub;
        }
      }

      return null;
    },

    // ==================== ATTACH LOCAL CAMERA TRACK (FIXED) ====================
    attachLocalCameraTrack() {
      const videoElement = this.$refs.localVideo;
      if (!videoElement) return;

      const lp = this.livekitRoom.localParticipant;

      // Method 1: getTrack (most compatible — avoids missing getTrackPublication)
      if (typeof lp.getTrack === 'function') {
        const pub = lp.getTrack(Track.Source.Camera);
        if (pub && pub.track) {
          pub.track.attach(videoElement);
          console.log('Camera attached via getTrack');
          return;
        }
      }

      // Method 2: iterate trackPublications map
      const pubs = lp.trackPublications;
      if (pubs) {
        const entries = typeof pubs.values === 'function'
          ? [...pubs.values()]
          : Object.values(pubs);
        for (const pub of entries) {
          if (pub.source === Track.Source.Camera && pub.track) {
            pub.track.attach(videoElement);
            console.log('Camera attached via trackPublications iteration');
            return;
          }
        }
      }

      // Method 3: videoTrackPublications fallback
      if (lp.videoTrackPublications) {
        const videoPubs = typeof lp.videoTrackPublications.values === 'function'
          ? [...lp.videoTrackPublications.values()]
          : Object.values(lp.videoTrackPublications);
        for (const pub of videoPubs) {
          if (pub.source === Track.Source.Camera && pub.track) {
            pub.track.attach(videoElement);
            console.log('Camera attached via videoTrackPublications');
            return;
          }
        }
      }

      console.warn('Could not find camera track to attach');
    },

    // ==================== ATTACH LOCAL SCREEN TRACK (FIXED) ====================
    attachLocalScreenTrack() {
      const videoElement = this.$refs.localVideo;
      if (!videoElement) return;

      const lp = this.livekitRoom.localParticipant;

      // Method 1: getTrack (avoids missing getTrackPublication)
      if (typeof lp.getTrack === 'function') {
        const pub = lp.getTrack(Track.Source.ScreenShare);
        if (pub && pub.track) {
          pub.track.attach(videoElement);
          const mediaTrack = pub.track.mediaStreamTrack;
          if (mediaTrack) {
            mediaTrack.addEventListener('ended', () => this.stopScreenShare(), { once: true });
          }
          console.log('Screen share attached via getTrack');
          return;
        }
      }

      // Method 2: iterate trackPublications
      const pubs = lp.trackPublications;
      if (pubs) {
        const entries = typeof pubs.values === 'function'
          ? [...pubs.values()]
          : Object.values(pubs);
        for (const pub of entries) {
          if (pub.source === Track.Source.ScreenShare && pub.track) {
            pub.track.attach(videoElement);
            const mediaTrack = pub.track.mediaStreamTrack;
            if (mediaTrack) {
              mediaTrack.addEventListener('ended', () => this.stopScreenShare(), { once: true });
            }
            console.log('Screen share attached via trackPublications iteration');
            return;
          }
        }
      }

      // Method 3: videoTrackPublications fallback
      if (lp.videoTrackPublications) {
        const videoPubs = typeof lp.videoTrackPublications.values === 'function'
          ? [...lp.videoTrackPublications.values()]
          : Object.values(lp.videoTrackPublications);
        for (const pub of videoPubs) {
          if (pub.source === Track.Source.ScreenShare && pub.track) {
            pub.track.attach(videoElement);
            const mediaTrack = pub.track.mediaStreamTrack;
            if (mediaTrack) {
              mediaTrack.addEventListener('ended', () => this.stopScreenShare(), { once: true });
            }
            console.log('Screen share attached via videoTrackPublications');
            return;
          }
        }
      }

      console.warn('Could not find screen share track to attach');
    },

    // ==================== USER INIT ====================

    initUserFromToken() {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        if (this.$router) {
          this.$router.push('/Login');
        } else {
          window.location.href = '/Login';
        }
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
    const isGuest = localStorage.getItem('isGuest') === 'true';

    // ✅ FIX: guests use a separate unauthenticated endpoint
    if (isGuest) {
      const guestId = localStorage.getItem('guestId');
      const guestName = localStorage.getItem('username') || 'Guest';

      if (!guestId) {
        console.error('No guestId found — was startWaiting() called first?');
      //  alert('Session error. Please rejoin the meeting.');//
        return null;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/livekit/guest-token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomName: this.roomId,
            participantName: guestName,
            guestId,
          }),
        }
      );

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        console.error('Guest LiveKit token failed:', response.status, errBody);
        throw new Error(`Failed to get guest LiveKit token: ${response.status}`);
      }

      return await response.json();
    }

    // Registered user — existing logic unchanged
    const authToken = localStorage.getItem('token');
    if (!authToken) {
      console.error('No auth token found in localStorage');
      if (this.$router) this.$router.push('/Login');
      else window.location.href = '/Login';
      return null;
    }

    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/livekit/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          roomName: this.roomId,
          participantName: this.userName,
        }),
      }
    );

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      console.error('LiveKit token request failed:', response.status, errBody);
      throw new Error(`Failed to get LiveKit token: ${response.status}`);
    }

    const data = await response.json();
    console.log('Raw token response:', data);
    return data;
  } catch (error) {
    console.error('Error getting LiveKit token:', error);
   // alert('Failed to connect to meeting room');//
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
       // alert('Failed to parse authentication token');//
        return;
      }

      console.log('Extracted token type:', typeof token);
      console.log('Extracted token length:', token?.length);
      console.log('WS URL:', wsUrl);

      if (typeof token !== 'string' || token.length < 20 || token === '[object Object]') {
        console.error('Invalid token format:', token);
     //   alert('Failed to get valid authentication token.');//
        return;
      }

      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        console.error('Token does not have JWT structure:', token);
      //  alert('Invalid token structure.');//
        return;
      }

      this.livekitRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
        stopLocalTrackOnUnpublish: true,  // ✅ prevents ghost tracks causing echo
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,  // ✅ set false — AGC can amplify and re-introduce echo
          googNoiseSuppression: true,
          googEchoCancellation: true,
          googHighpassFilter: true,
        },
        audioOutput: {
          deviceId: 'default',
        },
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

      this.livekitRoom.on(RoomEvent.Reconnecting, () => {
        console.log('LiveKit reconnecting...');
        this.connectionStatus = 'reconnecting';
      });

      this.livekitRoom.on(RoomEvent.Reconnected, async () => {
        console.log('LiveKit reconnected');
        this.connectionStatus = 'connected';

        await this.$nextTick();
        this.livekitRoom.remoteParticipants.forEach((participant) => {
          participant.trackPublications.forEach((publication) => {
            if (publication.isSubscribed && publication.track) {
              this.handleTrackSubscribed(publication.track, participant);
            }
          });
        });

        if (this.socket && this.socket.connected) {
          this.socket.emit('join-room', {
            roomId: this.roomId,
            userName: this.userName,
            userId: this.userId,
            isHost: this.isHost
          });
        }
      });

      this.livekitRoom.on(RoomEvent.Disconnected, async (reason) => {
        console.log('LiveKit disconnected, reason:', reason);
        this.connectionStatus = 'disconnected';
        if (reason === 1 || reason === 'leave' || reason === 'room_deleted') return;

        setTimeout(async () => {
          console.log('Attempting to rejoin room...');
          try {
            this.participants = [];
            this.remoteParticipants.clear();
            await this.initLivekit();

            if (this.socket && this.socket.connected) {
              this.socket.emit('join-room', {
                roomId: this.roomId,
                userName: this.userName,
                userId: this.userId,
                isHost: this.isHost
              });
            }
          } catch (err) {
            console.error('Rejoin failed:', err);
          }
        }, 2000);
      });

      try {
        console.log('Attempting to connect to LiveKit...');
        await this.livekitRoom.connect(wsUrl, token);

        console.log('LiveKit room connected successfully');
        console.log('Room name:', this.livekitRoom.name);

        this.livekitToken = token;

        const existingParticipants = this.livekitRoom.remoteParticipants;
        if (existingParticipants) {
          existingParticipants.forEach((participant) => {
            console.log('Processing existing participant:', participant.identity);
            this.handleParticipantConnected(participant);
            const publications = participant.trackPublications;
            if (publications) {
              publications.forEach((publication) => {
                if (publication.isSubscribed && publication.track) {
                  this.handleTrackSubscribed(publication.track, participant);
                }
              });
            }
          });
        }
      } catch (error) {
        console.error('Failed to connect to LiveKit:', error);
     //   alert('Failed to join meeting room: ' + error.message);//
      }
    },

    handleParticipantConnected(participant) {
      this.participants = this.participants.filter(p => p.id !== participant.identity);
      this.participants.push({
        id: participant.identity,
        userId: participant.identity,
        socketId: null,          // ← explicit null; filled by participants-list
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
      this.raisedHands = this.raisedHands.filter(h => h.userId !== participant.identity);
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
      if (track.kind === Track.Kind.Audio) {
        const id = participant.identity;
        if (this.remoteAudioElements.has(id)) {
          const el = this.remoteAudioElements.get(id);
          try { track.detach(el); } catch (_) {}
          el.srcObject = null;
          el.remove();
          this.remoteAudioElements.delete(id);
        }
      }
      this.updateRemoteTrackDisplay(participant);
    },

    attachVideoToGrid(track, participant) {
      const maxAttempts = 10;
      let attempts = 0;

      const tryAttach = () => {
        const tile = document.querySelector(`[data-peer-id="${participant.identity}"]`);
        if (tile) {
          const videoElement = tile.querySelector('video');
          if (videoElement) {
            // Detach any existing tracks first to avoid stale stream layering
            track.attach(videoElement);

            // Update hasVideo so the placeholder avatar hides
            const p = this.participants.find(p => p.id === participant.identity);
            if (p) p.hasVideo = true;

            console.log('Video/screen attached for', participant.identity, 'source:', track.source);
            return;
          }
        }
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(tryAttach, 150);
        } else {
          console.warn('Could not find tile for', participant.identity);
        }
      };
      this.$nextTick(tryAttach);
    },

    attachAudio(track, participant) {
      const id = participant.identity;

      if (this.remoteAudioElements.has(id)) {
        const old = this.remoteAudioElements.get(id);
        try { track.detach(old); } catch (_) {}
        old.srcObject = null;
        old.remove();
        this.remoteAudioElements.delete(id);
      }

      // ✅ Create element first, then attach — keeps AEC reference intact
      const audioEl = document.createElement('audio');
      audioEl.muted = false;
      audioEl.autoplay = true;
      audioEl.setAttribute('playsinline', '');
      audioEl.setAttribute('crossorigin', 'anonymous');
  
      // ✅ Route through default output so AEC knows what's playing
      if (typeof audioEl.setSinkId === 'function') {
        audioEl.setSinkId('default').catch(() => {});
      }

      document.body.appendChild(audioEl);
      track.attach(audioEl);  // ← attach AFTER appending
  
      this.remoteAudioElements.set(id, audioEl);

      audioEl.play().catch(err => {
        console.warn('Audio play failed:', err);
      });
    },

    updateRemoteTrackDisplay(participant) {
      let hasVideo = false;
      let hasMic = false;

      if (typeof participant.getTrack === 'function') {
        const cameraPublication = participant.getTrack(Track.Source.Camera);
        const screenPublication = participant.getTrack(Track.Source.ScreenShare);
        // Either camera OR screen share counts as "has video"
        hasVideo = !!(cameraPublication && !cameraPublication.isMuted) ||
               !!(screenPublication && !screenPublication.isMuted);

        const audioPublication = participant.getTrack(Track.Source.Microphone);
        hasMic = !!(audioPublication && !audioPublication.isMuted);
      } else {
        const pubs = participant.trackPublications;
        if (pubs) {
          const entries = typeof pubs.values === 'function'
            ? [...pubs.values()]
            : Object.values(pubs);
          for (const pub of entries) {
            if (pub.source === Track.Source.Camera || pub.source === Track.Source.ScreenShare) {
              if (!pub.isMuted) hasVideo = true;
            }
            if (pub.source === Track.Source.Microphone) hasMic = !pub.isMuted;
          }
        }
      }

      const p = this.participants.find(p => p.id === participant.identity);
      if (p) {
        p.hasMic = hasMic;
        p.hasVideo = hasVideo;
      } else {
        setTimeout(() => this.updateRemoteTrackDisplay(participant), 200);
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

     /* this.socket.on('chat-message', ({ sender, text, timestamp, attachments }) => {
        const message = {
          sender: sender || 'Unknown',
          text: text || '',
          timestamp: timestamp || Date.now(),
          attachments: attachments || []   // ← ADD THIS
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
      });*/

     this.socket.on('chat-message', ({ sender, text, timestamp, attachments, isPrivate, privateLabel }) => {
        const message = {
          sender: sender || 'Unknown',
          text: text || '',
          timestamp: timestamp || Date.now(),
          attachments: attachments || [],
          isPrivate: isPrivate || false,
          privateLabel: privateLabel || '',
        };
        this.messages.push(message);
        if (this.activePanel !== 'chat') this.unreadMessages++;
        this.$nextTick(() => {
          const chatBody = this.$refs.chatBody;
          if (chatBody) chatBody.scrollTop = chatBody.scrollHeight;
      });
    });

      this.socket.on('hand-raised', ({ userId, userName, isRaised }) => {
        if (isRaised) {
          if (!this.raisedHands.find(h => h.userId === userId)) {
            this.raisedHands.push({ userId, userName });
          }
        } else {
          this.raisedHands = this.raisedHands.filter(h => h.userId !== userId);
        }
      });

      this.socket.on('meeting-locked', () => {
        console.log('Meeting has been locked by the host');
      });

      this.socket.on('meeting-ended', () => {
        this.cleanup();
        if (this.$router) this.$router.push('/Ending');
        else window.location.href = '/Ending';
      });

      this.socket.on('all-muted', async ({ locked }) => {
        if (this.isHost) 
        {
          this.isMuteAllActive = locked;
          return;
        }
        this.isHostMuteLocked = locked;

        if (locked) 
        {
          if (this.micon && this.livekitRoom?.localParticipant) {
          try {
            await this.livekitRoom.localParticipant.setMicrophoneEnabled(false);
          } catch (err) {
            console.error('Force-mute failed:', err);
          }
        }
        this.micon = false;
      }
      });

      this.socket.on('expelled', () => {
      //  alert('You have been removed from the meeting by the host.');//
        this.cleanup();
        if (this.$router) this.$router.push('/Ending');
        else window.location.href = '/Ending';
      });

      this.socket.on('participants-list', (list) => {
  console.log('participants-list received:', JSON.stringify(list));

  const selfEntry = list.find(p => p.userId === this.userId);
  if (selfEntry) {
    this.isHost = selfEntry.isHost || false;
    localStorage.setItem('isHost', String(this.isHost));
  }

  list
    .filter(p => p.userId !== this.userId)
    .forEach(p => {
      const existing = this.participants.find(
        ep => ep.userId === p.userId || ep.id === p.userId
      );
      if (existing) {
        existing.isHost = p.isHost || false;
        existing.name = p.name || existing.name;
        existing.socketId = p.id;
      } else {
        this.participants.push({
          id: p.userId,
          socketId: p.id,
          userId: p.userId,
          name: p.name || p.userId,
          isHost: p.isHost || false,
          hasMic: false,
          hasVideo: false,
          captions: ''
        });
      }
    });

  // ADD THIS BLOCK HERE:
  if (this.selectedRecipient !== 'all') {
    const stillValid = this.participants.find(
      p => (p.socketId || p.userId || p.id) === this.selectedRecipient
    );
    if (!stillValid) this.selectedRecipient = 'all';
  }

  this.$nextTick(() => {
    if (!this.livekitRoom || !this.livekitRoom.remoteParticipants) return;
    this.livekitRoom.remoteParticipants.forEach((participant) => {
      if (!participant.trackPublications) return;
      participant.trackPublications.forEach((publication) => {
        if (publication.isSubscribed && publication.track) {
          this.handleTrackSubscribed(publication.track, participant);
        }
      });
    });
  });
});

      this.socket.on('participant-waiting', ({ socketId, userId, userName }) => {
        console.log('HOST RECEIVED participant-waiting from:', userName, socketId);
        if (!this.isHost) {
          console.log('Ignoring — not host');
          return;
        }
        if (!this.waitingParticipants.find(p => p.socketId === socketId)) {
          this.waitingParticipants.push({ socketId, userId, userName });
          console.log('Added to waitingParticipants:', this.waitingParticipants);
        }
      });

      this.socket.on('waiting-participant-left', ({ socketId }) => {
        this.waitingParticipants = this.waitingParticipants.filter(
          p => p.socketId !== socketId
        );
      });

      this.socket.on('doc-enact-visibility',({isOpen}) => {
        if(!this.isHost)
        {
          this.showDocEnact = isOpen;
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

    toggleDocEnact()
    {
      this.showDocEnact = !this.showDocEnact;
      if(this.socket && this.socket.connected) 
      {
        this.socket.emit('doc-relay',{
          roomId: this.roomId,
          type: 'doc-enact-visibility',
          isOpen: this.showDocEnact,
          senderId: this.userId,
        });
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

      if(this.isHostMuteLocked && !this.isHost)
      {
        return;
      }

      if (!this.livekitRoom || !this.livekitRoom.localParticipant) {
    //    alert('Not connected to meeting room');//
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
          await this.livekitRoom.localParticipant.setMicrophoneEnabled(true, {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: false,
          });
          this.micon = true;
          console.log('Microphone enabled');
        }
      } catch (error) {
        console.error('Error toggling microphone:', error);

        if (error.name === 'NotAllowedError') {
         console.warn('Microphone permission denied. Please allow microphone access in your browser settings.');
        } else if (error.message && error.message.includes('structuredClone')) {
          console.error('Browser compatibility issue. Please try refreshing the page or using Chrome/Edge.');
        } else {
          console.error('Could not access microphone: ' + error.message);
        }

        this.micon = false;
      } finally {
        this.isInitializingMedia = false;
      }
    },

    async toggleVideo() {
      if (this.isInitializingMedia) return;
      if (!this.livekitRoom || !this.livekitRoom.localParticipant) {
        //alert('Not connected to meeting room');//
        return;
      }

      this.isInitializingMedia = true;

      try {
        if (this.videoon) {
          await this.livekitRoom.localParticipant.setCameraEnabled(false);
          this.videoon = false;
          const videoElement = this.$refs.localVideo;
          if (videoElement) videoElement.srcObject = null;
        } else {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            stream.getTracks().forEach(t => t.stop());
          } catch (permError) {
            console.warn('Permission request failed:', permError);
          }

          await this.livekitRoom.localParticipant.setCameraEnabled(true);
          this.videoon = true;
          await this.$nextTick();
          // FIXED: use updated helper that avoids getTrackPublication
          this.attachLocalCameraTrack();
        }
      } catch (error) {
        console.error('Error toggling camera:', error);
        if (error.name === 'NotAllowedError') {
          //alert('Camera permission denied. Please allow camera access in your browser settings.');//
        } else {
          //alert('Could not access camera: ' + error.message);//
        }
        this.videoon = false;
      } finally {
        this.isInitializingMedia = false;
      }
    },

    async sharescreen() {
       if (!this.livekitRoom || !this.livekitRoom.localParticipant) {
       // alert('Not connected to meeting room');//
        return;
      }

      try {
        if (!this.isScreenSharing) {
          await this.livekitRoom.localParticipant.setScreenShareEnabled(true);
          this.isScreenSharing = true;
          await this.$nextTick();

          // Always show screen share locally, even if camera is off
          const videoElement = this.$refs.localVideo;
          if (videoElement) {
            // Ensure the video element is visible even if videoon is false
            videoElement.style.display = 'block';
            // Force srcObject to null before attaching to avoid stale stream
            videoElement.srcObject = null;
            }
          this.attachLocalScreenTrack();
        } else {
          await this.stopScreenShare();
        }
      } catch (error) {
        console.error('Error sharing screen:', error);
        if (error.name === 'NotAllowedError') {
          //alert('Screen sharing permission denied.');//
        } else {
         // alert('Could not start screen sharing: ' + error.message);//
        }
        this.isScreenSharing = false;
      }
    },

    async stopScreenShare() {
      try {
        await this.livekitRoom.localParticipant.setScreenShareEnabled(false);
        this.isScreenSharing = false;

        const videoElement = this.$refs.localVideo;
        if (videoElement) {
          videoElement.srcObject = null;
        }

        if (this.videoon && videoElement) {
          this.attachLocalCameraTrack();
        } else if (videoElement) {
          // Camera is off — hide the video element so the avatar shows
          videoElement.style.display = 'none';
        }
      } catch (error) {
        console.error('Error stopping screen share:', error);
      }
    },

    async flipCamera() {
      if (!this.videoon) return;
      this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';

      try {
        await this.livekitRoom.localParticipant.setCameraEnabled(false);
        await this.livekitRoom.localParticipant.setCameraEnabled(true, {
          facingMode: this.facingMode,
        });

        await this.$nextTick();
        // FIXED: use updated helper
        this.attachLocalCameraTrack();
      } catch (err) {
        console.error('Camera flip failed:', err);
        this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
      }
    },

    togglePanel(panel) {
      this.activePanel = this.activePanel === panel ? null : panel;
      this.activeDropdown = null;
      if (panel === 'chat') {
        this.unreadMessages = 0;
      }
      if (!panel) {
        this.selectedRecipient = 'all'; 
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
  if (!text && this.chatAttachments.length === 0) return;

  let targetSocketId = 'all';
  if (this.selectedRecipient !== 'all') {
    const recipientParticipant = this.participants.find(
      p => (p.socketId || p.userId || p.id) === this.selectedRecipient
    );
    if (!recipientParticipant) return;
    targetSocketId = recipientParticipant.socketId || recipientParticipant.userId || recipientParticipant.id;
  }

  const message = {
    sender: this.userName,
    text,
    timestamp: Date.now(),
    attachments: this.chatAttachments.map(a => ({
      name: a.name,
      mimeType: a.mimeType,
      previewUrl: a.previewUrl,
      base64: a.base64,
      size: a.size
    })),
    targetSocketId,
  };

  this.safeBroadcast('chat-message', {
    roomId: this.roomId,
    ...message
  });

  this.newMessage = '';
  this.chatAttachments = [];
  this.$nextTick(() => {
    const chatBody = this.$refs.chatBody;
    if (chatBody) chatBody.scrollTop = chatBody.scrollHeight;
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
      const meetingLink = `${window.location.origin}/MeetingRoom/${this.roomId}`;
      navigator.clipboard.writeText(meetingLink)
        .then(() => {
          //alert('Meeting link copied! Share this with anyone to invite them.');//
        })
        .catch(() => {
          const textArea = document.createElement('textarea');
          textArea.value = meetingLink;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          //alert('Meeting link copied! Share this with anyone to invite them.');//
        });
    },

    onAiNotesMouseEnter() {
      this.aiNotesFaded = false;
      if (this.aiNotesFadeTimer) {
        clearTimeout(this.aiNotesFadeTimer);
        this.aiNotesFadeTimer = null;
      }
    },

    onAiNotesMouseLeave() {
      if (this.aiNotesFadeTimer) clearTimeout(this.aiNotesFadeTimer);
      this.aiNotesFadeTimer = setTimeout(() => {
        this.aiNotesFaded = true;
      }, 5000);
    },

    async exitFullscreenIfActive()
    {
      try
      {
        if(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement)
        {
          await(document.exitFullscreen?.() || document.webkitExitFullscreen?.() || document.msExitFullscreen?.());
        }
        this.isFullscreen = false;
      }
      catch(err)
      {
        console.warn("Could not exit fullscreen " + err);
        this.isFullscreen = false;
      }
    },

    async leave() {
      await this.exitFullscreenIfActive();
      this.cleanup();
      if (this.$router) {
        this.$router.push('/Ending');
      } else {
        window.location.href = '/Ending'; // fallback
      }
    },

    async endMeeting() {
      if (!this.isHost) return;
      try {
        const authToken = localStorage.getItem('token'); // ADD THIS
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/end-meeting`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`  // ADD THIS
          },
          body: JSON.stringify({ roomId: this.roomId })
        });
        if (res.ok) {
          await this.exitFullscreenIfActive();
          this.cleanup();
          if (this.$router) this.$router.push('/Ending');
          else window.location.href = '/Ending';
        }
      } catch (err) {
        console.error('Error ending meeting:', err);
      }
    },

    async muteAll() {
      if (!this.isHost) return;
      const nextState = !this.isMuteAllActive;
      try {
        const authToken = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/mute-all`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ roomId: this.roomId, locked: nextState })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error('muteAll failed:', res.status, errData);
      }
      // isMuteAllActive is set by the 'all-muted' socket event below — not here.
    } 
    catch (err) {
    console.error('Error toggling mute all:', err);
  }
},

    openExpelModal() {
      this.expelSelected = [];
      this.showExpelModal = true;
      this.activeDropdown = null;
    },

    expelSelectedMembers() {
      if (!this.isHost || this.expelSelected.length === 0) return;
      this.expelSelected.forEach(selectedId => {
        const found = this.participants.find(
        p => p.socketId === selectedId || p.userId === selectedId || p.id === selectedId
      );
      const targetSocketId = found?.socketId || selectedId;
       this.socket.emit('expel-participant', {
        roomId: this.roomId,
        targetSocketId,
      });
    });
    this.expelSelected = [];
    this.showExpelModal = false;
  },
    
    async recording() {
  this.record = !this.record;

  if (this.record) {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      const audioCtx = new AudioContext();
      const destination = audioCtx.createMediaStreamDestination();

      // Add tab audio (remote participants)
      if (screenStream.getAudioTracks().length > 0) {
        audioCtx.createMediaStreamSource(screenStream).connect(destination);
      }

      // Add your own mic only if already on
      if (this.micon) {
        const micPub = this._getLocalTrack(Track.Source.Microphone);
        if (micPub?.track?.mediaStreamTrack) {
          const micStream = new MediaStream([micPub.track.mediaStreamTrack]);
          audioCtx.createMediaStreamSource(micStream).connect(destination);
        }
      }

      const combinedStream = new MediaStream([
        ...screenStream.getVideoTracks(),
        ...destination.stream.getAudioTracks()
      ]);

      this.recordedChunks = [];

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm';

      this.mediaRecorder = new MediaRecorder(combinedStream, { mimeType });

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) this.recordedChunks.push(e.data);
      };

      this.mediaRecorder.onstop = () => {
        screenStream.getTracks().forEach(t => t.stop());
        audioCtx.close();
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meeting-${this.roomId}-${Date.now()}.webm`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        this.recordedChunks = [];
      };

      screenStream.getVideoTracks()[0]?.addEventListener('ended', () => {
        if (this.isRecording) {
          this.mediaRecorder.stop();
          this.isRecording = false;
          this.record = false;
        }
      });

      this.mediaRecorder.start(1000);
      this.isRecording = true;

    } catch (err) {
      console.error('Recording failed:', err);
      this.record = false;
      this.isRecording = false;
    }

  } else {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
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
      const scope = 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly';
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth` +
        `?client_id=${clientId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=token` +
        `&scope=${encodeURIComponent(scope)}`;

      const popup = window.open(authUrl, 'gmail-oauth', 'width=500,height=600');

  // Use current origin instead of hardcoded value
      const expectedOrigin = window.location.origin;

      const handler = (event) => {
        if (event.origin !== expectedOrigin) return;
        if (event.data?.type === 'gmail-oauth-success') {
          this.gmailAccessToken = event.data.token;
          this.emailActiveTab = 'compose';
          this.inboxMessages = [];
          this.showEmailPanel = true;  // ← THIS was missing
          if (popup && !popup.closed) popup.close();
        }
      };

      window.addEventListener('message', handler, { once: true });
    },
    
    handleEmailAttachments(event) {
      const files = Array.from(event.target.files);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target.result.split(',')[1];
          this.emailAttachments.push({
            name: file.name,
            base64,
            mimeType: file.type || 'application/octet-stream'
          });
        };
        reader.readAsDataURL(file);
      });
      event.target.value = '';
    },

    removeAttachment(index) {
      this.emailAttachments.splice(index, 1);
    },

    async fetchInbox() {
      if (!this.gmailAccessToken) return;
      if (this.inboxLoading) return;
      this.inboxLoading = true;
      this.inboxError = null;
      try {
        // Fetch list of recent messages
        const listRes = await fetch(
          'https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=15&labelIds=INBOX',
          { headers: { Authorization: `Bearer ${this.gmailAccessToken}` } }
        );
        if (!listRes.ok) throw new Error('Failed to fetch inbox');
        const listData = await listRes.json();
        const messages = listData.messages || [];

        // Fetch each message header (parallel, limited fields)
        const fetched = await Promise.all(
          messages.map(async (m) => {
            const r = await fetch(
              `https://www.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
              { headers: { Authorization: `Bearer ${this.gmailAccessToken}` } }
            );
            if (!r.ok) return null;
            const d = await r.json();
            const headers = d.payload?.headers || [];
            const get = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
            const rawFrom = get('From');
            // Simplify "Name <email>" → "Name" or just email
            const fromMatch = rawFrom.match(/^"?([^"<]+)"?\s*</);
            const from = fromMatch ? fromMatch[1].trim() : rawFrom.replace(/<.*>/, '').trim() || rawFrom;
            const rawDate = get('Date');
            let date = '';
            try {
              const d2 = new Date(rawDate);
              const now = new Date();
              const isToday = d2.toDateString() === now.toDateString();
              date = isToday
                ? d2.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : d2.toLocaleDateString([], { month: 'short', day: 'numeric' });
            } catch (_) { date = ''; }
            return { id: m.id, from, subject: get('Subject') || '(no subject)', date, snippet: d.snippet || '' };
          })
        );
        this.inboxMessages = fetched.filter(Boolean);
      } catch (e) {
        this.inboxError = 'Could not load inbox: ' + e.message;
      } finally {
        this.inboxLoading = false;
      }
    },

    async sendEmail() {
  if (!this.gmailAccessToken) return;

  // Flush any partially typed address in the input box
  if (this.emailToInput && this.emailToInput.trim()) {
    this.addRecipient();
  }

  // Reset previous errors
  this.emailErrors = { recipients: '', subject: '', body: '' };

  let hasError = false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!this.emailToList || this.emailToList.length === 0) {
    this.emailErrors.recipients = 'At least one recipient email is required.';
    hasError = true;
  } else {
    const invalidAddresses = this.emailToList.filter(addr => !emailRegex.test(addr.trim()));
    if (invalidAddresses.length > 0) {
      this.emailErrors.recipients = `Invalid email address: ${invalidAddresses.join(', ')}`;
      hasError = true;
    }
  }

  if (!this.emailSubject || !this.emailSubject.trim()) {
    this.emailErrors.subject = 'Subject is required.';
    hasError = true;
  }

  if (!this.emailBody || !this.emailBody.trim()) {
    this.emailErrors.body = 'Message body is required.';
    hasError = true;
  }

  if (hasError) return;

  this.emailSending = true;
  try {
    const authToken = localStorage.getItem('token');
    const senderEmail =
      localStorage.getItem('username') ||
      this.userName ||
      '';

    // Sanitize attachments — drop any with missing base64
    const attachments = (this.emailAttachments || [])
      .map(a => ({
        name: a.name || 'attachment',
        base64: a.base64 || '',
        mimeType: a.mimeType || 'application/octet-stream',
      }))
      .filter(a => a.base64.length > 0);

    // Join all recipients as comma-separated string for the backend
    const toField = this.emailToList.map(addr => addr.trim()).join(', ');

    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/send-email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          accessToken: this.gmailAccessToken,
          senderEmail,
          to: toField,
          subject: this.emailSubject.trim(),
          body: this.emailBody.trim(),
          attachments,
        }),
      }
    );

    if (!response.ok) {
      let errMsg = `Server error (${response.status})`;
      try {
        const errData = await response.json();
        errMsg = errData.message || errData.error || errMsg;
      } catch (_) {}
      throw new Error(errMsg);
    }

    // Success — reset entire form
    this.emailToList = [];
    this.emailToInput = '';
    this.emailSubject = '';
    this.emailBody = '';
    this.emailAttachments = [];
    this.emailErrors = { recipients: '', subject: '', body: '' };
    this.showEmailPanel = false;

  } catch (err) {
    console.error('sendEmail error:', err);
  } finally {
    this.emailSending = false;
  }
},

    addRecipient() {
      const val = this.emailToInput.trim().replace(/,$/, '');
      if (!val) return;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(val)) return; // silently ignore invalid
      if (!this.emailToList.includes(val)) {
        this.emailToList.push(val);
      }
      this.emailToInput = '';
    },

    removeRecipient(index) {
      this.emailToList.splice(index, 1);
    },

    handleChatAttachments(event) {
      const files = Array.from(event.target.files);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.chatAttachments.push({
            name: file.name,
            base64: e.target.result.split(',')[1],
            mimeType: file.type || 'application/octet-stream',
            previewUrl: file.type.startsWith('image/') ? e.target.result : null,
            size: file.size
          });
        };
        reader.readAsDataURL(file);
      });
      event.target.value = '';
    },

    removeChatAttachment(index) {
      this.chatAttachments.splice(index, 1);
    },

    formatFileSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / 1048576).toFixed(1) + ' MB';
    },

    admitParticipant(socketId) {
      this.safeBroadcast('admit-participant', {
        roomId: this.roomId,
        socketId
      });
      this.waitingParticipants = this.waitingParticipants.filter(
        p => p.socketId !== socketId
      );
    },

    denyParticipant(socketId) {
      this.safeBroadcast('deny-participant', {
        roomId: this.roomId,
        socketId
      });
      this.waitingParticipants = this.waitingParticipants.filter(
        p => p.socketId !== socketId
      );
    },

    async cleanup() {
      if (this.isCleanedUp) return;  // ADD THIS
      this.isCleanedUp = true;
      console.log('Cleaning up resources...');

      if (this.broadcastRetryTimer) {
        clearInterval(this.broadcastRetryTimer);
        this.broadcastRetryTimer = null;
      }

      if (this.silentBackgroundEnabled) {
        await this.disableBackgroundNoiseSuppression();
        this.silentBackgroundEnabled = false;
      }

      if (this.livekitRoom) {
        try {
          const lp = this.livekitRoom.localParticipant;
          if (lp) {
            if (this.micon) await lp.setMicrophoneEnabled(false);
            if (this.videoon) await lp.setCameraEnabled(false);
            if (this.isScreenSharing) await lp.setScreenShareEnabled(false);
          }
        } catch (e) {
          console.warn('Error disabling tracks during cleanup:', e);
        }
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

      if (this.guestInactivityTimer) {
        clearTimeout(this.guestInactivityTimer);
        this.guestInactivityTimer = null;
      }

      // Clear guest identity on exit
      if (this.isGuest) {
        localStorage.removeItem('username');
        localStorage.removeItem('isGuest');
        localStorage.removeItem('guestId');
      }

      if (this.aiNotesFadeTimer) {
        clearTimeout(this.aiNotesFadeTimer);
        this.aiNotesFadeTimer = null;
      }

      this.remoteAudioElements.forEach((el) => {
        el.srcObject = null;
        el.remove();
      });

      this.remoteAudioElements.clear();
      
      this.aiNotesFaded = false;
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
      this.showEmailPanel = false;
      this.gmailAccessToken = null;
      this.emailTo = '';
      this.emailSubject = '';
      this.emailBody = '';
      this.emailAttachments = [];
      this.waitingParticipants = [];
      this.chatAttachments = [];
      this.showWhiteboard = false;
      this.showAiNotes = false;
      this.showDocEnact = false;
      this.emailToList = [];
      this.emailToInput = '';
      this.isHostMuteLocked = false;
      this.isMuteAllActive = false;
      this.selectedRecipient = 'all';
    }
  },

  async beforeUnmount() {
    await this.cleanup();

    document.removeEventListener('mousemove', this.resetinactivityTimer);
    document.removeEventListener('keydown', this.resetinactivityTimer);
    document.removeEventListener('click', this.resetinactivityTimer);
    document.removeEventListener('touchstart', this.resetinactivityTimer);
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('msfullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('keydown', this.handleEscKey);
  },

  async mounted() {
    console.log('=== MEETING ROOM MOUNTING ===');

    const isGuest = localStorage.getItem('isGuest') === 'true';
  if (isGuest) {
    this.userName = localStorage.getItem('username') || 'Guest';
    // ✅ FIX: reuse the stable guestId set in startWaiting(), don't generate a new one
    this.userId = localStorage.getItem('guestId') || `guest_${Date.now()}`;
    this.isHost = false;
  } else {
    if (!this.initUserFromToken()) return;
  }

    this.roomId = this.computedRoomId;
    this.title = localStorage.getItem('meetingtitle') || 'Meeting Room';

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
    document.addEventListener('mousemove', this.resetinactivityTimer);
    document.addEventListener('keydown', this.resetinactivityTimer);
    document.addEventListener('click', this.resetinactivityTimer);
    document.addEventListener('touchstart', this.resetinactivityTimer);

    // Guest name auto-clear after 1 hour of inactivity
    if (this.isGuest) {
      const GUEST_TIMEOUT = 60 * 60 * 1000; // 1 hour
      const resetGuestTimer = () => {
        if (this.guestInactivityTimer) clearTimeout(this.guestInactivityTimer);
        this.guestInactivityTimer = setTimeout(() => {
          localStorage.removeItem('username');
          localStorage.removeItem('isGuest');
          localStorage.removeItem('guestId');
        }, GUEST_TIMEOUT);
      };
      resetGuestTimer();
      document.addEventListener('mousemove', resetGuestTimer);
      document.addEventListener('keydown', resetGuestTimer);
      document.addEventListener('click', resetGuestTimer);
      document.addEventListener('touchstart', resetGuestTimer);
    }

    document.addEventListener('fullscreenchange', this.handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', this.handleFullscreenChange);
    document.addEventListener('msfullscreenchange', this.handleFullscreenChange);
    document.addEventListener('keydown', this.handleEscKey);

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

/* ==================== PANELS (CHAT & PARTICIPANTS) ==================== */
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

/* ==================== MEETING INFO MODAL ==================== */
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
  max-height: 520px;
  overflow: hidden;
}

.email-tabs {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
  flex-shrink: 0;
}

.email-tab-btn {
  flex: 1;
  padding: 9px 0;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s;
}

.email-tab-btn.active {
  color: #1a73e8;
  border-bottom: 2px solid #1a73e8;
  background: #fff;
}

.email-inbox-panel {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  overscroll-behavior: contain;
}

.email-inbox-loading,
.email-inbox-empty,
.email-inbox-error {
  padding: 20px 16px;
  text-align: center;
  font-size: 13px;
  color: #888;
}

.email-inbox-error { color: #d32f2f; }

.email-inbox-item {
  padding: 10px 14px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.12s;
}

.email-inbox-item:hover { background: #f5f5f5; }
.email-inbox-item:last-child { border-bottom: none; }

.email-inbox-item-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 2px;
}

.email-inbox-from {
  font-size: 13px;
  font-weight: 600;
  color: #202124;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.email-inbox-date {
  font-size: 11px;
  color: #888;
  white-space: nowrap;
  flex-shrink: 0;
}

.email-inbox-subject {
  font-size: 12px;
  color: #555;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.email-inbox-preview {
  font-size: 12px;
  color: #777;
  margin-top: 5px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
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
  overflow-y: auto;
  flex: 1;
  min-height: 0;
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
  height: 90px;
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

.email-attach-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.email-attach-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border: 1px dashed #ccc;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  color: #555;
  transition: background 0.2s;
  width: fit-content;
}

.email-attach-btn:hover {
  background: #f0f0f0;
}

.email-attach-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.email-attach-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #eef2ff;
  color: #3730a3;
  border-radius: 20px;
  padding: 3px 10px;
  font-size: 12px;
}

.email-attach-chip button {
  background: none;
  border: none;
  cursor: pointer;
  color: #3730a3;
  font-size: 13px;
  padding: 0;
  line-height: 1;
}

.email-recipients-wrapper {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #f9f9f9;
  padding: 6px 8px;
  min-height: 40px;
}

.email-chips-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.email-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #e8f0fe;
  color: #1a73e8;
  border-radius: 16px;
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 500;
}

.email-chip button {
  background: none;
  border: none;
  cursor: pointer;
  color: #1a73e8;
  font-size: 13px;
  padding: 0;
  line-height: 1;
}

.email-chip-input {
  flex: 1;
  min-width: 140px;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: #000;
  padding: 2px 4px;
}

.field-error-border {
  border: 1px solid #e53935 !important;
}

.field-error-msg {
  color: #e53935;
  font-size: 11px;
  margin-top: 3px;
  display: block;
}

.perm-deny    { background: #f44336; color: white; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; }
.perm-once    { background: #FF9800; color: white; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; }
.perm-always  { background: #4CAF50; color: white; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; }

@keyframes spin { to { transform: rotate(360deg); } }

/* ==================== EXPEL MODAL ==================== */
.expel-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.expel-box {
  background: #fff;
  border-radius: 14px;
  width: 340px;
  max-height: 480px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #111;
  box-shadow: 0 8px 32px rgba(0,0,0,0.25);
}

.expel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #e0e0e0;
  font-size: 15px;
  background: #f5f5f5;
  border-radius: 14px 14px 0 0;
}

.expel-header button {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #333;
  padding: 0;
}

.expel-body {
  overflow-y: auto;
  flex: 1;
  padding: 8px 0;
}

.expel-member-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.15s;
  border-radius: 8px;
  margin: 2px 8px;
}

.expel-member-row:hover {
  background: #f0f0f0;
}

.expel-checkbox {
  width: 16px;
  height: 16px;
  accent-color: #e53935;
  cursor: pointer;
  flex-shrink: 0;
}

.expel-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #3730a3;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}

.expel-member-info {
  flex: 1;
  min-width: 0;
}

.expel-member-name {
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.expel-member-role {
  font-size: 12px;
  color: #888;
  margin-top: 1px;
}

.expel-footer {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #e0e0e0;
}

.expel-cancel-btn {
  flex: 1;
  padding: 9px;
  background: #f0f0f0;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  color: #333;
  transition: background 0.15s;
}

.expel-cancel-btn:hover {
  background: #e0e0e0;
}

.expel-confirm-btn {
  flex: 1;
  padding: 9px;
  background: #e53935;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  color: white;
  transition: background 0.15s, opacity 0.15s;
}

.expel-confirm-btn:hover:not(:disabled) {
  background: #c62828;
}

.expel-confirm-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ==================== AI NOTES WRAPPER ==================== */
.ai-notes-wrapper {
  position: fixed;
  bottom: 80px;
  left: 20px;
  z-index: 50;
  width: 360px;
  max-height: calc(100vh - 100px);
  transition: opacity 0.6s ease;
  opacity: 1;
}

.ai-notes-wrapper.ai-notes-faded {
  opacity: 0.5;
}

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
