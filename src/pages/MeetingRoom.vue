<template>
  <div id="page">

    <!-- Main Grid View -->
    <div id="main-content">
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
              <span v-if="!micon" class="ctrl-icon muted">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/></svg>
              </span>
              <span v-if="!videoon" class="ctrl-icon muted">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21 6.5l-4-4-9.72 9.72-1.93-1.93L4 11.64l3.36 3.36L3 19.36 4.64 21l4.36-4.36 3.36 3.36 1.36-1.36-1.93-1.93L21 6.5z"/></svg>
              </span>
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
          <video :ref="`remoteVideo-${participant.id}`" autoplay playsinline></video>
          <div class="video-placeholder" v-show="!participant.hasVideo">
            <div class="avatar-circle">{{ getInitials(participant.name) }}</div>
          </div>
          <div class="participant-info">
            <span class="participant-name">{{ participant.name }}</span>
            <div class="participant-controls">
              <span v-if="!participant.hasMic" class="ctrl-icon muted">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/></svg>
              </span>
              <span v-if="!participant.hasVideo" class="ctrl-icon muted">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21 6.5l-4-4-9.72 9.72-1.93-1.93L4 11.64l3.36 3.36L3 19.36 4.64 21l4.36-4.36 3.36 3.36 1.36-1.36-1.93-1.93L21 6.5z"/></svg>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Navigation Bar -->
    <transition name="slide-fade">
      <div id="navbar" v-show="trayVisible">

        <!-- Left section: meeting title -->
        <div id="navbar-left">
          <span id="meeting-title-text">{{ title }}</span>
          <span id="meeting-duration">{{ meetingDuration }}</span>
        </div>

        <!-- Center section: core controls -->
        <div id="navbar-center">
          <div class="nav-btn-wrap">
            <button
              @click="toggleMic"
              :class="['nav-btn', micon ? 'btn-active' : 'btn-danger']"
              :disabled="isHostMuteLocked && !isHost"
              :style="isHostMuteLocked && !isHost ? 'opacity:0.4;cursor:not-allowed;' : ''"
              :title="isHostMuteLocked && !isHost ? 'Muted by host' : (micon ? 'Mute' : 'Unmute')"
              @mouseenter="setHover('mic')" @mouseleave="setHover(null)"
            >
              <svg v-if="micon" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V21h2v-3.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/></svg>
              <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/></svg>
            </button>
            <span class="nav-btn-label">{{ micon ? 'Mute' : 'Unmute' }}</span>
            <div v-if="hoveredIcon === 'mic'" class="nav-tooltip">{{ micon ? 'Mute mic' : 'Unmute mic' }}</div>
          </div>

          <div class="nav-btn-wrap">
            <button
              @click="toggleVideo"
              :class="['nav-btn', videoon ? 'btn-active' : 'btn-danger']"
              title="Toggle camera"
              @mouseenter="setHover('video')" @mouseleave="setHover(null)"
            >
              <svg v-if="videoon" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
              <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M21 6.5l-4-4-9.72 9.72-1.93-1.93L4 11.64l3.36 3.36L3 19.36 4.64 21l4.36-4.36 3.36 3.36 1.36-1.36-1.93-1.93L21 6.5z"/></svg>
            </button>
            <span class="nav-btn-label">{{ videoon ? 'Stop video' : 'Start video' }}</span>
            <div v-if="hoveredIcon === 'video'" class="nav-tooltip">{{ videoon ? 'Stop video' : 'Start video' }}</div>
          </div>

          <div class="nav-btn-wrap" v-show="!isMobile">
            <button
              @click="sharescreen"
              :class="['nav-btn', isScreenSharing ? 'btn-accent' : 'btn-neutral']"
              title="Share screen"
              @mouseenter="setHover('share')" @mouseleave="setHover(null)"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6zm7 8.5v-3H8l4-4 4 4h-3v3h-2z"/></svg>
            </button>
            <span class="nav-btn-label">{{ isScreenSharing ? 'Stop share' : 'Share' }}</span>
            <div v-if="hoveredIcon === 'share'" class="nav-tooltip">{{ isScreenSharing ? 'Stop sharing' : 'Share screen' }}</div>
          </div>

          <!-- Features dropdown button -->
          <div class="nav-btn-wrap" style="position:relative;">
            <button
              @click.stop="toggleDropdown('features')"
              :class="['nav-btn', activeDropdown === 'features' ? 'btn-accent' : 'btn-neutral']"
              @mouseenter="setHover('features')" @mouseleave="setHover(null)"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"/></svg>
            </button>
            <span class="nav-btn-label">Features</span>
            <div v-if="hoveredIcon === 'features'" class="nav-tooltip">All features</div>

            <!-- Features popup panel -->
            <div v-if="activeDropdown === 'features'" class="features-panel" @click.stop>
              <div class="features-panel-title">Features</div>
              <div class="features-grid">
                <button
                  @click="toggleSilentBackground"
                  :class="['feature-tile', silentBackgroundEnabled ? 'feature-tile-on' : '']"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg>
                  <span>{{ silentBackgroundEnabled ? 'Noise off' : 'Noise filter' }}</span>
                  <span v-if="silentBackgroundEnabled" class="feat-on-badge">ON</span>
                </button>

                <button
                  @click="recording"
                  :class="['feature-tile', isRecording ? 'feature-tile-rec' : '']"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>
                  <span>{{ isRecording ? 'Stop rec' : 'Record' }}</span>
                  <span v-if="isRecording" class="feat-on-badge rec-badge">REC</span>
                </button>

                <button
                  v-if="!isGuest"
                  @click="emailEnact; activeDropdown = null"
                  class="feature-tile"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                  <span>Gmail</span>
                </button>

                <button
                  @click="showWhiteboard = !showWhiteboard; activeDropdown = null"
                  :class="['feature-tile', showWhiteboard ? 'feature-tile-on' : '']"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                  <span>Whiteboard</span>
                  <span v-if="showWhiteboard" class="feat-on-badge">ON</span>
                </button>

                <button
                  @click="toggleDocEnact; activeDropdown = null"
                  :class="['feature-tile', showDocEnact ? 'feature-tile-on' : '']"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                  <span>Doc</span>
                  <span v-if="showDocEnact" class="feat-on-badge">ON</span>
                </button>

                <button
                  @click="toggleAiNotes; activeDropdown = null"
                  :class="['feature-tile', showAiNotes ? 'feature-tile-on' : '']"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 9l-6 3V9l6 3zm6 0l-6 3V9l6 3z"/></svg>
                  <span>AI summary</span>
                  <span v-if="showAiNotes" class="feat-on-badge">ON</span>
                </button>

                <button
                  @click="toggleFullscreen; activeDropdown = null"
                  :class="['feature-tile', isFullscreen ? 'feature-tile-on' : '']"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
                  <span>{{ isFullscreen ? 'Exit full' : 'Fullscreen' }}</span>
                </button>

                <!-- Host-only controls -->
                <button
                  v-if="isHost"
                  @click="muteAll; activeDropdown = null"
                  :class="['feature-tile', isMuteAllActive ? 'feature-tile-rec' : '']"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
                  <span>{{ isMuteAllActive ? 'Unmute all' : 'Mute all' }}</span>
                </button>

                <button
                  v-if="isHost"
                  @click="openExpelModal; activeDropdown = null"
                  class="feature-tile feature-tile-danger"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                  <span>Expel</span>
                </button>

                <button
                  v-if="isHost"
                  @click="endMeeting"
                  class="feature-tile feature-tile-danger"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.59-13L12 10.59 8.41 7 7 8.41 10.59 12 7 15.59 8.41 17 12 13.41 15.59 17 17 15.59 13.41 12 17 8.41z"/></svg>
                  <span>End meeting</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Raise hand -->
          <div class="nav-btn-wrap" style="position:relative;">
            <button
              @click="hand_raised"
              :class="['nav-btn', hand ? 'btn-accent' : 'btn-neutral']"
              @mouseenter="setHover('hand')" @mouseleave="setHover(null)"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M21 7c0-1.38-1.12-2.5-2.5-2.5-.23 0-.46.03-.67.09C17.52 3.64 16.56 3 15.5 3c-.39 0-.75.09-1.08.24C14.09 2.5 13.35 2 12.5 2c-.95 0-1.75.6-2.08 1.44C10.22 3.16 9.87 3 9.5 3 8.12 3 7 4.12 7 5.5v5.1c-.31-.24-.66-.41-1.03-.49L5 9.85c-.38-.07-.77 0-1.1.19-.65.38-.87 1.21-.49 1.86l2.17 4.34c.28.56.59 1.1.99 1.57C7.1 19.64 8.82 21 11 21h2c3.31 0 6-2.69 6-6V7zm-2 8c0 2.21-1.79 4-4 4h-2c-1.63 0-3.04-1.08-3.67-2.6-.23-.55-.54-1.05-.9-1.51l-2.11-4.21.76.15c.59.12 1.01.62 1.01 1.23V13h2V5.5c0-.28.22-.5.5-.5s.5.22.5.5V11h2V4.5c0-.28.22-.5.5-.5s.5.22.5.5V11h2V5.5c0-.28.22-.5.5-.5s.5.22.5.5V11h2V7c0-.28.22-.5.5-.5s.5.22.5.5v8z"/></svg>
            </button>
            <span class="nav-btn-label">{{ hand ? 'Lower hand' : 'Raise hand' }}</span>
            <div v-if="hoveredIcon === 'hand'" class="nav-tooltip">{{ hand ? 'Lower hand' : 'Raise hand' }}</div>
          </div>

          <!-- Leave / End -->
          <div class="nav-btn-wrap">
            <button
              @click="leave"
              class="nav-btn btn-leave"
              @mouseenter="setHover('leave')" @mouseleave="setHover(null)"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20.4 14.55c-1.95-1.74-4.45-2.72-7.05-2.72s-5.1.98-7.04 2.72L4.95 13c2.4-2.12 5.55-3.42 9-3.42s6.62 1.3 9.02 3.42l-2.57 1.55zm-3.85-3.85c-1-1-2.09-1.8-3.29-2.34L12 7l-1.26 1.36c-1.2.54-2.29 1.34-3.29 2.34L5.89 9.14C7.27 7.76 8.96 6.77 10.84 6.27L12 5l1.16 1.27c1.88.5 3.57 1.49 4.95 2.87l-1.56 1.56zM12 18.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/></svg>
            </button>
            <span class="nav-btn-label">Leave</span>
            <div v-if="hoveredIcon === 'leave'" class="nav-tooltip">Leave call</div>
          </div>
        </div>

        <!-- Right section: participants, chat, meeting info, more -->
        <div id="navbar-right">

          <!-- Meeting info -->
          <div class="nav-btn-wrap" style="position:relative;">
            <button
              @click.stop="toggle_info"
              :class="['nav-btn-sm', show_info ? 'btn-accent' : 'btn-neutral']"
              @mouseenter="setHover('info')" @mouseleave="setHover(null)"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
            </button>
            <div v-if="hoveredIcon === 'info'" class="nav-tooltip">Meeting info</div>
          </div>

          <!-- Participants panel -->
          <div class="nav-btn-wrap" style="position:relative;">
            <button
              @click="togglePanel('list')"
              :class="['nav-btn-sm', activePanel === 'list' ? 'btn-accent' : 'btn-neutral']"
              @mouseenter="setHover('participants')" @mouseleave="setHover(null)"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
              <span class="nav-badge">{{ totalParticipantCount }}</span>
            </button>
            <div v-if="hoveredIcon === 'participants'" class="nav-tooltip">Participants</div>
          </div>

          <!-- Chat panel -->
          <div class="nav-btn-wrap" style="position:relative;">
            <button
              @click="togglePanel('chat')"
              :class="['nav-btn-sm', activePanel === 'chat' ? 'btn-accent' : 'btn-neutral']"
              @mouseenter="setHover('chat')" @mouseleave="setHover(null)"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
              <span v-if="unreadMessages > 0" class="nav-badge nav-badge-red">{{ unreadMessages }}</span>
            </button>
            <div v-if="hoveredIcon === 'chat'" class="nav-tooltip">Chat</div>
          </div>

          <!-- Mobile menu -->
          <div class="nav-btn-wrap" v-if="isMobile" style="position:relative;">
            <button
              @click.stop="toggleDropdown('mobileMenu')"
              class="nav-btn-sm btn-neutral"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
            </button>
            <ul v-if="activeDropdown === 'mobileMenu'" class="dropdown-menu">
              <li @click.stop="toggleSilentBackground">{{ silentBackgroundEnabled ? 'Silent Mode ON' : 'Noise Filter' }}</li>
              <li @click.stop="recording">{{ isRecording ? 'Stop Recording' : 'Record' }}</li>
              <li @click.stop="toggleFullscreen">{{ isFullscreen ? 'Exit Fullscreen' : 'Fullscreen' }}</li>
              <li v-if="!isGuest" @click.stop="emailEnact">Gmail Enact</li>
              <li @click.stop="showWhiteboard = !showWhiteboard">{{ showWhiteboard ? 'Whiteboard ON' : 'Whiteboard' }}</li>
              <li @click.stop="toggleDocEnact">{{ showDocEnact ? 'Doc Enact ON' : 'Doc Enact' }}</li>
              <li @click.stop="toggleAiNotes">{{ showAiNotes ? 'AI Summary ON' : 'AI Summary' }}</li>
            </ul>
          </div>
        </div>
      </div>
    </transition>

    <!-- Participants Panel -->
    <div id="list-box" v-if="activePanel === 'list'">
      <div class="panel-header">
        <span>Participants ({{ totalParticipantCount }})</span>
        <button @click="togglePanel(null)">✕</button>
      </div>
      <div class="panel-body">
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

    <!-- Chat Panel -->
    <div id="chat-box" v-if="activePanel === 'chat'">
      <div class="panel-header">
        <div style="display:flex;flex-direction:column;gap:4px;flex:1;">
          <span style="font-size:15px;font-weight:600;color:#000;">Chat</span>
          <select
            v-model="selectedRecipient"
            style="font-size:12px;border:1px solid #e0e0e0;border-radius:6px;padding:3px 6px;color:#333;background:#f9f9f9;cursor:pointer;max-width:200px;outline:none;"
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
      <div class="panel-body" ref="chatBody">
        <div
          v-for="(msg, index) in filteredMessages"
          :key="index"
          class="message"
          :style="msg.isPrivate ? 'border-left:3px solid #7c3aed;background:#f5f3ff;' : ''"
        >
          <div class="message-sender">{{ msg.sender }}</div>
          <div v-if="msg.privateLabel" style="font-size:11px;color:#7c3aed;font-weight:600;margin-bottom:3px;">{{ msg.privateLabel }}</div>
          <div class="message-text">{{ msg.text }}</div>
          <div v-if="msg.attachments && msg.attachments.length > 0">
            <div v-for="(att, i) in msg.attachments" :key="i">
              <img
                v-if="att.mimeType && att.mimeType.startsWith('image/')"
                :src="'data:' + att.mimeType + ';base64,' + att.base64"
                style="max-width:200px;border-radius:8px;margin-top:6px;"
              />
              <a
                v-else
                :href="'data:' + att.mimeType + ';base64,' + att.base64"
                :download="att.name"
                style="display:block;margin-top:6px;color:#3730a3;"
              >📎 {{ att.name }} ({{ formatFileSize(att.size) }})</a>
            </div>
          </div>
          <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
        </div>
      </div>
      <div class="chat-input-section" style="flex-direction:column;gap:0;">
        <div v-if="chatAttachments.length > 0" style="display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px;border-top:1px solid #e0e0e0;background:#fafafa;">
          <div
            v-for="(att, i) in chatAttachments"
            :key="i"
            style="display:flex;align-items:center;gap:6px;background:#eef2ff;border-radius:20px;padding:4px 10px;font-size:12px;color:#3730a3;"
          >
            <img v-if="att.previewUrl" :src="att.previewUrl" style="width:24px;height:24px;border-radius:4px;object-fit:cover;" />
            <span v-else style="font-size:14px;">📎</span>
            <span style="max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ att.name }}</span>
            <span style="opacity:0.6;">{{ formatFileSize(att.size) }}</span>
            <button @click="removeChatAttachment(i)" style="background:none;border:none;cursor:pointer;color:#3730a3;font-size:14px;padding:0;line-height:1;">✕</button>
          </div>
        </div>
        <div style="display:flex;padding:12px;gap:8px;align-items:center;">
          <label v-if="!isGuest" style="cursor:pointer;color:#888;font-size:20px;line-height:1;flex-shrink:0;" title="Attach file">
            +
            <input type="file" multiple style="display:none;" @change="handleChatAttachments" accept="*/*" />
          </label>
          <input
            type="text"
            class="chat-input"
            v-model="newMessage"
            placeholder="Type a message..."
            @keyup.enter="sendMessage"
            maxlength="500"
          />
          <button class="chat-send" @click="sendMessage" :disabled="!newMessage.trim() && chatAttachments.length === 0">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
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
          <span class="info-label">Title:</span>
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

    <!-- Expel Members Modal (Host only) -->
    <div v-if="showExpelModal && isHost" class="expel-overlay" @click.self="showExpelModal = false">
      <div class="expel-box" @click.stop>
        <div class="expel-header">
          <b>Remove Members</b>
          <button @click="showExpelModal = false">✕</button>
        </div>
        <div class="expel-body">
          <p v-if="participants.length === 0" style="color:#888;font-size:13px;text-align:center;margin:20px 0;">No other participants.</p>
          <label v-for="p in participants" :key="p.socketId || p.id" class="expel-member-row">
            <input type="checkbox" :value="p.socketId || p.userId || p.id" v-model="expelSelected" class="expel-checkbox" />
            <div class="expel-avatar">{{ getInitials(p.name) }}</div>
            <div class="expel-member-info">
              <div class="expel-member-name">{{ p.name }}</div>
              <div class="expel-member-role">{{ p.isHost ? 'Host' : 'Participant' }}</div>
            </div>
          </label>
        </div>
        <div class="expel-footer">
          <button class="expel-cancel-btn" @click="showExpelModal = false">Cancel</button>
          <button class="expel-confirm-btn" :disabled="expelSelected.length === 0" @click="expelSelectedMembers">Remove ({{ expelSelected.length }})</button>
        </div>
      </div>
    </div>

    <!-- Hand Raised Notification -->
    <div id="hand_warning" v-if="hand">
      <p>✋ Your hand is raised</p>
    </div>

    <!-- Other participants raised hands -->
    <div
      v-for="(h, index) in raisedHands.filter(h => h.userId !== userId)"
      :key="h.userId"
      :style="{
        position:'fixed', top:(80 + index * 52) + 'px', left:'50%',
        transform:'translateX(-50%)', background:'#FFA726', color:'white',
        padding:'8px 20px', borderRadius:'8px', fontWeight:'600', zIndex:101,
        animation:'slideIn 0.3s ease', whiteSpace:'nowrap', fontSize:'14px'
      }"
    >
      ✋ {{ h.userName }} raised their hand
    </div>

    <!-- Waiting participants (host) -->
    <div
      v-for="(wp, index) in waitingParticipants"
      :key="wp.socketId"
      :style="{
        position:'fixed', top:(20 + index * 84) + 'px', right:'20px',
        width:'290px', background:'#ffffff', border:'1px solid #e0e0e0',
        borderRadius:'12px', padding:'14px 16px', zIndex:160,
        boxShadow:'0 4px 16px rgba(0,0,0,0.15)', animation:'slideIn 0.3s ease'
      }"
    >
      <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#000;">
        <strong>{{ wp.userName }}</strong> wants to join
      </p>
      <div style="display:flex;gap:8px;">
        <button @click="admitParticipant(wp.socketId)" style="flex:1;padding:8px;background:#4CAF50;color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;">Accept</button>
        <button @click="denyParticipant(wp.socketId)" style="flex:1;padding:8px;background:#0d0907;color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;">Deny</button>
      </div>
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
      <div class="email-tabs">
        <button class="email-tab-btn" :class="{ active: emailActiveTab === 'compose' }" @click="emailActiveTab = 'compose'">Compose</button>
        <button class="email-tab-btn" :class="{ active: emailActiveTab === 'inbox' }" @click="emailActiveTab = 'inbox'; fetchInbox()">Inbox</button>
      </div>
      <template v-if="emailActiveTab === 'compose'">
        <div class="email-body-panel">
          <div>
            <div class="email-recipients-wrapper" :class="{ 'field-error-border': emailErrors.recipients }">
              <div class="email-chips-row">
                <span v-for="(addr, i) in emailToList" :key="i" class="email-chip">
                  {{ addr }}
                  <button @click="removeRecipient(i)">✕</button>
                </span>
                <input
                  v-model="emailToInput"
                  type="text"
                  placeholder="Add recipient & press Enter"
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
            <input v-model="emailSubject" type="text" placeholder="Subject" class="email-field" :class="{ 'field-error-border': emailErrors.subject }" />
            <span v-if="emailErrors.subject" class="field-error-msg">{{ emailErrors.subject }}</span>
          </div>
          <div>
            <textarea v-model="emailBody" placeholder="Write your message..." class="email-textarea" :class="{ 'field-error-border': emailErrors.body }"></textarea>
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
          <button @click="sendEmail" :disabled="emailSending" class="email-send-btn">{{ emailSending ? 'Sending...' : 'Send' }}</button>
        </div>
      </template>
      <template v-if="emailActiveTab === 'inbox'">
        <div class="email-inbox-panel">
          <div v-if="inboxLoading" class="email-inbox-loading">Loading...</div>
          <div v-else-if="inboxError" class="email-inbox-error">{{ inboxError }}</div>
          <div v-else-if="inboxMessages.length === 0" class="email-inbox-empty">No recent emails</div>
          <div v-for="msg in inboxMessages" :key="msg.id" class="email-inbox-item" @click="selectInboxMsg(msg)">
            <div class="email-inbox-item-header">
              <span class="email-inbox-from">{{ msg.from }}</span>
              <span class="email-inbox-date">{{ msg.date }}</span>
            </div>
            <div class="email-inbox-subject">{{ msg.subject }}</div>
            <div v-if="selectedInboxMsg?.id === msg.id" class="email-inbox-full-body">
              <div v-if="inboxMsgLoading" style="color:#888;font-size:12px;margin-top:8px;">Loading...</div>
              <div v-else v-html="inboxMsgBody" style="font-size:13px;color:#333;margin-top:8px;line-height:1.5;max-height:400px;overflow-y:auto;overflow-x:auto;border-top:1px solid #f0f0f0;padding-top:8px;"></div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Reconnecting overlay -->
    <transition name="slide-fade">
      <div v-if="connectionStatus === 'reconnecting'" style="position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:200;gap:16px;">
        <div style="width:40px;height:40px;border:3px solid #4CAF50;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
        <p style="color:white;font-size:16px;margin:0">Reconnecting to meeting...</p>
      </div>
    </transition>

    <!-- Whiteboard, AI Notes, Doc Enact panels -->
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
  components: { WhiteboardPanel, AiNotesPanel, DocEnactPanel },
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
      inboxMsgBody: '',
      inboxMsgLoading: false,

      meetingStartTime: null,
      meetingDuration: '00:00',
      durationInterval: null,
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
      if (newVal) this.recognition?.start();
      else this.recognition?.stop();
    },
    showAiNotes(newVal) {
      if (newVal) {
        if (this.aiNotesFadeTimer) clearTimeout(this.aiNotesFadeTimer);
        this.aiNotesFadeTimer = setTimeout(() => { this.aiNotesFaded = true; }, 5000);
      } else {
        this.aiNotesFaded = false;
        if (this.aiNotesFadeTimer) { clearTimeout(this.aiNotesFadeTimer); this.aiNotesFadeTimer = null; }
      }
    },
    activePanel(newVal) {
      if (newVal !== 'chat') this.unreadMessages = 0;
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
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    },

    startDurationTimer() {
      this.meetingStartTime = Date.now();
      this.durationInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - this.meetingStartTime) / 1000);
        const h = Math.floor(elapsed / 3600);
        const m = Math.floor((elapsed % 3600) / 60);
        const s = elapsed % 60;
        if (h > 0) {
          this.meetingDuration = `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
        } else {
          this.meetingDuration = `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
        }
      }, 1000);
    },

    // ==================== FULLSCREEN (from doc2 - working) ====================
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

    // ==================== AI NOTES (from doc2 - working) ====================
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
          this.silentBackgroundEnabled = false;
          return;
        }
        const rawAudioTrack = stream.getAudioTracks()[0];
        if (!rawAudioTrack) {
          this.silentBackgroundEnabled = false;
          stream.getTracks().forEach(t => t.stop());
          return;
        }
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
      } catch (error) {
        console.error('Error enabling noise suppression:', error);
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
          await this.livekitRoom.localParticipant.unpublishTrack(this.backgroundNoiseSuppressionTrack);
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
      } catch (error) {
        console.error('Error disabling noise suppression:', error);
      }
    },

    _getLocalTrack(source) {
      if (!this.livekitRoom || !this.livekitRoom.localParticipant) return null;
      const lp = this.livekitRoom.localParticipant;
      if (typeof lp.getTrack === 'function') {
        const pub = lp.getTrack(source);
        if (pub) return pub;
      }
      const pubs = lp.trackPublications;
      if (pubs) {
        const entries = typeof pubs.values === 'function' ? [...pubs.values()] : Object.values(pubs);
        for (const pub of entries) { if (pub.source === source) return pub; }
      }
      const subMap = source === Track.Source.Camera || source === Track.Source.ScreenShare
        ? lp.videoTrackPublications : lp.audioTrackPublications;
      if (subMap) {
        const entries = typeof subMap.values === 'function' ? [...subMap.values()] : Object.values(subMap);
        for (const pub of entries) { if (pub.source === source) return pub; }
      }
      return null;
    },

    attachLocalCameraTrack() {
      const videoElement = this.$refs.localVideo;
      if (!videoElement) return;
      const lp = this.livekitRoom.localParticipant;
      if (typeof lp.getTrack === 'function') {
        const pub = lp.getTrack(Track.Source.Camera);
        if (pub && pub.track) { pub.track.attach(videoElement); return; }
      }
      const pubs = lp.trackPublications;
      if (pubs) {
        const entries = typeof pubs.values === 'function' ? [...pubs.values()] : Object.values(pubs);
        for (const pub of entries) {
          if (pub.source === Track.Source.Camera && pub.track) { pub.track.attach(videoElement); return; }
        }
      }
      if (lp.videoTrackPublications) {
        const videoPubs = typeof lp.videoTrackPublications.values === 'function'
          ? [...lp.videoTrackPublications.values()] : Object.values(lp.videoTrackPublications);
        for (const pub of videoPubs) {
          if (pub.source === Track.Source.Camera && pub.track) { pub.track.attach(videoElement); return; }
        }
      }
    },

    attachLocalScreenTrack() {
      const videoElement = this.$refs.localVideo;
      if (!videoElement) return;
      const lp = this.livekitRoom.localParticipant;
      if (typeof lp.getTrack === 'function') {
        const pub = lp.getTrack(Track.Source.ScreenShare);
        if (pub && pub.track) {
          pub.track.attach(videoElement);
          const mediaTrack = pub.track.mediaStreamTrack;
          if (mediaTrack) mediaTrack.addEventListener('ended', () => this.stopScreenShare(), { once: true });
          return;
        }
      }
      const pubs = lp.trackPublications;
      if (pubs) {
        const entries = typeof pubs.values === 'function' ? [...pubs.values()] : Object.values(pubs);
        for (const pub of entries) {
          if (pub.source === Track.Source.ScreenShare && pub.track) {
            pub.track.attach(videoElement);
            const mediaTrack = pub.track.mediaStreamTrack;
            if (mediaTrack) mediaTrack.addEventListener('ended', () => this.stopScreenShare(), { once: true });
            return;
          }
        }
      }
    },

    initUserFromToken() {
      const token = localStorage.getItem('token');
      if (!token) {
        if (this.$router) this.$router.push('/Login');
        else window.location.href = '/Login';
        return false;
      }
      try {
        const decoded = jwtDecode(token);
        this.userId = decoded.id || decoded.userId || decoded.user?.id || `user_${Date.now()}`;
        const storedEmail = localStorage.getItem('username');
        this.userName =
          decoded.name || decoded.user?.name || decoded.username || decoded.user?.username ||
          (storedEmail && !storedEmail.includes('@') ? storedEmail : null) ||
          decoded.email || decoded.user?.email || storedEmail ||
          `User-${this.userId.substring(0, 8)}`;
        if (this.userName.includes('@')) {
          this.userName = this.userName.split('@')[0] || `User-${this.userId.substring(0, 8)}`;
        }
        const storedIsHost = localStorage.getItem('isHost');
        this.isHost = storedIsHost === 'true' || decoded.isHost === true;
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
        if (isGuest) {
          const guestId = localStorage.getItem('guestId');
          const guestName = localStorage.getItem('username') || 'Guest';
          if (!guestId) { console.error('No guestId found'); return null; }
          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/livekit/guest-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomName: this.roomId, participantName: guestName, guestId }),
          });
          if (!response.ok) throw new Error(`Failed to get guest LiveKit token: ${response.status}`);
          return await response.json();
        }
        const authToken = localStorage.getItem('token');
        if (!authToken) {
          if (this.$router) this.$router.push('/Login');
          else window.location.href = '/Login';
          return null;
        }
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/livekit/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
          body: JSON.stringify({ roomName: this.roomId, participantName: this.userName }),
        });
        if (!response.ok) throw new Error(`Failed to get LiveKit token: ${response.status}`);
        return await response.json();
      } catch (error) {
        console.error('Error getting LiveKit token:', error);
        return null;
      }
    },

    async initLivekit() {
      const tokenData = await this.getLivekitToken();
      if (!tokenData) return;

      let token, wsUrl;
      if (typeof tokenData === 'string') {
        token = tokenData;
        wsUrl = `wss://${import.meta.env.VITE_LIVEKIT_URL || 'coretalk-e6xkfd5h.livekit.cloud'}`;
      } else if (tokenData.token) {
        token = typeof tokenData.token === 'string' ? tokenData.token
          : tokenData.token.token || tokenData.token.value || String(tokenData.token);
        wsUrl = tokenData.url || tokenData.wsUrl || `wss://${import.meta.env.VITE_LIVEKIT_URL || 'coretalk-e6xkfd5h.livekit.cloud'}`;
      } else {
        console.error('Unexpected token data format:', tokenData);
        return;
      }

      if (typeof token !== 'string' || token.length < 20 || token === '[object Object]') {
        console.error('Invalid token format:', token);
        return;
      }
      if (token.split('.').length !== 3) {
        console.error('Token does not have JWT structure');
        return;
      }

      this.livekitRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
        stopLocalTrackOnUnpublish: true,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
          voiceActivityDetection: false,
          googNoiseSuppression: true,
          googEchoCancellation: true,
          googHighpassFilter: true,
        },
        audioOutput: { deviceId: 'default' },
        publishDefaults: {
          // doc2: stopMicTrackOnMute: false keeps hardware track alive for recording clone
          stopMicTrackOnMute: false,
          dtx: false,
          audioBitrate: 32000,
        },
      });

      this.livekitRoom.on(RoomEvent.ConnectionStateChanged, (state) => {
        if (state === ConnectionState.Connected) console.log('Connected to LiveKit room');
      });
      this.livekitRoom.on(RoomEvent.ParticipantConnected, (participant) => {
        this.handleParticipantConnected(participant);
      });
      this.livekitRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
        this.handleParticipantDisconnected(participant);
      });
      this.livekitRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        this.handleTrackSubscribed(track, participant);
      });
      this.livekitRoom.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        this.handleTrackUnsubscribed(track, participant);
      });
      this.livekitRoom.on(RoomEvent.TrackMuted, (publication, participant) => {
        this.updateRemoteTrackDisplay(participant);
      });
      this.livekitRoom.on(RoomEvent.TrackUnmuted, (publication, participant) => {
        this.updateRemoteTrackDisplay(participant);
      });
      this.livekitRoom.on(RoomEvent.Reconnecting, () => {
        this.connectionStatus = 'reconnecting';
      });
      this.livekitRoom.on(RoomEvent.Reconnected, async () => {
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
            roomId: this.roomId, userName: this.userName, userId: this.userId, isHost: this.isHost
          });
        }
      });
      this.livekitRoom.on(RoomEvent.Disconnected, async (reason) => {
        this.connectionStatus = 'disconnected';
        if (reason === 1 || reason === 'leave' || reason === 'room_deleted') return;
        setTimeout(async () => {
          try {
            this.participants = [];
            this.remoteParticipants.clear();
            await this.initLivekit();
            if (this.socket && this.socket.connected) {
              this.socket.emit('join-room', {
                roomId: this.roomId, userName: this.userName, userId: this.userId, isHost: this.isHost
              });
            }
          } catch (err) { console.error('Rejoin failed:', err); }
        }, 2000);
      });

      try {
        await new Promise(resolve => setTimeout(resolve, 300));
        await this.livekitRoom.connect(wsUrl, token);
        this.livekitToken = token;
        const existingParticipants = this.livekitRoom.remoteParticipants;
        if (existingParticipants) {
          existingParticipants.forEach((participant) => {
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
      }
    },

    handleParticipantConnected(participant) {
      this.participants = this.participants.filter(p => p.id !== participant.identity);
      this.participants.push({
        id: participant.identity,
        userId: participant.identity,
        socketId: null,
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
      if (track.kind === Track.Kind.Video) this.attachVideoToGrid(track, participant);
      else if (track.kind === Track.Kind.Audio) this.attachAudio(track, participant);
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
            track.attach(videoElement);
            const p = this.participants.find(p => p.id === participant.identity);
            if (p) p.hasVideo = true;
            return;
          }
        }
        attempts++;
        if (attempts < maxAttempts) setTimeout(tryAttach, 150);
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
      const audioEl = document.createElement('audio');
      audioEl.muted = false;
      audioEl.autoplay = true;
      audioEl.setAttribute('playsinline', '');
      audioEl.setAttribute('crossorigin', 'anonymous');
      if (typeof audioEl.setSinkId === 'function') {
        audioEl.setSinkId('default').catch(() => {});
      }
      document.body.appendChild(audioEl);
      track.attach(audioEl);
      this.remoteAudioElements.set(id, audioEl);
      audioEl.play().catch(err => console.warn('Audio play failed:', err));
    },

    updateRemoteTrackDisplay(participant) {
      let hasVideo = false;
      let hasMic = false;
      if (typeof participant.getTrack === 'function') {
        const cameraPublication = participant.getTrack(Track.Source.Camera);
        const screenPublication = participant.getTrack(Track.Source.ScreenShare);
        hasVideo = !!(cameraPublication && !cameraPublication.isMuted) ||
                   !!(screenPublication && !screenPublication.isMuted);
        const audioPublication = participant.getTrack(Track.Source.Microphone);
        hasMic = !!(audioPublication && !audioPublication.isMuted);
      } else {
        const pubs = participant.trackPublications;
        if (pubs) {
          const entries = typeof pubs.values === 'function' ? [...pubs.values()] : Object.values(pubs);
          for (const pub of entries) {
            if (pub.source === Track.Source.Camera || pub.source === Track.Source.ScreenShare) {
              if (!pub.isMuted) hasVideo = true;
            }
            if (pub.source === Track.Source.Microphone) hasMic = !pub.isMuted;
          }
        }
      }
      const p = this.participants.find(p => p.id === participant.identity);
      if (p) { p.hasMic = hasMic; p.hasVideo = hasVideo; }
      else setTimeout(() => this.updateRemoteTrackDisplay(participant), 200);
    },

    initSocket() {
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
        this.isSocketConnected = true;
        this.socket.emit('join-room', {
          roomId: this.roomId, userName: this.userName, userId: this.userId, isHost: this.isHost
        });
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
          if (!this.raisedHands.find(h => h.userId === userId)) this.raisedHands.push({ userId, userName });
        } else {
          this.raisedHands = this.raisedHands.filter(h => h.userId !== userId);
        }
      });
      this.socket.on('meeting-ended', () => {
        this.cleanup();
        if (this.$router) this.$router.push('/Ending');
        else window.location.href = '/Ending';
      });
      // ==================== MUTE ALL (from doc2 - working) ====================
      this.socket.on('all-muted', async ({ locked }) => {
        if (this.isHost) {
          this.isMuteAllActive = locked;
          return;
        }
        this.isHostMuteLocked = locked;
        if (locked) {
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
        this.cleanup();
        if (this.$router) this.$router.push('/Ending');
        else window.location.href = '/Ending';
      });
      this.socket.on('participants-list', (list) => {
        const selfEntry = list.find(p => p.userId === this.userId);
        if (selfEntry) {
          this.isHost = selfEntry.isHost || false;
          localStorage.setItem('isHost', String(this.isHost));
        }
        list.filter(p => p.userId !== this.userId).forEach(p => {
          const existing = this.participants.find(ep => ep.userId === p.userId || ep.id === p.userId);
          if (existing) {
            existing.isHost = p.isHost || false;
            existing.name = p.name || existing.name;
            existing.socketId = p.id;
          } else {
            this.participants.push({
              id: p.userId, socketId: p.id, userId: p.userId,
              name: p.name || p.userId, isHost: p.isHost || false,
              hasMic: false, hasVideo: false, captions: ''
            });
          }
        });
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
        if (!this.isHost) return;
        if (!this.waitingParticipants.find(p => p.socketId === socketId)) {
          this.waitingParticipants.push({ socketId, userId, userName });
        }
      });
      this.socket.on('waiting-participant-left', ({ socketId }) => {
        this.waitingParticipants = this.waitingParticipants.filter(p => p.socketId !== socketId);
      });
      this.socket.on('doc-enact-visibility', ({ isOpen }) => {
        if (!this.isHost) this.showDocEnact = isOpen;
      });
    },

    startBroadcastRetry() {
      if (this.broadcastRetryTimer) clearInterval(this.broadcastRetryTimer);
      this.broadcastRetryTimer = setInterval(() => {
        if (this.broadcastQueue.length > 0 && this.isSocketConnected) this.processQueuedBroadcasts();
      }, 2000);
    },

    processQueuedBroadcasts() {
      if (!this.isSocketConnected || !this.socket?.connected) return;
      const toProcess = [...this.broadcastQueue];
      this.broadcastQueue = [];
      for (const broadcast of toProcess) {
        try { this.socket.emit(broadcast.event, broadcast.data); }
        catch (error) { this.broadcastQueue.push(broadcast); }
      }
    },

    // ==================== DOC ENACT (from doc2 - working) ====================
    toggleDocEnact() {
      this.showDocEnact = !this.showDocEnact;
      if (this.socket && this.socket.connected) {
        this.socket.emit('doc-relay', {
          roomId: this.roomId,
          type: 'doc-enact-visibility',
          isOpen: this.showDocEnact,
          senderId: this.userId,
        });
      }
    },

    async selectInboxMsg(msg) {
      if (this.selectedInboxMsg?.id === msg.id) {
        this.selectedInboxMsg = null;
        this.inboxMsgBody = '';
        return;
      }
      this.selectedInboxMsg = msg;
      this.inboxMsgBody = '';
      this.inboxMsgLoading = true;
      try {
        const r = await fetch(
          `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
          { headers: { Authorization: `Bearer ${this.gmailAccessToken}` } }
        );
        const d = await r.json();
        const extractBody = (parts, mimeType) => {
          if (!parts) return null;
          for (const part of parts) {
            if (part.mimeType === mimeType && part.body?.data) {
              return atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
            }
            if (part.parts) {
              const nested = extractBody(part.parts, mimeType);
              if (nested) return nested;
            }
          }
          return null;
        };
        const parts = d.payload?.parts;
        if (parts) {
          const htmlBody = extractBody(parts, 'text/html');
          if (htmlBody) {
            this.inboxMsgBody = htmlBody;
          } else {
            const plainBody = extractBody(parts, 'text/plain');
            if (plainBody) {
              this.inboxMsgBody = plainBody.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
            } else {
              this.inboxMsgBody = d.snippet || '';
            }
          }
        } else if (d.payload?.body?.data) {
          const body = atob(d.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          const mimeType = d.payload.mimeType || '';
          if (mimeType === 'text/html') {
            this.inboxMsgBody = body;
          } else {
            this.inboxMsgBody = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
          }
        } else {
          this.inboxMsgBody = d.snippet || 'No content available.';
        }
      } catch (e) {
        console.error('selectInboxMsg error:', e);
        this.inboxMsgBody = msg.snippet || 'Could not load email body.';
      } finally {
        this.inboxMsgLoading = false;
      }
    },

    safeBroadcast(event, data) {
      if (this.socket && this.socket.connected && this.isSocketConnected) {
        try { this.socket.emit(event, data); return true; }
        catch (error) { this.broadcastQueue.push({ event, data }); return false; }
      } else {
        this.broadcastQueue.push({ event, data });
        return false;
      }
    },

    async toggleMic() {
      if (this.isInitializingMedia) return;
      if (this.isHostMuteLocked && !this.isHost) return;
      if (!this.livekitRoom || !this.livekitRoom.localParticipant) return;
      this.isInitializingMedia = true;
      try {
        if (this.micon) {
          await this.livekitRoom.localParticipant.setMicrophoneEnabled(false);
          this.micon = false;
        } else {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
          } catch (permError) {
            console.warn('Permission request failed:', permError);
          }
          await new Promise(resolve => setTimeout(resolve, 500));
          await this.livekitRoom.localParticipant.setMicrophoneEnabled(true, {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: false,
            voiceActivityDetection: false,
          });
          this.micon = true;
        }
      } catch (error) {
        console.error('Error toggling microphone:', error);
        this.micon = false;
      } finally {
        this.isInitializingMedia = false;
      }
    },

    async toggleVideo() {
      if (this.isInitializingMedia) return;
      if (!this.livekitRoom || !this.livekitRoom.localParticipant) return;
      this.isInitializingMedia = true;
      try {
        if (this.videoon) {
          await this.livekitRoom.localParticipant.setCameraEnabled(false);
          this.videoon = false;
          const videoElement = this.$refs.localVideo;
          if (videoElement) videoElement.srcObject = null;
        } else {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } } });
            stream.getTracks().forEach(t => t.stop());
          } catch (permError) { console.warn('Permission request failed:', permError); }
          await this.livekitRoom.localParticipant.setCameraEnabled(true);
          this.videoon = true;
          await this.$nextTick();
          this.attachLocalCameraTrack();
        }
      } catch (error) {
        console.error('Error toggling camera:', error);
        this.videoon = false;
      } finally {
        this.isInitializingMedia = false;
      }
    },

    async sharescreen() {
      if (!this.livekitRoom || !this.livekitRoom.localParticipant) return;
      try {
        if (!this.isScreenSharing) {
          await this.livekitRoom.localParticipant.setScreenShareEnabled(true);
          this.isScreenSharing = true;
          await this.$nextTick();
          const videoElement = this.$refs.localVideo;
          if (videoElement) { videoElement.style.display = 'block'; videoElement.srcObject = null; }
          this.attachLocalScreenTrack();
        } else {
          await this.stopScreenShare();
        }
      } catch (error) {
        console.error('Error sharing screen:', error);
        this.isScreenSharing = false;
      }
    },

    async stopScreenShare() {
      try {
        await this.livekitRoom.localParticipant.setScreenShareEnabled(false);
        this.isScreenSharing = false;
        const videoElement = this.$refs.localVideo;
        if (videoElement) videoElement.srcObject = null;
        if (this.videoon && videoElement) this.attachLocalCameraTrack();
        else if (videoElement) videoElement.style.display = 'none';
      } catch (error) { console.error('Error stopping screen share:', error); }
    },

    async flipCamera() {
      if (!this.videoon) return;
      this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
      try {
        await this.livekitRoom.localParticipant.setCameraEnabled(false);
        await this.livekitRoom.localParticipant.setCameraEnabled(true, { facingMode: this.facingMode });
        await this.$nextTick();
        this.attachLocalCameraTrack();
      } catch (err) {
        console.error('Camera flip failed:', err);
        this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
      }
    },

    togglePanel(panel) {
      this.activePanel = this.activePanel === panel ? null : panel;
      this.activeDropdown = null;
      if (panel === 'chat') this.unreadMessages = 0;
      if (!panel) this.selectedRecipient = 'all';
    },

    setHover(icon) { this.hoveredIcon = icon; },

    toggleDropdown(type) {
      this.activeDropdown = this.activeDropdown === type ? null : type;
      this.activePanel = null;
    },

    resetinactivityTimer() {
      this.trayVisible = true;
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = setTimeout(() => { this.trayVisible = false; }, 5000);
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
          name: a.name, mimeType: a.mimeType, previewUrl: a.previewUrl, base64: a.base64, size: a.size
        })),
        targetSocketId,
      };
      this.safeBroadcast('chat-message', { roomId: this.roomId, ...message });
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
        roomId: this.roomId, userId: this.userId, userName: this.userName, isRaised: this.hand
      });
    },

    toggle_info() { this.show_info = !this.show_info; this.activeDropdown = null; },
    close_info() { this.show_info = false; },

    copystring() {
      const meetingLink = `${window.location.origin}/MeetingRoom/${this.roomId}`;
      navigator.clipboard.writeText(meetingLink).catch(() => {
        const textArea = document.createElement('textarea');
        textArea.value = meetingLink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      });
    },

    onAiNotesMouseEnter() {
      this.aiNotesFaded = false;
      if (this.aiNotesFadeTimer) { clearTimeout(this.aiNotesFadeTimer); this.aiNotesFadeTimer = null; }
    },
    onAiNotesMouseLeave() {
      if (this.aiNotesFadeTimer) clearTimeout(this.aiNotesFadeTimer);
      this.aiNotesFadeTimer = setTimeout(() => { this.aiNotesFaded = true; }, 5000);
    },

    async exitFullscreenIfActive() {
      try {
        if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
          await (document.exitFullscreen?.() || document.webkitExitFullscreen?.() || document.msExitFullscreen?.());
        }
        this.isFullscreen = false;
      } catch (err) { this.isFullscreen = false; }
    },

    async leave() {
      await this.exitFullscreenIfActive();
      this.cleanup();
      if (this.$router) this.$router.push('/Ending');
      else window.location.href = '/Ending';
    },

    // ==================== END MEETING (from doc2 - working) ====================
    async endMeeting() {
      if (!this.isHost) return;
      try {
        const authToken = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/end-meeting`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ roomId: this.roomId })
        });
        if (res.ok) {
          await this.exitFullscreenIfActive();
          this.cleanup();
          if (this.$router) this.$router.push('/Ending');
          else window.location.href = '/Ending';
        }
      } catch (err) { console.error('Error ending meeting:', err); }
    },

    // ==================== MUTE ALL (from doc2 - working) ====================
    async muteAll() {
      if (!this.isHost) return;
      const nextState = !this.isMuteAllActive;
      try {
        const authToken = localStorage.getItem('token');
        await fetch(`${import.meta.env.VITE_API_URL}/api/mute-all`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ roomId: this.roomId, locked: nextState })
        });
      } catch (err) { console.error('Error toggling mute all:', err); }
    },

    openExpelModal() { this.expelSelected = []; this.showExpelModal = true; this.activeDropdown = null; },

    // ==================== EXPEL MEMBERS (from doc2 - working) ====================
    expelSelectedMembers() {
      if (!this.isHost || this.expelSelected.length === 0) return;
      this.expelSelected.forEach(selectedId => {
        const found = this.participants.find(
          p => p.socketId === selectedId || p.userId === selectedId || p.id === selectedId
        );
        const targetSocketId = found?.socketId || selectedId;
        this.socket.emit('expel-participant', { roomId: this.roomId, targetSocketId });
      });
      this.expelSelected = [];
      this.showExpelModal = false;
    },

    // ==================== RECORDING (from doc2 - working, stopMicTrackOnMute: false) ====================
    async recording() {
      if (this.isRecording) {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') this.mediaRecorder.stop();
        this.isRecording = false;
        this.record = false;
        return;
      }
      let screenStream = null;
      let clonedMicTrack = null;
      let audioCtx = null;
      try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 30 } },
          audio: true
        });
        // doc2: reuse LiveKit's existing hardware mic track via .clone()
        // stopMicTrackOnMute: false guarantees hardware track stays alive even when UI-muted
        try {
          const micPub = this._getLocalTrack(Track.Source.Microphone);
          if (micPub?.track?.mediaStreamTrack) {
            clonedMicTrack = micPub.track.mediaStreamTrack.clone();
          }
        } catch (err) {
          console.warn('Could not clone LiveKit mic track for recording:', err);
        }
        audioCtx = new AudioContext();
        const destination = audioCtx.createMediaStreamDestination();
        if (screenStream.getAudioTracks().length > 0) {
          audioCtx.createMediaStreamSource(screenStream).connect(destination);
        }
        if (clonedMicTrack) {
          const micStream = new MediaStream([clonedMicTrack]);
          audioCtx.createMediaStreamSource(micStream).connect(destination);
        }
        const combinedStream = new MediaStream([
          ...screenStream.getVideoTracks(),
          ...destination.stream.getAudioTracks()
        ]);
        this.recordedChunks = [];
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
          ? 'video/webm;codecs=vp9,opus'
          : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
            ? 'video/webm;codecs=vp8,opus'
            : MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : '';
        this.mediaRecorder = new MediaRecorder(
          combinedStream,
          mimeType ? { mimeType, videoBitsPerSecond: 2500000, audioBitsPerSecond: 128000 } : {}
        );
        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) this.recordedChunks.push(e.data);
        };
        this.mediaRecorder.onstop = () => {
          screenStream?.getTracks().forEach(t => t.stop());
          clonedMicTrack?.stop();
          try { audioCtx?.close(); } catch (_) {}
          if (this.recordedChunks.length === 0) { this.recordedChunks = []; return; }
          const blob = new Blob(this.recordedChunks, { type: mimeType || 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `coretalk-${this.roomId}-${Date.now()}.webm`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 5000);
          this.recordedChunks = [];
        };
        screenStream.getVideoTracks()[0]?.addEventListener('ended', () => {
          if (this.isRecording && this.mediaRecorder?.state !== 'inactive') this.mediaRecorder.stop();
          this.isRecording = false;
          this.record = false;
        });
        this.mediaRecorder.start(1000);
        this.isRecording = true;
        this.record = true;
      } catch (err) {
        console.error('Recording failed:', err);
        screenStream?.getTracks().forEach(t => t.stop());
        clonedMicTrack?.stop();
        try { audioCtx?.close(); } catch (_) {}
        this.isRecording = false;
        this.record = false;
        this.mediaRecorder = null;
        this.recordedChunks = [];
      }
    },

    async checkNetworkQuality() {
      if (!this.livekitRoom) return;
    },

    // ==================== GMAIL ENACT (from doc2 - working) ====================
    emailEnact() {
      this.initiateGmailOAuth();
    },

    initiateGmailOAuth() {
      const clientId = import.meta.env.VITE_GMAIL_CLIENT_ID;
      const redirectUri = import.meta.env.VITE_GMAIL_REDIRECT_URI;
      const scope = 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly';
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth` +
        `?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=token&scope=${encodeURIComponent(scope)}`;
      const popup = window.open(authUrl, 'gmail-oauth', 'width=500,height=600');
      const expectedOrigin = window.location.origin;
      const handler = (event) => {
        if (event.origin !== expectedOrigin) return;
        if (event.data?.type === 'gmail-oauth-success') {
          this.gmailAccessToken = event.data.token;
          this.emailActiveTab = 'compose';
          this.inboxMessages = [];
          this.showEmailPanel = true;
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
          this.emailAttachments.push({ name: file.name, base64, mimeType: file.type || 'application/octet-stream' });
        };
        reader.readAsDataURL(file);
      });
      event.target.value = '';
    },

    removeAttachment(index) { this.emailAttachments.splice(index, 1); },

    async fetchInbox() {
      if (!this.gmailAccessToken) return;
      if (this.inboxLoading) return;
      this.inboxLoading = true;
      this.inboxError = null;
      try {
        const listRes = await fetch(
          'https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=15&labelIds=INBOX',
          { headers: { Authorization: `Bearer ${this.gmailAccessToken}` } }
        );
        if (!listRes.ok) throw new Error('Failed to fetch inbox');
        const listData = await listRes.json();
        const messages = listData.messages || [];
        const fetched = await Promise.all(messages.map(async (m) => {
          const r = await fetch(
            `https://www.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
            { headers: { Authorization: `Bearer ${this.gmailAccessToken}` } }
          );
          if (!r.ok) return null;
          const d = await r.json();
          const headers = d.payload?.headers || [];
          const get = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
          const rawFrom = get('From');
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
        }));
        this.inboxMessages = fetched.filter(Boolean);
      } catch (e) {
        this.inboxError = 'Could not load inbox: ' + e.message;
      } finally {
        this.inboxLoading = false;
      }
    },

    async sendEmail() {
      if (!this.gmailAccessToken) return;
      if (this.emailToInput && this.emailToInput.trim()) this.addRecipient();
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
      if (!this.emailSubject || !this.emailSubject.trim()) { this.emailErrors.subject = 'Subject is required.'; hasError = true; }
      if (!this.emailBody || !this.emailBody.trim()) { this.emailErrors.body = 'Message body is required.'; hasError = true; }
      if (hasError) return;
      this.emailSending = true;
      try {
        const authToken = localStorage.getItem('token');
        const senderEmail = localStorage.getItem('username') || this.userName || '';
        const attachments = (this.emailAttachments || [])
          .map(a => ({ name: a.name || 'attachment', base64: a.base64 || '', mimeType: a.mimeType || 'application/octet-stream' }))
          .filter(a => a.base64.length > 0);
        const toField = this.emailToList.map(addr => addr.trim()).join(', ');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            accessToken: this.gmailAccessToken, senderEmail,
            to: toField, subject: this.emailSubject.trim(),
            body: this.emailBody.trim(), attachments,
          }),
        });
        if (!response.ok) {
          let errMsg = `Server error (${response.status})`;
          try { const errData = await response.json(); errMsg = errData.message || errData.error || errMsg; } catch (_) {}
          throw new Error(errMsg);
        }
        this.emailToList = []; this.emailToInput = ''; this.emailSubject = '';
        this.emailBody = ''; this.emailAttachments = [];
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
      if (!emailRegex.test(val)) return;
      if (!this.emailToList.includes(val)) this.emailToList.push(val);
      this.emailToInput = '';
    },

    removeRecipient(index) { this.emailToList.splice(index, 1); },

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

    removeChatAttachment(index) { this.chatAttachments.splice(index, 1); },

    formatFileSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / 1048576).toFixed(1) + ' MB';
    },

    admitParticipant(socketId) {
      this.safeBroadcast('admit-participant', { roomId: this.roomId, socketId });
      this.waitingParticipants = this.waitingParticipants.filter(p => p.socketId !== socketId);
    },

    denyParticipant(socketId) {
      this.safeBroadcast('deny-participant', { roomId: this.roomId, socketId });
      this.waitingParticipants = this.waitingParticipants.filter(p => p.socketId !== socketId);
    },

    async cleanup() {
      if (this.isCleanedUp) return;
      this.isCleanedUp = true;
      if (this.durationInterval) { clearInterval(this.durationInterval); this.durationInterval = null; }
      if (this.broadcastRetryTimer) { clearInterval(this.broadcastRetryTimer); this.broadcastRetryTimer = null; }
      if (this.silentBackgroundEnabled) { await this.disableBackgroundNoiseSuppression(); this.silentBackgroundEnabled = false; }
      if (this.livekitRoom) {
        try {
          const lp = this.livekitRoom.localParticipant;
          if (lp) {
            if (this.micon) await lp.setMicrophoneEnabled(false);
            if (this.videoon) await lp.setCameraEnabled(false);
            if (this.isScreenSharing) await lp.setScreenShareEnabled(false);
          }
        } catch (e) { console.warn('Error disabling tracks during cleanup:', e); }
        this.livekitRoom.disconnect();
        this.livekitRoom = null;
      }
      if (this.mediaRecorder && this.isRecording) {
        try { this.mediaRecorder.stop(); } catch (e) { console.error('Error stopping recorder:', e); }
      }
      if (this.socket) { this.socket.disconnect(); this.socket = null; }
      if (this.networkCheckInterval) { clearInterval(this.networkCheckInterval); this.networkCheckInterval = null; }
      if (this.inactivityTimer) { clearTimeout(this.inactivityTimer); this.inactivityTimer = null; }
      if (this.guestInactivityTimer) { clearTimeout(this.guestInactivityTimer); this.guestInactivityTimer = null; }
      if (this.isGuest) {
        localStorage.removeItem('username');
        localStorage.removeItem('isGuest');
        localStorage.removeItem('guestId');
      }
      if (this.aiNotesFadeTimer) { clearTimeout(this.aiNotesFadeTimer); this.aiNotesFadeTimer = null; }
      this.remoteAudioElements.forEach((el) => { el.srcObject = null; el.remove(); });
      this.remoteAudioElements.clear();
      this.aiNotesFaded = false;
      this.participants = []; this.messages = []; this.micon = false; this.videoon = false;
      this.isScreenSharing = false; this.isRecording = false; this.record = false;
      this.isSocketConnected = false; this.broadcastQueue = [];
      this.remoteParticipants.clear(); this.showEmailPanel = false; this.gmailAccessToken = null;
      this.emailTo = ''; this.emailSubject = ''; this.emailBody = ''; this.emailAttachments = [];
      this.waitingParticipants = []; this.chatAttachments = [];
      this.showWhiteboard = false; this.showAiNotes = false; this.showDocEnact = false;
      this.emailToList = []; this.emailToInput = ''; this.isHostMuteLocked = false;
      this.isMuteAllActive = false; this.selectedRecipient = 'all';
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
    document.removeEventListener('click', this._outsideClickHandler);
  },

  async mounted() {
    const isGuest = localStorage.getItem('isGuest') === 'true';
    if (isGuest) {
      this.userName = localStorage.getItem('username') || 'Guest';
      this.userId = localStorage.getItem('guestId') || `guest_${Date.now()}`;
      this.isHost = false;
    } else {
      if (!this.initUserFromToken()) return;
    }

    this.roomId = this.computedRoomId;
    this.title = localStorage.getItem('meetingtitle') || 'Meeting Room';

    this.initSocket();
    await this.initLivekit();
    this.startDurationTimer();

    setTimeout(() => {
      this.networkCheckInterval = setInterval(() => { this.checkNetworkQuality(); }, 5000);
    }, 5000);

    this.resetinactivityTimer();
    document.addEventListener('mousemove', this.resetinactivityTimer);
    document.addEventListener('keydown', this.resetinactivityTimer);
    document.addEventListener('click', this.resetinactivityTimer);
    document.addEventListener('touchstart', this.resetinactivityTimer);

    if (this.isGuest) {
      const GUEST_TIMEOUT = 60 * 60 * 1000;
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

    this._outsideClickHandler = (e) => {
      if (this.activeDropdown) this.activeDropdown = null;
      if (this.show_info && !e.target.closest('#info_box')) this.show_info = false;
    };
    document.addEventListener('click', this._outsideClickHandler);
  }
};
</script>

