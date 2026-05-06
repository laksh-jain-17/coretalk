<template>
  <div id="doc-enact-panel">
    <div class="doc-header">
      <span>Doc Enact</span>
      <div class="doc-header-right">
        <span v-if="isHost" class="role-badge host-badge">Host</span>
        <span v-else-if="canEdit" class="role-badge edit-badge">Editor</span>
        <span v-else class="role-badge view-badge">View Only</span>

        <!-- Members dropdown (host only) -->
        <div v-if="isHost" class="members-wrapper" ref="membersWrapperRef">
          <button class="members-btn" @click="toggleMembers" :class="{ active: showMembers }">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span>Members</span>
            <span class="members-count">{{ participants.length }}</span>
            <svg class="chevron" :class="{ open: showMembers }" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          <!-- Dropdown panel -->
          <transition name="dropdown">
            <div class="members-dropdown" v-if="showMembers">
              <div class="dropdown-header">
                <span class="dropdown-title">Edit Access</span>
                <div class="access-bulk-btns">
                  <button class="grant-all-btn" @click="grantAll">Grant All</button>
                  <button class="revoke-all-btn" @click="revokeAll">Revoke All</button>
                </div>
              </div>
              <div class="access-list">
                <div v-if="participants.length === 0" class="no-participants">
                  No other participants yet
                </div>
                <div v-for="p in participants" :key="p.id" class="access-row">
                  <div class="access-name-wrap">
                    <div class="access-avatar">{{ getInitials(p.name) }}</div>
                    <span class="access-name">{{ p.name }}</span>
                  </div>
                  <label class="toggle-switch">
                    <input
                      type="checkbox"
                      :checked="editors.includes(p.id)"
                      @change="toggleAccess(p.id)"
                    />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>
          </transition>
        </div>

        <button @click="$emit('close')">✕</button>
      </div>
    </div>

    <div v-if="canEdit" class="doc-toolbar">
      <button @mousedown.prevent="fmt('bold')"><b>B</b></button>
      <button @mousedown.prevent="fmt('italic')"><i>I</i></button>
      <button @mousedown.prevent="fmt('underline')"><u>U</u></button>
      <div class="toolbar-sep"></div>
      <button @mousedown.prevent="fmt('formatBlock', 'H1')">H1</button>
      <button @mousedown.prevent="fmt('formatBlock', 'H2')">H2</button>
      <button @mousedown.prevent="fmt('formatBlock', 'H3')">H3</button>
      <div class="toolbar-sep"></div>
      <button @mousedown.prevent="fmt('insertUnorderedList')">• List</button>
      <button @mousedown.prevent="fmt('insertOrderedList')">1. List</button>
      <div class="toolbar-sep"></div>
      <button @mousedown.prevent="fmt('formatBlock', 'P')">¶</button>
    </div>

    <div
      ref="docBody"
      class="doc-body"
      :contenteditable="canEdit ? 'true' : 'false'"
      :class="{ 'doc-editable': canEdit, 'doc-readonly': !canEdit }"
      @input="onInput"
      @keydown="onKeydown"
      @mouseup="saveMobileSelection"
      @touchend="saveMobileSelection"
      spellcheck="true"
      data-placeholder="Start typing your document..."
    ></div>

    <div class="doc-footer">
      <span class="doc-status">{{ statusText }}</span>
      <button v-if="canEdit" class="doc-download-btn" @click="downloadDoc">Download</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DocEnactPanel',

  props: {
    livekitRoom:  { type: Object,  required: true },
    isHost:       { type: Boolean, default: false },
    userId:       { type: String,  required: true },
    participants: { type: Array,   default: () => [] },
    roomId:       { type: String,  required: true },
    socket:       { type: Object,  default: null },
  },

  emits: ['close'],

  data() {
    return {
      editors:      [],
      lastContent:  '',
      debounceTimer: null,
      saveTimer:    null,
      statusText:   'Connecting...',
      isMobile:     /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
      savedRange:   null,
      _dataHandler: null,
      showMembers:  false,
    };
  },

  computed: {
    canEdit() {
      return this.isHost || this.editors.includes(this.userId);
    },
  },

  mounted() {
    this._dataHandler = this._onLivekitData.bind(this);
    this.livekitRoom.on('dataReceived', this._dataHandler);

    if (this.socket) {
      this._socketDocState          = (msg) => this._handleMsg({ type: 'doc-state',          ...msg });
      this._socketDocUpdate         = (msg) => this._handleMsg({ type: 'doc-update',         ...msg });
      this._socketDocAccessChanged  = (msg) => this._handleMsg({ type: 'doc-access-changed', ...msg });
      this._socketDocRequestState   = (msg) => this._handleMsg({ type: 'doc-request-state',  ...msg });

      this.socket.on('doc-state',          this._socketDocState);
      this.socket.on('doc-update',         this._socketDocUpdate);
      this.socket.on('doc-access-changed', this._socketDocAccessChanged);
      this.socket.on('doc-request-state',  this._socketDocRequestState);
    }

    document.addEventListener('mousedown', this._handleOutsideClick);

    this.$nextTick(() => {
      if (this.isHost) {
        this.broadcastFullState();
        this.statusText = 'Connected';
      } else {
        this.statusText = 'Loading document...';
        this._requestState();
        this._retry1 = setTimeout(() => this._requestState(), 2000);
        this._retry2 = setTimeout(() => this._requestState(), 5000);
      }
    });
  },

  beforeUnmount() {
    if (this._dataHandler) {
      this.livekitRoom.off('dataReceived', this._dataHandler);
    }
    if (this.socket) {
      this.socket.off('doc-state',          this._socketDocState);
      this.socket.off('doc-update',         this._socketDocUpdate);
      this.socket.off('doc-access-changed', this._socketDocAccessChanged);
      this.socket.off('doc-request-state',  this._socketDocRequestState);
    }
    document.removeEventListener('mousedown', this._handleOutsideClick);
    clearTimeout(this.debounceTimer);
    clearTimeout(this.saveTimer);
    clearTimeout(this._retry1);
    clearTimeout(this._retry2);
  },

  methods: {

    toggleMembers() {
      this.showMembers = !this.showMembers;
    },

    _handleOutsideClick(e) {
      if (
        this.showMembers &&
        this.$refs.membersWrapperRef &&
        !this.$refs.membersWrapperRef.contains(e.target)
      ) {
        this.showMembers = false;
      }
    },

    saveMobileSelection() {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        try { this.savedRange = sel.getRangeAt(0).cloneRange(); } catch (_) {}
      }
    },

    _sendLivekit(payload) {
      try {
        const lp = this.livekitRoom?.localParticipant;
        if (!lp) return;
        lp.publishData(new TextEncoder().encode(JSON.stringify(payload)), 1);
      } catch (err) {
        console.warn('[DocEnact] LiveKit send failed:', err.message);
      }
    },

    _sendSocket(payload) {
      if (!this.socket?.connected) return;
      this.socket.emit('doc-relay', { roomId: this.roomId, ...payload });
    },

    sendData(payload) {
      this._sendLivekit(payload);
      this._sendSocket(payload);
    },

    _requestState() {
      this.sendData({ type: 'doc-request-state', senderId: this.userId });
    },

    _onLivekitData(payload) {
      try {
        const text = typeof payload === 'string'
          ? payload
          : new TextDecoder().decode(payload);
        const msg = JSON.parse(text);
        if (!msg.type?.startsWith('doc-')) return;
        this._handleMsg(msg);
      } catch (_) {}
    },

    _handleMsg(msg) {
      switch (msg.type) {

        case 'doc-request-state':
          if (this.isHost) this.broadcastFullState();
          break;

        case 'doc-state':
          clearTimeout(this._retry1);
          clearTimeout(this._retry2);
          this.editors = Array.isArray(msg.editors) ? msg.editors : [];
          this.setContent(msg.content || '');
          this._updateAccessStatus();
          this.statusText = this.isHost ? 'Connected' : (this.canEdit ? '✏️ Edit access granted' : '👁 View only');
          setTimeout(() => { this.statusText = 'Connected'; }, 2000);
          break;

        case 'doc-update':
          if (msg.senderId === this.userId) return;
          this._applyRemote(msg.content || '');
          break;

        case 'doc-access-changed':
          this.editors = Array.isArray(msg.editors) ? msg.editors : [];
          this._updateAccessStatus();
          if (this.canEdit && !this.isHost) {
            setTimeout(() => this._requestState(), 300);
          }
          break;
      }
    },

    broadcastFullState() {
      this.sendData({
        type:     'doc-state',
        content:  this.$refs.docBody?.innerHTML || '',
        editors:  this.editors,
        senderId: this.userId,
      });
    },

    fmt(command, value = null) {
      if (this.isMobile && this.savedRange) {
        try {
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(this.savedRange);
        } catch (_) {}
      }
      document.execCommand(command, false, value);
      this.$refs.docBody?.focus();
      this._broadcastContent();
    },

    onInput() {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this._broadcastContent(), 150);
    },

    onKeydown(e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
      }
    },

    _broadcastContent() {
      const content = this.$refs.docBody?.innerHTML || '';
      if (content === this.lastContent) return;
      this.lastContent = content;
      this.statusText  = 'Syncing...';
      this.sendData({ type: 'doc-update', content, senderId: this.userId });
      clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => {
        this.statusText = 'Synced ✓';
        setTimeout(() => { this.statusText = 'Connected'; }, 1500);
      }, 400);
    },

    _applyRemote(content) {
      const saved = this._saveSelection();
      this.setContent(content);
      this._restoreSelection(saved);
    },

    setContent(html) {
      if (this.$refs.docBody) {
        this.$refs.docBody.innerHTML = html;
        this.lastContent = html;
      }
    },

    toggleAccess(participantId) {
      this.editors = this.editors.includes(participantId)
        ? this.editors.filter(id => id !== participantId)
        : [...this.editors, participantId];
      this._broadcastAccess();
    },

    grantAll() {
      this.editors = this.participants.map(p => p.id);
      this._broadcastAccess();
    },

    revokeAll() {
      this.editors = [];
      this._broadcastAccess();
    },

    _broadcastAccess() {
      this.sendData({ type: 'doc-access-changed', editors: this.editors, senderId: this.userId });
      setTimeout(() => this.broadcastFullState(), 150);
    },

    _updateAccessStatus() {
      if (this.isHost) { this.statusText = 'Connected'; return; }
      this.statusText = this.canEdit ? '✏️ Edit access granted' : '👁 View only';
      setTimeout(() => { this.statusText = 'Connected'; }, 2500);
    },

    downloadDoc() {
      const content = this.$refs.docBody?.innerHTML || '';
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Doc Enact</title>
<style>body{font-family:'Segoe UI',sans-serif;max-width:800px;margin:40px auto;padding:0 24px;line-height:1.7;color:#1a1a1a;}
h1{font-size:2em;}h2{font-size:1.5em;}h3{font-size:1.2em;}ul,ol{padding-left:24px;}</style>
</head><body>${content}</body></html>`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      a.download = `doc-${this.roomId}-${Date.now()}.html`;
      a.click();
      URL.revokeObjectURL(a.href);
    },

    getInitials(name) {
      if (!name) return '?';
      const parts = name.trim().split(' ');
      if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    },

    _saveSelection() {
      try {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return null;
        const range = sel.getRangeAt(0);
        return {
          start: this._getOffset(this.$refs.docBody, range.startContainer, range.startOffset),
          end:   this._getOffset(this.$refs.docBody, range.endContainer,   range.endOffset),
        };
      } catch (_) { return null; }
    },

    _restoreSelection(saved) {
      if (!saved || !this.$refs.docBody) return;
      try {
        const sel   = window.getSelection();
        const start = this._nodeAt(this.$refs.docBody, saved.start);
        const end   = this._nodeAt(this.$refs.docBody, saved.end);
        if (!start || !end) return;
        const range = document.createRange();
        range.setStart(start.node, start.offset);
        range.setEnd(end.node,     end.offset);
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (_) {}
    },

    _getOffset(root, node, offset) {
      let pos = 0;
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (w.nextNode()) {
        if (w.currentNode === node) return pos + offset;
        pos += w.currentNode.textContent.length;
      }
      return pos;
    },

    _nodeAt(root, target) {
      let pos = 0;
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (w.nextNode()) {
        const len = w.currentNode.textContent.length;
        if (pos + len >= target) return { node: w.currentNode, offset: target - pos };
        pos += len;
      }
      return null;
    },
  },
};
</script>

<style scoped>
#doc-enact-panel {
  position: fixed;
  top: 0; right: 0; bottom: 70px;
  width: 420px;
  background: #fff;
  border-left: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  z-index: 100;
  box-shadow: -4px 0 16px rgba(0,0,0,0.15);
  font-family: 'Segoe UI', sans-serif;
}

/* ── Header ── */
.doc-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 16px; background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  font-weight: 700; font-size: 15px; color: #000; flex-shrink: 0;
  position: relative; /* stacking context for dropdown */
}
.doc-header-right { display: flex; align-items: center; gap: 8px; }
.doc-header > .doc-header-right > button {
  background: none; border: none; font-size: 18px;
  cursor: pointer; color: #000; padding: 2px 6px; border-radius: 4px;
}
.doc-header > .doc-header-right > button:hover { background: #e0e0e0; }

.role-badge { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 12px; }
.host-badge  { background: #fff8e1; color: #f57f17; border: 1px solid #ffe082; }
.edit-badge  { background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7; }
.view-badge  { background: #fff3e0; color: #e65100; border: 1px solid #ffcc80; }

/* ── Members button ── */
.members-wrapper {
  position: relative;
}
.members-btn {
  display: flex; align-items: center; gap: 5px;
  font-size: 11px; font-weight: 600; color: #3730a3;
  background: #eef2ff; border: 1.5px solid #c7d2fe;
  border-radius: 20px; padding: 4px 10px 4px 8px;
  cursor: pointer; white-space: nowrap;
  transition: background 0.15s, border-color 0.15s;
}
.members-btn:hover,
.members-btn.active {
  background: #e0e7ff; border-color: #a5b4fc;
}
.members-count {
  background: #4f46e5; color: #fff;
  border-radius: 10px; padding: 0 6px;
  font-size: 10px; font-weight: 700; min-width: 16px; text-align: center;
}
.chevron { opacity: 0.6; transition: transform 0.2s; }
.chevron.open { transform: rotate(180deg); }

/* ── Members dropdown ── */
.members-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 280px;
  background: #fff;
  border: 1.5px solid #e0e7ff;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(79,70,229,0.13);
  z-index: 200;
  overflow: hidden;
}
.dropdown-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px 8px;
  background: #f0f4ff; border-bottom: 1px solid #d0d8f0;
}
.dropdown-title {
  font-size: 11px; font-weight: 700; color: #3730a3; letter-spacing: 0.4px; text-transform: uppercase;
}
.access-bulk-btns { display: flex; gap: 6px; }
.grant-all-btn, .revoke-all-btn {
  font-size: 10px; padding: 3px 9px; border: none;
  border-radius: 10px; cursor: pointer; font-weight: 700;
}
.grant-all-btn  { background: #4CAF50; color: white; }
.revoke-all-btn { background: #f44336; color: white; }
.grant-all-btn:hover  { background: #43a047; }
.revoke-all-btn:hover { background: #e53935; }

.access-list {
  max-height: 220px; overflow-y: auto;
  padding: 6px 0;
}
.access-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 7px 14px; transition: background 0.1s;
}
.access-row:hover { background: #f7f8ff; }
.access-name-wrap { display: flex; align-items: center; gap: 8px; }
.access-avatar {
  width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, #11998e, #38ef7d);
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; color: white;
}
.access-name { font-size: 13px; color: #333; font-weight: 500; }
.no-participants { font-size: 12px; color: #888; text-align: center; padding: 12px 0; }

/* Toggle */
.toggle-switch { position: relative; width: 38px; height: 20px; display: inline-block; cursor: pointer; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.toggle-slider {
  position: absolute; inset: 0; background: #ccc; border-radius: 20px; transition: background 0.2s;
}
.toggle-slider::before {
  content: ''; position: absolute; width: 14px; height: 14px;
  left: 3px; bottom: 3px; background: white; border-radius: 50%;
  transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.toggle-switch input:checked + .toggle-slider { background: #4CAF50; }
.toggle-switch input:checked + .toggle-slider::before { transform: translateX(18px); }

/* Dropdown transition */
.dropdown-enter-active, .dropdown-leave-active { transition: opacity 0.15s, transform 0.15s; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-6px) scale(0.97); }

/* ── Toolbar ── */
.doc-toolbar {
  display: flex; align-items: center; gap: 3px;
  padding: 6px 10px; background: #fafafa;
  border-bottom: 1px solid #e0e0e0;
  flex-wrap: wrap; flex-shrink: 0;
}
.doc-toolbar button {
  background: none; border: 1px solid transparent;
  border-radius: 4px; padding: 4px 8px; cursor: pointer;
  font-size: 13px; color: #333; min-width: 28px; transition: background 0.15s;
}
.doc-toolbar button:hover { background: #e8e8e8; border-color: #ccc; }
.toolbar-sep { width: 1px; height: 20px; background: #ddd; margin: 0 4px; }

/* ── Editor body ── */
.doc-body {
  flex: 1; padding: 20px 24px; overflow-y: auto;
  font-size: 15px; line-height: 1.7; color: #1a1a1a; outline: none; min-height: 0;
}
.doc-body[data-placeholder]:empty::before {
  content: attr(data-placeholder); color: #bbb; pointer-events: none;
}
.doc-editable { cursor: text; border-top: 2px solid #4CAF5033; }
.doc-readonly  { cursor: default; background: #fafafa; border-top: 2px solid #e0e0e0; }
.doc-body :deep(h1) { font-size: 2em;   margin: 0.4em 0; }
.doc-body :deep(h2) { font-size: 1.5em; margin: 0.4em 0; }
.doc-body :deep(h3) { font-size: 1.2em; margin: 0.4em 0; }
.doc-body :deep(ul), .doc-body :deep(ol) { padding-left: 24px; }

/* ── Footer ── */
.doc-footer {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 14px; border-top: 1px solid #e0e0e0;
  background: #fafafa; flex-shrink: 0;
}
.doc-status { font-size: 11px; color: #888; }
.doc-download-btn {
  font-size: 12px; padding: 5px 12px; background: black; color: white;
  border: none; border-radius: 6px; cursor: pointer; font-weight: 600;
}
.doc-download-btn:hover { background: #312e81; }

/* ── Mobile ── */
@media (max-width: 768px) {
  #doc-enact-panel { width: 100%; left: 0; bottom: 70px; }
  .doc-toolbar button { padding: 8px 10px; font-size: 14px; min-width: 36px; min-height: 36px; }
  .toggle-switch { width: 46px; height: 26px; }
  .toggle-slider::before { width: 18px; height: 18px; }
  .toggle-switch input:checked + .toggle-slider::before { transform: translateX(20px); }
  .doc-body { padding: 14px 16px; font-size: 16px; }
  .members-dropdown { width: 260px; }
}
</style>
