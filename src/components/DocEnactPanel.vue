<template>
  <div id="doc-enact-panel">
    <!-- Header -->
    <div class="doc-header">
      <span>📄 Doc Enact</span>
      <div class="doc-header-right">
        <span v-if="isHost" class="role-badge host-badge">👑 Host</span>
        <span v-else-if="canEdit" class="role-badge edit-badge">✏️ Editor</span>
        <span v-else class="role-badge view-badge">👁 View Only</span>
        <button @click="$emit('close')">✕</button>
      </div>
    </div>

    <!-- Toolbar (host + editors only) -->
    <div v-if="canEdit" class="doc-toolbar">
      <button @click.prevent="fmt('bold')"><b>B</b></button>
      <button @click.prevent="fmt('italic')"><i>I</i></button>
      <button @click.prevent="fmt('underline')"><u>U</u></button>
      <div class="toolbar-sep"></div>
      <button @click.prevent="fmt('formatBlock', 'H1')">H1</button>
      <button @click.prevent="fmt('formatBlock', 'H2')">H2</button>
      <button @click.prevent="fmt('formatBlock', 'H3')">H3</button>
      <div class="toolbar-sep"></div>
      <button @click.prevent="fmt('insertUnorderedList')">• List</button>
      <button @click.prevent="fmt('insertOrderedList')">1. List</button>
      <div class="toolbar-sep"></div>
      <button @click.prevent="fmt('formatBlock', 'P')">¶</button>
    </div>

    <!-- Access Control Panel (host only) -->
    <div v-if="isHost" class="doc-access-panel">
      <div class="access-header">
        <span>🔐 Edit Access</span>
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
          <label class="toggle-switch" :title="editors.includes(p.id) ? 'Revoke edit' : 'Grant edit'">
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

    <!-- Document Body — ALL participants see this -->
    <div
      ref="docBody"
      class="doc-body"
      :contenteditable="canEdit"
      :class="{ 'doc-editable': canEdit, 'doc-readonly': !canEdit }"
      @input="onInput"
      @keydown="onKeydown"
      @touchend="saveMobileSelection"
      @mouseup="saveMobileSelection"
      spellcheck="true"
      data-placeholder="Start typing your document..."
    ></div>

    <!-- Footer -->
    <div class="doc-footer">
      <span class="doc-status">{{ statusText }}</span>
      <button v-if="canEdit" class="doc-download-btn" @click="downloadDoc">⬇ Export</button>
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
  },

  emits: ['close'],

  data() {
    return {
      // participant IDs that the host has granted edit access
      editors:       [],
      lastContent:   '',
      debounceTimer: null,
      saveTimer:     null,
      statusText:    'Connected',
      isMobile: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
      savedRange:    null, // stores selection before toolbar tap on mobile
    };
  },

  computed: {
    // Host can always edit. Participants can edit only if host granted them access.
    canEdit() {
      return this.isHost || this.editors.includes(this.userId);
    },
  },

  mounted() {
    this.livekitRoom.on('dataReceived', this.onDataReceived);

    if (this.isHost) {
      // Host just opened the doc — broadcast the current (empty) state to everyone
      this.$nextTick(() => {
        this.broadcastFullState();
      });
    } else {
      // Participant opened the panel — request full state from host
      this.sendData({ type: 'doc-request-state' });
    }
  },

  beforeUnmount() {
    this.livekitRoom.off('dataReceived', this.onDataReceived);
    clearTimeout(this.debounceTimer);
    clearTimeout(this.saveTimer);
  },

  methods: {

    // Saves current selection so toolbar buttons can restore it after tap-blur on mobile
    saveMobileSelection() {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        this.savedRange = sel.getRangeAt(0).cloneRange();
      }
    },

    // ==================== LIVEKIT DATA LAYER ====================

    sendData(payload) {
      try {
        const lp = this.livekitRoom.localParticipant;
        if (!lp) return;
        const encoded = new TextEncoder().encode(JSON.stringify(payload));
        // LiveKit changed publishData signature between versions:
        //   Old API: publishData(data, DataPacket_Kind.RELIABLE) where RELIABLE = 1 (int32 enum)
        //   New API: publishData(data, { reliable: true })
        // Passing the options object to the old API causes "invalid int 32: object"
        // because protobuf tries to serialize the object as an int32 enum value.
        // We try the new API first, and fall back to the old enum value on error.
        try {
          lp.publishData(encoded, { reliable: true });
        } catch (_apiErr) {
          // Old livekit-client: DataPacket_Kind.RELIABLE === 1
          lp.publishData(encoded, 1);
        }
      } catch (err) {
        console.error("[DocEnact] sendData error:", err);
      }
    },

    onDataReceived(payload, participant) {
      try {
        const text = new TextDecoder().decode(payload);
        const msg  = JSON.parse(text);
        if (!msg.type || !msg.type.startsWith('doc-')) return;

        switch (msg.type) {

          // A participant just opened the panel and wants the current doc state
          case 'doc-request-state':
            // Only the host responds — they are the source of truth
            if (this.isHost) {
              this.broadcastFullState();
            }
            break;

          // Full doc state (content + who has edit access) — sent by host on open / request
          case 'doc-state':
            this.editors = msg.editors || [];
            this.setContent(msg.content || '');
            this.updateStatusAfterAccessChange();
            break;

          // Incremental content update while someone is typing
          case 'doc-update':
            // Ignore echoes of our own updates
            if (msg.senderId === this.userId) return;
            this.applyRemoteUpdate(msg.content);
            break;

          // Host toggled edit access for one or more participants
          case 'doc-access-changed':
            this.editors = msg.editors || [];
            this.updateStatusAfterAccessChange();
            break;
        }
      } catch (_) {
        // Not a doc message or malformed — silently ignore
      }
    },

    // Sends the full doc state (content + editors list) to everyone in the room.
    // Called by host when they open the doc, or when a participant requests state.
    broadcastFullState() {
      this.sendData({
        type:    'doc-state',
        content: this.$refs.docBody?.innerHTML || '',
        editors: this.editors,
      });
    },

    // ==================== EDITING ====================

    fmt(command, value = null) {
      // On mobile, tapping a toolbar button blurs the contenteditable and
      // clears the selection. We save it on 'touchstart' (before blur) and
      // restore it here so execCommand still has a range to work with.
      if (this.isMobile && this.savedRange) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(this.savedRange);
      }
      document.execCommand(command, false, value);
      this.$refs.docBody.focus();
      this.broadcastContent();
    },

    onInput() {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.broadcastContent();
      }, 150); // 150ms debounce — snappy real-time feel
    },

    onKeydown(e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
      }
    },

    // Broadcasts the current doc content to all participants
    broadcastContent() {
      const content = this.$refs.docBody?.innerHTML || '';
      if (content === this.lastContent) return;
      this.lastContent = content;
      this.statusText = 'Syncing...';

      this.sendData({
        type:     'doc-update',
        content,
        senderId: this.userId,
      });

      clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => {
        this.statusText = 'Synced ✓';
        setTimeout(() => { this.statusText = 'Connected'; }, 1500);
      }, 400);
    },

    // Apply an incoming remote update without overwriting the local cursor position
    applyRemoteUpdate(content) {
      const saved = this.saveSelection();
      this.setContent(content);
      this.restoreSelection(saved);
    },

    setContent(html) {
      if (this.$refs.docBody) {
        this.$refs.docBody.innerHTML = html;
        this.lastContent = html;
      }
    },

    // ==================== ACCESS CONTROL (host only) ====================

    // Toggle a single participant between editor / viewer
    toggleAccess(participantId) {
      if (this.editors.includes(participantId)) {
        this.editors = this.editors.filter(id => id !== participantId);
      } else {
        this.editors.push(participantId);
      }
      this.broadcastAccessChange();
    },

    // Set specific access level for a participant
    setAccess(participantId, level) {
      this.editors = this.editors.filter(id => id !== participantId);
      if (level === 'edit') {
        this.editors.push(participantId);
      }
      this.broadcastAccessChange();
    },

    // Grant edit access to everyone
    grantAll() {
      this.editors = this.participants.map(p => p.id);
      this.broadcastAccessChange();
    },

    // Revoke edit access from everyone (all go back to view-only)
    revokeAll() {
      this.editors = [];
      this.broadcastAccessChange();
    },

    // Sends the updated editors list to all participants
    broadcastAccessChange() {
      this.sendData({
        type:    'doc-access-changed',
        editors: this.editors,
      });
      // Also re-send the full doc so newly granted editors get the latest content
      this.broadcastFullState();
    },

    // Update status text based on whether this user now has edit access
    updateStatusAfterAccessChange() {
      if (this.isHost) return; // host status never changes
      if (this.canEdit) {
        this.statusText = '✏️ Edit access granted';
        setTimeout(() => { this.statusText = 'Connected'; }, 2500);
      } else {
        this.statusText = '👁 View only';
        setTimeout(() => { this.statusText = 'Connected'; }, 2500);
      }
    },

    // ==================== EXPORT ====================

    downloadDoc() {
      const content = this.$refs.docBody?.innerHTML || '';
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Doc Enact — ${this.roomId}</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; max-width: 800px;
           margin: 40px auto; padding: 0 24px; line-height: 1.7; color: #1a1a1a; }
    h1 { font-size: 2em; margin: 0.4em 0; }
    h2 { font-size: 1.5em; margin: 0.4em 0; }
    h3 { font-size: 1.2em; margin: 0.4em 0; }
    ul, ol { padding-left: 24px; }
  </style>
</head>
<body>${content}</body>
</html>`;
      const blob = new Blob([html], { type: 'text/html' });
      const a    = document.createElement('a');
      a.href     = URL.createObjectURL(blob);
      a.download = `doc-${this.roomId}-${Date.now()}.html`;
      a.click();
      URL.revokeObjectURL(a.href);
    },

    // ==================== HELPERS ====================

    getInitials(name) {
      if (!name) return '?';
      const parts = name.trim().split(' ');
      if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    },

    // ==================== CURSOR PRESERVATION ====================
    // Preserves the cursor/caret position during remote content updates
    // so the local editor's typing position doesn't jump.

    saveSelection() {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return null;
      const range = sel.getRangeAt(0);
      return {
        start: this.getTextOffset(this.$refs.docBody, range.startContainer, range.startOffset),
        end:   this.getTextOffset(this.$refs.docBody, range.endContainer,   range.endOffset),
      };
    },

    restoreSelection(saved) {
      if (!saved || !this.$refs.docBody) return;
      try {
        const sel   = window.getSelection();
        const start = this.nodeAtOffset(this.$refs.docBody, saved.start);
        const end   = this.nodeAtOffset(this.$refs.docBody, saved.end);
        if (!start || !end) return;
        const range = document.createRange();
        range.setStart(start.node, start.offset);
        range.setEnd(end.node,   end.offset);
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (_) {}
    },

    getTextOffset(root, node, offset) {
      let pos = 0;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        if (walker.currentNode === node) return pos + offset;
        pos += walker.currentNode.textContent.length;
      }
      return pos;
    },

    nodeAtOffset(root, target) {
      let pos = 0;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const len = walker.currentNode.textContent.length;
        if (pos + len >= target) {
          return { node: walker.currentNode, offset: target - pos };
        }
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
}
.doc-header-right { display: flex; align-items: center; gap: 10px; }
.doc-header button {
  background: none; border: none; font-size: 18px;
  cursor: pointer; color: #000; padding: 2px 6px; border-radius: 4px;
}
.doc-header button:hover { background: #e0e0e0; }

/* Role badges */
.role-badge {
  font-size: 11px; font-weight: 600;
  padding: 3px 9px; border-radius: 12px;
}
.host-badge { background: #fff8e1; color: #f57f17; border: 1px solid #ffe082; }
.edit-badge { background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7; }
.view-badge { background: #fff3e0; color: #e65100; border: 1px solid #ffcc80; }

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
  font-size: 13px; color: #333; min-width: 28px;
  transition: background 0.15s;
}
.doc-toolbar button:hover { background: #e8e8e8; border-color: #ccc; }
.toolbar-sep { width: 1px; height: 20px; background: #ddd; margin: 0 4px; }

/* ── Access Panel ── */
.doc-access-panel {
  background: #f0f4ff; border-bottom: 1px solid #d0d8f0;
  padding: 10px 14px; flex-shrink: 0;
  max-height: 180px; overflow-y: auto;
}
.access-header {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; font-weight: 700; color: #3730a3; margin-bottom: 8px;
}
.access-bulk-btns { display: flex; gap: 6px; margin-left: auto; }
.grant-all-btn, .revoke-all-btn {
  font-size: 11px; padding: 3px 10px; border: none;
  border-radius: 10px; cursor: pointer; font-weight: 600;
}
.grant-all-btn  { background: #4CAF50; color: white; }
.revoke-all-btn { background: #f44336; color: white; }

.access-list { display: flex; flex-direction: column; gap: 6px; }
.access-row {
  display: flex; justify-content: space-between; align-items: center;
  background: white; padding: 7px 10px; border-radius: 8px;
  border: 1px solid #d0d8f0;
}
.access-name-wrap { display: flex; align-items: center; gap: 8px; }
.access-avatar {
  width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, #11998e, #38ef7d);
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; color: white;
}
.access-name { font-size: 13px; color: #333; font-weight: 500; }
.no-participants { font-size: 12px; color: #888; text-align: center; padding: 8px 0; }

/* Toggle Switch */
.toggle-switch { position: relative; width: 38px; height: 20px; display: inline-block; cursor: pointer; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.toggle-slider {
  position: absolute; inset: 0;
  background: #ccc; border-radius: 20px; transition: background 0.2s;
}
.toggle-slider::before {
  content: ''; position: absolute;
  width: 14px; height: 14px; left: 3px; bottom: 3px;
  background: white; border-radius: 50%; transition: transform 0.2s;
}
.toggle-switch input:checked + .toggle-slider { background: #4CAF50; }
.toggle-switch input:checked + .toggle-slider::before { transform: translateX(18px); }

/* ── Document Body ── */
.doc-body {
  flex: 1; padding: 20px 24px; overflow-y: auto;
  font-size: 15px; line-height: 1.7; color: #1a1a1a;
  outline: none; min-height: 0;
}
.doc-body[data-placeholder]:empty::before {
  content: attr(data-placeholder);
  color: #bbb; pointer-events: none;
}
.doc-editable {
  cursor: text;
  border-top: 2px solid #4CAF5033;
}
.doc-readonly {
  cursor: default;
  background: #fafafa;
  border-top: 2px solid #e0e0e0;
}
.doc-body :deep(h1) { font-size: 2em;   margin: 0.4em 0; }
.doc-body :deep(h2) { font-size: 1.5em; margin: 0.4em 0; }
.doc-body :deep(h3) { font-size: 1.2em; margin: 0.4em 0; }
.doc-body :deep(ul),
.doc-body :deep(ol) { padding-left: 24px; }

/* ── Footer ── */
.doc-footer {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 14px; border-top: 1px solid #e0e0e0;
  background: #fafafa; flex-shrink: 0;
}
.doc-status { font-size: 11px; color: #888; }
.doc-download-btn {
  font-size: 12px; padding: 5px 12px;
  background: #3730a3; color: white;
  border: none; border-radius: 6px;
  cursor: pointer; font-weight: 600;
}
.doc-download-btn:hover { background: #312e81; }

@media (max-width: 768px) {
  #doc-enact-panel {
    width: 100%;
    left: 0;
    /* On mobile, sit above the navbar (70px) */
    bottom: 70px;
  }

  /* Larger touch targets for toolbar buttons */
  .doc-toolbar button {
    padding: 8px 10px;
    font-size: 14px;
    min-width: 36px;
    min-height: 36px;
  }

  /* Bigger toggle for fingers */
  .toggle-switch {
    width: 46px;
    height: 26px;
  }
  .toggle-slider::before {
    width: 18px;
    height: 18px;
  }
  .toggle-switch input:checked + .toggle-slider::before {
    transform: translateX(20px);
  }

  /* Access panel takes a bit more room on mobile */
  .doc-access-panel {
    max-height: 220px;
  }

  .doc-body {
    padding: 14px 16px;
    /* Prevent iOS zoom on focus by ensuring font is ≥ 16px */
    font-size: 16px;
  }

  .grant-all-btn, .revoke-all-btn {
    padding: 5px 12px;
    font-size: 12px;
  }
}
</style>