<style>
/* ==================== RESET & BASE ==================== */
* { box-sizing: border-box; }

body {
  background-color: #141414;
  margin: 0;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  color: white;
  overflow: hidden;
}

/* ==================== PAGE LAYOUT ==================== */
#page {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background-color: #141414;
  flex-direction: column;
}

/* ==================== MAIN CONTENT ==================== */
#main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 10px 10px 0 10px;
  padding-bottom: 76px;
  overflow: hidden;
}

/* ==================== GRID CONTAINER ==================== */
#grid-container {
  display: grid;
  gap: 8px;
  width: 100%;
  height: 100%;
}

.grid-1  { grid-template-columns: 1fr; grid-template-rows: 1fr; }
.grid-2  { grid-template-columns: repeat(2, 1fr); grid-template-rows: 1fr; }
.grid-4  { grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(2, 1fr); }
.grid-6  { grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(2, 1fr); }
.grid-9  { grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); }
.grid-many {
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  grid-auto-rows: minmax(180px, 1fr);
  overflow-y: auto;
}

@media (max-width: 600px) {
  .grid-2 { grid-template-columns: 1fr; grid-template-rows: repeat(2, 1fr); }
  .grid-4 { grid-template-columns: repeat(2, 1fr); }
}

/* ==================== PARTICIPANT TILES ==================== */
.participant-tile {
  position: relative;
  background-color: #1e1e1e;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 160px;
  border: 1.5px solid #2a2a2a;
  transition: border-color 0.2s;
}

