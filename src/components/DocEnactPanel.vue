<template>
  <div id="doc-enact-panel">
    <!-- Header -->
    <div class="doc-header">
      <span>📄 Doc Enact</span>
      <div class="doc-header-right">
        <span v-if="!canEdit" class="read-only-badge">👁 View Only</span>
        <button @click="$emit('close')">✕</button>
      </div>
    </div>

    <!-- Toolbar (editors only) -->
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

    <!-- Access Control (host only) -->
    <div v-if="isHost" class="doc-access-panel">
      <div class="access-header">
        <span>🔐 Access</span>
        <button class="grant-all-btn" @click="grantAll">Grant All</button>
        <button class="revoke-all-btn" @click="revokeAll">Revoke All</button>
      </div>
      <div class="access-list">
        <div v-if="participants.length === 0" class="no-participants">
          No other participants yet
        </div>
        <div v-for="p in participants" :key="p.id" class="access-row">
          <span class="access-name">{{ p.name }}</span>
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

    <!-- Document Body -->
    <div
      ref="docBody"
      class="doc-body"
      :contenteditable="canEdit"
      :class="{ 'doc-editable': canEdit, 'doc-readonly': !canEdit }"
      @input="onInput"
      @keydown="onKeydown"
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
    livekitRoom:  { type: Object, required: true },
    isHost:       { type: Boolean, default: false },
    userId:       { type: String,  required: true },
    participants: { type: Array,   default: () => [] },
    roomId:       { type: String,  required: true },
  },

  emits: ['close'],

  data() {
    return {
      editors:       [],   // participant IDs with edit access
      lastContent:   '',
      debounceTimer: null,
      saveTimer:     null,
      statusText:    'Connected',
    };
  },

  computed: {
    canEdit() {
      return this.isHost || this.editors.includes(this.userId);
    },
  },

  mounted() {
    // Listen for LiveKit data messages
    this.livekitRoom.on('dataReceived', this.onDataReceived);

    // If host, broadcast current state so late joiners get it
    // If participant, request state from host
    if (this.isHost) {
      this.broadcastFullState();
    } else {
      this.sendData({ type: 'doc-request-state' });
    }
  },

  beforeUnmount() {
    this.livekitRoom.off('dataReceived', this.onDataReceived);
    clearTimeout(this.debounceTimer);
    clearTimeout(this.saveTimer);
  },

  methods: {
    // ==================== LIVEKIT DATA ====================

    sendData(payload) {
      try {
        const lp = this.livekitRoom.localParticipant;
        if (!lp) return;
        const encoded = new TextEncoder().encode(JSON.stringify(payload));
        // RELIABLE = guaranteed delivery (like TCP), good for doc sync
        lp.publishData(encoded, { reliable: true });
      } catch (err) {
        console.error('DocEnact sendData error:', err);
      }
    },

    onDataReceived(payload, participant) {
      try {
        const text = new TextDecoder().decode(payload);
        const msg  = JSON.parse(text);

        // Ignore non-doc messages
        if (!msg.type || !msg.type.startsWith('doc-')) return;

        switch (msg.type) {

          case 'doc-request-state':
            // Only host responds with full state
            if (this.isHost) this.broadcastFullState();
            break;

          case 'doc-state':
            // Full state sync (received by late joiners)
            this.editors = msg.editors || [];
            this.setContent(msg.content || '');
            break;

          case 'doc-update':
            // Live typing update — skip own echo
            if (msg.senderId === this.userId) return;
            this.applyRemoteUpdate(msg.content);
            break;

          case 'doc-access-changed':
            this.editors = msg.editors || [];
            if (!this.canEdit) {
              this.statusText = '👁 View only — no edit access';
            } else {
              this.statusText = '✏️ Edit access granted';
              setTimeout(() => { this.statusText = 'Connected'; }, 2000);
            }
            break;
        }
      } catch (err) {
        // Not a doc message or malformed — ignore
      }
    },

    broadcastFullState() {
      this.sendData({
        type:    'doc-state',
        content: this.$refs.docBody?.innerHTML || '',
        editors: this.editors,
      });
    },

    // ==================== EDITING ====================

    fmt(command, value = null) {
      document.execCommand(command, false, value);
      this.$refs.docBody.focus();
      this.broadcastContent();
    },

    onInput() {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.broadcastContent();
      }, 300);
    },

    onKeydown(e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
      }
    },

    broadcastContent() {
      const content = this.$refs.docBody?.innerHTML || '';
      if (content === this.lastContent) return;
      this.lastContent = content;
      this.statusText = 'Saving...';

      this.sendData({
        type:     'doc-update',
        content,
        senderId: this.userId,
      });

      clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => {
        this.statusText = 'Saved ✓';
        setTimeout(() => { this.statusText = 'Connected'; }, 1500);
      }, 400);
    },

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

    // ==================== ACCESS CONTROL ====================

    toggleAccess(participantId) {
      if (this.editors.includes(participantId)) {
        this.editors = this.editors.filter(id => id !== participantId);
      } else {
        this.editors.push(participantId);
      }
      this.emitAccessChange();
    },

    grantAll() {
      this.editors = this.participants.map(p => p.id);
      this.emitAccessChange();
    },

    revokeAll() {
      this.editors = [];
      this.emitAccessChange();
    },

    emitAccessChange() {
      this.sendData({
        type:    'doc-access-changed',
        editors: this.editors,
      });
    },

    // ==================== EXPORT ====================

    downloadDoc() {
      const content = this.$refs.docBody?.innerHTML || '';
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    body { font-family: 'Segoe UI', sans-serif; max-width: 800px;
           margin: 40px auto; padding: 0 24px; line-height: 1.7; color: #1a1a1a; }
    h1 { font-size: 2em; } h2 { font-size: 1.5em; } h3 { font-size: 1.2em; }
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

    // ==================== CURSOR PRESERVATION ====================

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
        range.setEnd(end.node, end.offset);
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

/* Header */
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
.read-only-badge {
  background: #fff3e0; color: #e65100; font-size: 11px;
  font-weight: 600; padding: 3px 8px; border-radius: 12px;
  border: 1px solid #ffcc80;
}

/* Toolbar */
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

/* Access Panel */
.doc-access-panel {
  background: #f0f4ff; border-bottom: 1px solid #d0d8f0;
  padding: 10px 14px; flex-shrink: 0;
  max-height: 150px; overflow-y: auto;
}
.access-header {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; font-weight: 700; color: #3730a3; margin-bottom: 8px;
}
.grant-all-btn, .revoke-all-btn {
  font-size: 11px; padding: 3px 8px; border: none;
  border-radius: 10px; cursor: pointer; font-weight: 600;
}
.grant-all-btn  { background: #4CAF50; color: white; }
.revoke-all-btn { background: #f44336; color: white; }
.access-list { display: flex; flex-direction: column; gap: 6px; }
.access-row {
  display: flex; justify-content: space-between; align-items: center;
  background: white; padding: 6px 10px; border-radius: 8px;
  border: 1px solid #d0d8f0;
}
.access-name { font-size: 13px; color: #333; font-weight: 500; }
.no-participants { font-size: 12px; color: #888; text-align: center; padding: 8px 0; }

/* Toggle Switch */
.toggle-switch { position: relative; width: 36px; height: 20px; display: inline-block; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.toggle-slider {
  position: absolute; cursor: pointer; inset: 0;
  background: #ccc; border-radius: 20px; transition: background 0.2s;
}
.toggle-slider::before {
  content: ''; position: absolute; width: 14px; height: 14px;
  left: 3px; bottom: 3px; background: white;
  border-radius: 50%; transition: transform 0.2s;
}
.toggle-switch input:checked + .toggle-slider { background: #4CAF50; }
.toggle-switch input:checked + .toggle-slider::before { transform: translateX(16px); }

/* Doc Body */
.doc-body {
  flex: 1; padding: 20px 24px; overflow-y: auto;
  font-size: 15px; line-height: 1.7; color: #1a1a1a;
  outline: none; min-height: 0;
}
.doc-body[data-placeholder]:empty::before {
  content: attr(data-placeholder); color: #bbb; pointer-events: none;
}
.doc-editable { cursor: text; }
.doc-readonly  { cursor: default; background: #fafafa; }
.doc-body :deep(h1) { font-size: 2em;   margin: 0.4em 0; }
.doc-body :deep(h2) { font-size: 1.5em; margin: 0.4em 0; }
.doc-body :deep(h3) { font-size: 1.2em; margin: 0.4em 0; }
.doc-body :deep(ul),
.doc-body :deep(ol) { padding-left: 24px; }

/* Footer */
.doc-footer {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 14px; border-top: 1px solid #e0e0e0;
  background: #fafafa; flex-shrink: 0;
}
.doc-status { font-size: 11px; color: #888; }
.doc-download-btn {
  font-size: 12px; padding: 5px 12px; background: #3730a3;
  color: white; border: none; border-radius: 6px;
  cursor: pointer; font-weight: 600;
}
.doc-download-btn:hover { background: #312e81; }

@media (max-width: 768px) {
  #doc-enact-panel { width: 100%; }
}
</style>