.participant-tile:hover { border-color: #3a3a3a; }

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
  background-color: #252525;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
}

.avatar-circle {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background-color: #2f6b4f;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 600;
  color: white;
  letter-spacing: 1px;
}

.participant-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%);
  padding: 24px 10px 8px 10px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  z-index: 2;
}

.participant-name {
  font-size: 13px;
  font-weight: 500;
  color: white;
  text-shadow: 0 1px 3px rgba(0,0,0,0.8);
}

.participant-controls { display: flex; gap: 4px; }

.ctrl-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(0,0,0,0.55);
}

.ctrl-icon.muted { color: #ff5252; }

.local-participant { border: 1.5px solid rgba(74, 200, 120, 0.5); }

/* ==================== BOTTOM NAVBAR ==================== */
#navbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 68px;
  background-color: #1a1a1a;
  border-top: 1px solid #2a2a2a;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 0 16px;
  z-index: 10;
}

#navbar-left {
  display: flex;
  flex-direction: column;
  gap: 1px;
  overflow: hidden;
}

#meeting-title-text {
  font-size: 13px;
  font-weight: 500;
  color: #e0e0e0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

#meeting-duration {
  font-size: 12px;
  color: #888;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.5px;
}

#navbar-center {
  display: flex;
  align-items: center;
  gap: 6px;
}

#navbar-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}

/* ==================== NAV BUTTON WRAPPERS ==================== */
.nav-btn-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.nav-btn-label {
  font-size: 10px;
  color: #888;
  white-space: nowrap;
  user-select: none;
}

/* ==================== NAV BUTTONS — main ==================== */
.nav-btn {
  width: 46px;
  height: 46px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s, transform 0.1s;
  outline: none;
  position: relative;
}

.nav-btn:hover { transform: scale(1.06); }
.nav-btn:active { transform: scale(0.97); }
.nav-btn svg { flex-shrink: 0; }

.btn-active  { background-color: #2a2a2a; color: #4ac878; }
.btn-danger  { background-color: #3d1515; color: #ff5252; }
.btn-accent  { background-color: #1a3a2a; color: #4ac878; }
.btn-neutral { background-color: #2a2a2a; color: #cccccc; }
.btn-leave   { background-color: #c0392b; color: white; border-radius: 14px; width: 52px; }

.btn-active:hover  { background-color: #333; }
.btn-danger:hover  { background-color: #4d1a1a; }
.btn-accent:hover  { background-color: #1e4430; }
.btn-neutral:hover { background-color: #333; }
.btn-leave:hover   { background-color: #a93226; }

/* ==================== NAV BUTTONS — small ==================== */
.nav-btn-sm {
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s;
  outline: none;
  position: relative;
}

.nav-btn-sm:hover { background-color: #333 !important; }
.nav-btn-sm svg { flex-shrink: 0; }

/* ==================== NAV BADGES ==================== */
.nav-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background-color: #4ac878;
  color: #0a1a10;
  border-radius: 10px;
  min-width: 18px;
  height: 18px;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

.nav-badge-red { background-color: #e53935; color: white; }

/* ==================== TOOLTIPS ==================== */
.nav-tooltip {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(30,30,30,0.95);
  color: #e0e0e0;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 99;
  pointer-events: none;
  border: 1px solid #333;
}

/* ==================== FEATURES PANEL ==================== */
.features-panel {
  position: absolute;
  bottom: calc(100% + 12px);
  left: 50%;
  transform: translateX(-50%);
  background-color: #1e1e1e;
  border: 1px solid #2e2e2e;
  border-radius: 14px;
  padding: 14px;
  z-index: 50;
  width: 280px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.6);
}

.features-panel-title {
  font-size: 12px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #2a2a2a;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.feature-tile {
  background: #252525;
  border: 1px solid #333;
  border-radius: 10px;
  padding: 10px 6px 8px 6px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  transition: background 0.15s, border-color 0.15s;
  position: relative;
  color: #ccc;
}

.feature-tile:hover { background: #2e2e2e; border-color: #444; }
.feature-tile svg { color: #aaa; }
.feature-tile span:not(.feat-on-badge) { font-size: 11px; color: #bbb; text-align: center; line-height: 1.2; }

.feature-tile-on { background: #1a3a2a; border-color: #2d6b46; }
.feature-tile-on svg { color: #4ac878; }
.feature-tile-on span:not(.feat-on-badge) { color: #4ac878; }

.feature-tile-rec { background: #3a1a1a; border-color: #6b2d2d; }
.feature-tile-rec svg { color: #ff5252; }
.feature-tile-rec span:not(.feat-on-badge) { color: #ff5252; }

.feature-tile-danger { border-color: #4d1a1a; }
.feature-tile-danger:hover { background: #3a1515; border-color: #6b2020; }
.feature-tile-danger svg { color: #ff6b6b; }
.feature-tile-danger span:not(.feat-on-badge) { color: #ff6b6b; }

.feat-on-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 8px;
  font-weight: 700;
  background: #4ac878;
  color: #0a1a10;
  border-radius: 4px;
  padding: 1px 4px;
  line-height: 1.4;
}

.rec-badge { background: #ff5252; color: white; }

/* ==================== MOBILE DROPDOWN ==================== */
.dropdown-menu {
  position: absolute;
  bottom: 50px;
  right: 0;
  background-color: #1e1e1e;
  border-radius: 10px;
  border: 1px solid #2e2e2e;
  list-style: none;
  min-width: 180px;
  padding: 6px 0;
  z-index: 50;
  box-shadow: 0 4px 20px rgba(0,0,0,0.5);
}

.dropdown-menu li {
  margin: 0;
  color: #ccc;
  padding: 10px 16px;
  cursor: pointer;
  font-size: 13px;
  transition: background-color 0.15s;
}

.dropdown-menu li:hover { background-color: #2a2a2a; }

/* ==================== SIDE PANELS ==================== */
#chat-box,
#list-box {
  position: fixed;
  bottom: 68px;
  right: 0;
  width: 320px;
  height: calc(100vh - 68px);
  background-color: #ffffff;
  border-left: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  z-index: 20;
  box-shadow: -4px 0 20px rgba(0,0,0,0.3);
}

.panel-header {
  padding: 14px 16px;
  font-size: 15px;
  font-weight: 600;
  background-color: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  color: #000000;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.panel-header button {
  background: none;
  border: none;
  color: #555;
  font-size: 18px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.panel-header button:hover { background-color: #e0e0e0; }

.panel-body {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  background-color: #ffffff;
}

.message {
  background-color: #f5f5f5;
  padding: 10px 12px;
  border-radius: 8px;
  margin-bottom: 10px;
  border: 1px solid #ebebeb;
}

.message-sender { font-weight: 600; font-size: 12px; color: #2f6b4f; margin-bottom: 3px; }
.message-text { font-size: 14px; color: #333; word-wrap: break-word; }
.message-time { font-size: 11px; color: #999; margin-top: 4px; }

.chat-input-section {
  display: flex;
  padding: 10px;
  border-top: 1px solid #e0e0e0;
  background-color: #fff;
  gap: 8px;
}

.chat-input {
  flex: 1;
  padding: 9px 14px;
  border-radius: 22px;
  border: 1px solid #e0e0e0;
  outline: none;
  background-color: #f5f5f5;
  color: #000;
  font-size: 14px;
}

.chat-input::placeholder { color: #999; }

.chat-send {
  width: 40px;
  height: 40px;
  background-color: #2f6b4f;
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background-color 0.2s;
}

.chat-send:hover { background-color: #256040; }
.chat-send:disabled { background-color: #ccc; cursor: not-allowed; }
.chat-send svg { transform: rotate(-45deg); }

.participant {
  background-color: #f7f7f7;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #ebebeb;
}

.participant.self { border: 1.5px solid #2f6b4f; background-color: #f0f9f4; }

.participant-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background-color: #2f6b4f;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: white;
  font-size: 14px;
  flex-shrink: 0;
}

.participant-name-text { font-size: 13px; font-weight: 600; color: #111; }
.participant-status { font-size: 11px; color: #777; margin-top: 1px; }

/* ==================== MEETING INFO MODAL ==================== */
#info_box {
  position: fixed;
  bottom: 80px;
  right: 20px;
  width: 320px;
  background-color: #fff;
  color: #000;
  border-radius: 12px;
  padding: 20px;
  z-index: 30;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  border: 1px solid #e0e0e0;
}

#info_header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

#info_header b { font-size: 16px; font-weight: 600; }

#info_header button {
  background: none;
  border: none;
  font-size: 18px;
  color: #555;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}

#info_header button:hover { background-color: #f0f0f0; }
#info_box hr { border: none; border-top: 1px solid #ebebeb; margin: 10px 0; }

.info-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
.info-label { color: #777; }
.info-value { color: #111; font-weight: 500; text-align: right; max-width: 180px; word-break: break-all; }

#copylink {
  width: 100%;
  background-color: #2f6b4f;
  color: white;
  border: none;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  margin-top: 12px;
  transition: background-color 0.2s;
}

#copylink:hover { background-color: #256040; }

/* ==================== HAND RAISED ==================== */
#hand_warning {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #e67e22;
  color: white;
  padding: 8px 20px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 13px;
  z-index: 101;
  animation: slideIn 0.3s ease;
}

#hand_warning p { margin: 0; }

/* ==================== TRANSITIONS ==================== */
.slide-fade-enter-active, .slide-fade-leave-active { transition: all 0.25s ease; }
.slide-fade-enter-from, .slide-fade-leave-to { opacity: 0; transform: translateY(16px); }

/* ==================== EMAIL PANEL ==================== */
#email-box {
  position: fixed;
  bottom: 80px;
  right: 20px;
  width: 340px;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.25);
  border: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  z-index: 101;
  max-height: 520px;
  overflow: hidden;
}

.email-tabs { display: flex; border-bottom: 1px solid #e0e0e0; background: #fafafa; flex-shrink: 0; }

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

.email-tab-btn.active { color: #1a73e8; border-bottom: 2px solid #1a73e8; background: #fff; }

.email-inbox-panel { flex: 1; overflow-y: auto; min-height: 0; }
.email-inbox-loading, .email-inbox-empty, .email-inbox-error { padding: 20px 16px; text-align: center; font-size: 13px; color: #888; }
.email-inbox-error { color: #d32f2f; }

.email-inbox-item { padding: 10px 14px; border-bottom: 1px solid #f0f0f0; cursor: pointer; transition: background 0.12s; }
.email-inbox-item:hover { background: #f5f5f5; }
.email-inbox-item:last-child { border-bottom: none; }

.email-inbox-item-header { display: flex; justify-content: space-between; align-items: baseline; gap: 4px; margin-bottom: 2px; }
.email-inbox-from { font-size: 13px; font-weight: 600; color: #202124; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
.email-inbox-date { font-size: 11px; color: #888; white-space: nowrap; flex-shrink: 0; }
.email-inbox-subject { font-size: 12px; color: #555; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.email-inbox-full-body { margin-top: 6px; overflow-x: auto; }
.email-inbox-full-body div { all: revert; max-width: 100%; overflow-x: hidden; font-size: 13px !important; font-family: 'Segoe UI', sans-serif !important; }
.email-inbox-full-body img { max-width: 100%; height: auto; }
.email-inbox-full-body a { color: #1a73e8; word-break: break-all; }

.email-header { padding: 13px 16px; background-color: #f5f5f5; border-bottom: 1px solid #e0e0e0; border-radius: 12px 12px 0 0; font-weight: 600; font-size: 14px; color: #000; display: flex; justify-content: space-between; align-items: center; }
.email-header button { background: none; border: none; font-size: 18px; cursor: pointer; color: #555; }

.email-body-panel { padding: 12px 16px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; flex: 1; min-height: 0; }

.email-field { width: 100%; padding: 8px 12px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 13px; color: #000; background: #f9f9f9; outline: none; box-sizing: border-box; }
.email-textarea { width: 100%; height: 90px; padding: 8px 12px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 13px; color: #000; background: #f9f9f9; outline: none; resize: none; box-sizing: border-box; }

.email-footer { padding: 10px 16px; border-top: 1px solid #e0e0e0; }

.email-send-btn { width: 100%; padding: 10px; background-color: #2f6b4f; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
.email-send-btn:hover { background-color: #256040; }
.email-send-btn:disabled { background-color: #ccc; cursor: not-allowed; }

.email-permission-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 200; }
.email-permission-box { background: #fff; border-radius: 12px; padding: 24px; width: 320px; text-align: center; color: #000; }
.email-permission-box h3 { margin: 0 0 8px; font-size: 17px; }
.email-permission-box p { font-size: 13px; color: #555; margin-bottom: 18px; }
.email-permission-buttons { display: flex; gap: 8px; justify-content: center; }

.email-attach-row { display: flex; flex-direction: column; gap: 6px; }
.email-attach-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border: 1px dashed #ccc; border-radius: 8px; cursor: pointer; font-size: 12px; color: #555; transition: background 0.2s; width: fit-content; }
.email-attach-btn:hover { background: #f0f0f0; }
.email-attach-list { display: flex; flex-wrap: wrap; gap: 6px; }
.email-attach-chip { display: inline-flex; align-items: center; gap: 4px; background: #eef2ff; color: #3730a3; border-radius: 20px; padding: 3px 10px; font-size: 12px; }
.email-attach-chip button { background: none; border: none; cursor: pointer; color: #3730a3; font-size: 13px; padding: 0; }

.email-recipients-wrapper { border: 1px solid #e0e0e0; border-radius: 8px; background: #f9f9f9; padding: 6px 8px; min-height: 38px; }
.email-chips-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.email-chip { display: inline-flex; align-items: center; gap: 4px; background: #e8f0fe; color: #1a73e8; border-radius: 14px; padding: 3px 10px; font-size: 12px; font-weight: 500; }
.email-chip button { background: none; border: none; cursor: pointer; color: #1a73e8; font-size: 13px; padding: 0; }
.email-chip-input { flex: 1; min-width: 140px; border: none; outline: none; background: transparent; font-size: 13px; color: #000; padding: 2px 4px; }

.field-error-border { border: 1px solid #e53935 !important; }
.field-error-msg { color: #e53935; font-size: 11px; margin-top: 3px; display: block; }

.perm-deny    { background: #f44336; color: white; border: none; padding: 9px 14px; border-radius: 8px; cursor: pointer; font-size: 13px; }
.perm-once    { background: #FF9800; color: white; border: none; padding: 9px 14px; border-radius: 8px; cursor: pointer; font-size: 13px; }
.perm-always  { background: #4CAF50; color: white; border: none; padding: 9px 14px; border-radius: 8px; cursor: pointer; font-size: 13px; }

/* ==================== EXPEL MODAL ==================== */
.expel-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 200; }
.expel-box { background: #fff; border-radius: 14px; width: 320px; max-height: 460px; display: flex; flex-direction: column; overflow: hidden; color: #111; box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
.expel-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-bottom: 1px solid #e0e0e0; font-size: 14px; background: #f5f5f5; border-radius: 14px 14px 0 0; }
.expel-header button { background: none; border: none; font-size: 18px; cursor: pointer; color: #555; }
.expel-body { overflow-y: auto; flex: 1; padding: 6px 0; }
.expel-member-row { display: flex; align-items: center; gap: 10px; padding: 9px 14px; cursor: pointer; transition: background 0.12s; border-radius: 8px; margin: 2px 8px; }
.expel-member-row:hover { background: #f0f0f0; }
.expel-checkbox { width: 15px; height: 15px; accent-color: #e53935; cursor: pointer; flex-shrink: 0; }
.expel-avatar { width: 34px; height: 34px; border-radius: 50%; background: #3730a3; color: white; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
.expel-member-name { font-size: 13px; font-weight: 600; }
.expel-member-role { font-size: 11px; color: #888; }
.expel-footer { display: flex; gap: 8px; padding: 10px 14px; border-top: 1px solid #e0e0e0; }
.expel-cancel-btn { flex: 1; padding: 9px; background: #f0f0f0; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; color: #333; }
.expel-cancel-btn:hover { background: #e0e0e0; }
.expel-confirm-btn { flex: 1; padding: 9px; background: #e53935; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; color: white; }
.expel-confirm-btn:hover:not(:disabled) { background: #c62828; }
.expel-confirm-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* ==================== AI NOTES WRAPPER ==================== */
.ai-notes-wrapper {
  position: fixed;
  bottom: 78px;
  left: 16px;
  z-index: 50;
  width: 360px;
  max-height: calc(100vh - 100px);
  transition: opacity 0.6s ease;
  opacity: 1;
}

.ai-notes-wrapper.ai-notes-faded { opacity: 0.45; }

/* ==================== SCROLLBARS ==================== */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #3a3a3a; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #4a4a4a; }

.panel-body::-webkit-scrollbar-thumb,
#chat-box ::-webkit-scrollbar-thumb,
#list-box ::-webkit-scrollbar-thumb { background: #ccc; }

/* ==================== ANIMATIONS ==================== */
@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0); opacity: 1; }
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ==================== RESPONSIVE ==================== */
@media (max-width: 768px) {
  #navbar-left { display: none; }
  #navbar { grid-template-columns: auto 1fr; }
  #chat-box, #list-box { width: 100%; }
  #info_box { width: calc(100% - 32px); right: 16px; left: 16px; }
  .features-panel { width: 240px; left: auto; right: 0; transform: none; }
  .features-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
