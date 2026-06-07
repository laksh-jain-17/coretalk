<template>
  <div id="doc-enact-panel">
    <div class="doc-header">
      <span>Doc Enact</span>
      <div class="doc-header-right">
        <span v-if="isHost" class="role-badge host-badge">Host</span>
        <span v-else-if="canEdit" class="role-badge edit-badge">Editor</span>
        <span v-else class="role-badge view-badge">View Only</span>

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
                    <input type="checkbox" :checked="editors.includes(p.id)" @change="toggleAccess(p.id)" />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>
          </transition>
        </div>

        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>
    </div>

    <div v-if="canEdit" class="doc-toolbar">
      <!-- Row 1 -->
      <div class="toolbar-row">
        <select
          class="toolbar-select font-family-select"
          :value="currentFontFamily"
          @mousedown="saveSelectionNow"
          @change="setFontFamily($event.target.value)"
          title="Font Family"
        >
          <option value="Segoe UI">Segoe UI</option>
          <option value="Arial">Arial</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Georgia">Georgia</option>
          <option value="Courier New">Courier New</option>
          <option value="Verdana">Verdana</option>
          <option value="Helvetica">Helvetica</option>
          <option value="Trebuchet MS">Trebuchet MS</option>
        </select>

        <select
          class="toolbar-select font-size-select"
          :value="currentFontSize"
          @mousedown="saveSelectionNow"
          @change="setFontSize($event.target.value)"
          title="Font Size"
        >
          <option value="1">8</option>
          <option value="2">10</option>
          <option value="3">12</option>
          <option value="4">14</option>
          <option value="5">18</option>
          <option value="6">24</option>
          <option value="7">36</option>
        </select>

        <div class="toolbar-sep"></div>

        <button @mousedown.prevent="fmt('bold')"          :class="{ active: activeFormats.bold }"      title="Bold"><b>B</b></button>
        <button @mousedown.prevent="fmt('italic')"        :class="{ active: activeFormats.italic }"    title="Italic"><i>I</i></button>
        <button @mousedown.prevent="fmt('underline')"     :class="{ active: activeFormats.underline }" title="Underline"><u>U</u></button>
        <button @mousedown.prevent="fmt('strikeThrough')" :class="{ active: activeFormats.strike }"    title="Strikethrough"><s>S</s></button>
        <button @mousedown.prevent="fmt('subscript')"     :class="{ active: activeFormats.sub }"       title="Subscript">X<sub>2</sub></button>
        <button @mousedown.prevent="fmt('superscript')"   :class="{ active: activeFormats.sup }"       title="Superscript">X<sup>2</sup></button>

        <div class="toolbar-sep"></div>

        <!-- Font Color -->
        <div class="toolbar-color-wrap" title="Font Color">
          <button class="color-preview-btn" @mousedown.prevent="$refs.fontColorInput.click()">
            <span class="color-letter" :style="{ borderBottom: '3px solid ' + activeFontColor }">A</span>
          </button>
          <input
            ref="fontColorInput"
            type="color"
            :value="activeFontColor"
            class="hidden-color-input"
            @change="setFontColor($event.target.value)"
          />
        </div>

        <!-- Highlight Color -->
        <div class="toolbar-color-wrap" title="Highlight Color">
          <button class="color-preview-btn" @mousedown.prevent="$refs.highlightColorInput.click()">
            <span class="color-letter" :style="{ background: activeHighlightColor, padding: '1px 3px', borderRadius: '2px' }">H</span>
          </button>
          <input
            ref="highlightColorInput"
            type="color"
            :value="activeHighlightColor"
            class="hidden-color-input"
            @change="setHighlightColor($event.target.value)"
          />
        </div>

        <div class="toolbar-sep"></div>
        <button @mousedown.prevent="clearFormatting" title="Clear formatting">¶</button>
      </div>

      <!-- Row 2 -->
      <div class="toolbar-row">
        <button @mousedown.prevent="applyHeading('h1')" :class="{ active: activeFormats.h1 }" title="Heading 1">H1</button>
        <button @mousedown.prevent="applyHeading('h2')" :class="{ active: activeFormats.h2 }" title="Heading 2">H2</button>
        <button @mousedown.prevent="applyHeading('h3')" :class="{ active: activeFormats.h3 }" title="Heading 3">H3</button>

        <div class="toolbar-sep"></div>

        <button @mousedown.prevent="fmt('justifyLeft')"    :class="{ active: activeFormats.alignLeft }"    title="Align Left">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="4" width="18" height="2.5" rx="1"/><rect x="3" y="10" width="12" height="2.5" rx="1"/><rect x="3" y="16" width="18" height="2.5" rx="1"/><rect x="3" y="22" width="12" height="2.5" rx="1"/></svg>
        </button>
        <button @mousedown.prevent="fmt('justifyCenter')"  :class="{ active: activeFormats.alignCenter }"  title="Align Center">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="4" width="18" height="2.5" rx="1"/><rect x="6" y="10" width="12" height="2.5" rx="1"/><rect x="3" y="16" width="18" height="2.5" rx="1"/><rect x="6" y="22" width="12" height="2.5" rx="1"/></svg>
        </button>
        <button @mousedown.prevent="fmt('justifyRight')"   :class="{ active: activeFormats.alignRight }"   title="Align Right">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="4" width="18" height="2.5" rx="1"/><rect x="9" y="10" width="12" height="2.5" rx="1"/><rect x="3" y="16" width="18" height="2.5" rx="1"/><rect x="9" y="22" width="12" height="2.5" rx="1"/></svg>
        </button>
        <button @mousedown.prevent="fmt('justifyFull')"    :class="{ active: activeFormats.alignJustify }" title="Justify">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="4" width="18" height="2.5" rx="1"/><rect x="3" y="10" width="18" height="2.5" rx="1"/><rect x="3" y="16" width="18" height="2.5" rx="1"/><rect x="3" y="22" width="14" height="2.5" rx="1"/></svg>
        </button>

        <div class="toolbar-sep"></div>

        <button @mousedown.prevent="fmt('insertUnorderedList')" :class="{ active: activeFormats.ul }" title="Bullet List">• List</button>
        <button @mousedown.prevent="fmt('insertOrderedList')"   :class="{ active: activeFormats.ol }" title="Numbered List">1. List</button>
        <button @mousedown.prevent="fmt('indent')"  title="Increase Indent (Tab)">⇥</button>
        <button @mousedown.prevent="fmt('outdent')" title="Decrease Indent">⇤</button>

        <div class="toolbar-sep"></div>

        <!-- Table insert -->
        <div class="toolbar-color-wrap" ref="tablePickerWrapper" title="Insert Table">
          <button class="color-preview-btn" @mousedown.prevent="toggleTablePicker" :class="{ active: showTablePicker }">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="3" y1="15" x2="21" y2="15"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
              <line x1="15" y1="3" x2="15" y2="21"/>
            </svg>
          </button>

          <!-- Table grid picker -->
          <div v-if="showTablePicker" class="table-picker-popup">
            <div class="table-picker-label">{{ tableHoverRows }} × {{ tableHoverCols }}</div>
            <div class="table-grid">
              <div
                v-for="r in 6" :key="'row-' + r"
                class="table-grid-row"
              >
                <div
                  v-for="c in 8" :key="'col-' + c"
                  class="table-grid-cell"
                  :class="{ highlighted: r <= tableHoverRows && c <= tableHoverCols }"
                  @mouseenter="tableHoverRows = r; tableHoverCols = c"
                  @mousedown.prevent="insertTable(r, c)"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Image insert -->
        <button @mousedown.prevent="$refs.imageFileInput.click()" title="Insert Image">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </button>
        <input
          ref="imageFileInput"
          type="file"
          accept="image/*"
          class="hidden-color-input"
          @change="insertImage($event)"
        />
      </div>
    </div>

    <div
      ref="docBody"
      class="doc-body"
      :contenteditable="canEdit ? 'true' : 'false'"
      :class="{ 'doc-editable': canEdit, 'doc-readonly': !canEdit }"
      @input="onInput"
      @keydown="onKeydown"
      @mouseup="onCursorChange"
      @keyup="onCursorChange"
      @touchend="onCursorChange"
      spellcheck="true"
      data-placeholder="Start typing your document..."
    ></div>

    <div class="doc-footer">
      <span class="doc-status">{{ statusText }}</span>
      <button v-if="canEdit" class="doc-download-btn" @click="downloadDoc">⬇ Download</button>
    </div>
  </div>
</template>

<script>
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';

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
      editors:        [],
      lastContent:    '',
      debounceTimer:  null,
      saveTimer:      null,
      statusText:     'Connecting...',
      isMobile:       /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
      savedRange:     null,
      _dataHandler:   null,
      showMembers:    false,
      showTablePicker: false,
      tableHoverRows: 1,
      tableHoverCols: 1,
      activeFormats: {
        bold: false, italic: false, underline: false, strike: false,
        sub: false, sup: false,
        ul: false, ol: false,
        h1: false, h2: false, h3: false,
        alignLeft: true, alignCenter: false, alignRight: false, alignJustify: false,
      },
      activeFontColor:      '#000000',
      activeHighlightColor: '#ffff00',
      currentFontFamily:    'Segoe UI',
      currentFontSize:      '3',
      _retry1: null,
      _retry2: null,
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
      this._socketDocState         = (msg) => this._handleMsg({ type: 'doc-state',          ...msg });
      this._socketDocUpdate        = (msg) => this._handleMsg({ type: 'doc-update',         ...msg });
      this._socketDocAccessChanged = (msg) => this._handleMsg({ type: 'doc-access-changed', ...msg });
      this._socketDocRequestState  = (msg) => this._handleMsg({ type: 'doc-request-state',  ...msg });
      this.socket.on('doc-state',          this._socketDocState);
      this.socket.on('doc-update',         this._socketDocUpdate);
      this.socket.on('doc-access-changed', this._socketDocAccessChanged);
      this.socket.on('doc-request-state',  this._socketDocRequestState);
    }

    this._handleOutsideClick = (e) => {
      if (this.showMembers && this.$refs.membersWrapperRef && !this.$refs.membersWrapperRef.contains(e.target)) {
        this.showMembers = false;
      }
      if (this.showTablePicker && this.$refs.tablePickerWrapper && !this.$refs.tablePickerWrapper.contains(e.target)) {
        this.showTablePicker = false;
      }
    };
    document.addEventListener('mousedown', this._handleOutsideClick);

    this._onSelectionChange = () => {
      if (this.$refs.docBody && document.activeElement === this.$refs.docBody) {
        this._updateActiveFormats();
      }
    };
    document.addEventListener('selectionchange', this._onSelectionChange);

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
    if (this._dataHandler) this.livekitRoom.off('dataReceived', this._dataHandler);
    if (this.socket) {
      this.socket.off('doc-state',          this._socketDocState);
      this.socket.off('doc-update',         this._socketDocUpdate);
      this.socket.off('doc-access-changed', this._socketDocAccessChanged);
      this.socket.off('doc-request-state',  this._socketDocRequestState);
    }
    document.removeEventListener('mousedown', this._handleOutsideClick);
    document.removeEventListener('selectionchange', this._onSelectionChange);
    clearTimeout(this.debounceTimer);
    clearTimeout(this.saveTimer);
    clearTimeout(this._retry1);
    clearTimeout(this._retry2);
  },

  methods: {

    // ─── Selection helpers ────────────────────────────────────────────────────

    saveSelectionNow() {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        try { this.savedRange = sel.getRangeAt(0).cloneRange(); } catch (_) {}
      }
    },

    _restoreSavedSelection() {
      if (!this.savedRange) return false;
      try {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(this.savedRange);
        return true;
      } catch (_) { return false; }
    },

    // ─── Get the nearest block-level ancestor ────────────────────────────────

    _getParentBlock(node) {
      const blockTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'DIV', 'LI', 'BLOCKQUOTE', 'PRE'];
      const docBody = this.$refs.docBody;
      let current = node;
      while (current && current !== docBody) {
        if (current.nodeType === Node.ELEMENT_NODE && blockTags.includes(current.nodeName)) {
          return current;
        }
        current = current.parentNode;
      }
      return null;
    },

    // ─── FIXED: Heading that respects cursor position ─────────────────────────
    //
    // Rules:
    //   1. If text IS selected → apply formatBlock to selection only (standard behavior)
    //   2. If cursor only (collapsed) AND current block is empty → just change block tag
    //   3. If cursor only AND current block has content AND cursor is at END → insert new block after
    //   4. If cursor only AND mid-block → split block at cursor, apply tag to second half

    applyHeading(tag) {
      this.$refs.docBody?.focus();
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      const range = sel.getRangeAt(0);

      // Case 1: text is selected — apply to selection via formatBlock (standard)
      if (!range.collapsed) {
        const current = (document.queryCommandValue('formatBlock') || '').toLowerCase().replace(/[<>]/g, '');
        document.execCommand('formatBlock', false, current === tag ? 'p' : tag);
        this._updateActiveFormats();
        this._broadcastContent();
        return;
      }

      // Collapsed cursor — figure out which block we're in
      const block = this._getParentBlock(range.startContainer);
      const docBody = this.$refs.docBody;

      // Current block tag
      const currentTag = block ? block.tagName.toLowerCase() : '';

      // Toggle off: if already the same heading and cursor is collapsed, switch to p
      if (currentTag === tag) {
        document.execCommand('formatBlock', false, 'p');
        this._updateActiveFormats();
        this._broadcastContent();
        return;
      }

      // Case 2: block is empty — just change the tag in place
      if (!block || block.textContent.trim() === '') {
        if (block) {
          const newBlock = document.createElement(tag);
          newBlock.innerHTML = '<br>';
          block.replaceWith(newBlock);
          // Move cursor into new block
          const newRange = document.createRange();
          newRange.setStart(newBlock, 0);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
        } else {
          document.execCommand('formatBlock', false, tag);
        }
        this._updateActiveFormats();
        this._broadcastContent();
        return;
      }

      // Case 3 & 4: block has content — check cursor position
      // Get range from block start to cursor
      const rangeToStart = document.createRange();
      rangeToStart.setStart(block, 0);
      rangeToStart.setEnd(range.startContainer, range.startOffset);
      const textBeforeCursor = rangeToStart.toString();

      // Range from cursor to block end
      const rangeToEnd = document.createRange();
      rangeToEnd.setStart(range.startContainer, range.startOffset);
      rangeToEnd.setEnd(block, block.childNodes.length);
      const textAfterCursor = rangeToEnd.toString();

      if (textAfterCursor.trim() === '') {
        // Case 3: cursor is at end of block — insert new block of chosen type after
        const newBlock = document.createElement(tag);
        newBlock.innerHTML = '<br>';
        block.after(newBlock);
        const newRange = document.createRange();
        newRange.setStart(newBlock, 0);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
      } else if (textBeforeCursor.trim() === '') {
        // Cursor is at start of block — convert current block, keep cursor at start
        const newBlock = document.createElement(tag);
        newBlock.innerHTML = block.innerHTML;
        block.replaceWith(newBlock);
        const newRange = document.createRange();
        newRange.setStart(newBlock, 0);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
      } else {
        // Case 4: cursor is mid-block — split the block
        // Content before cursor stays in current block
        // Content after cursor goes into new block with chosen tag
        const beforeRange = document.createRange();
        beforeRange.setStart(block, 0);
        beforeRange.setEnd(range.startContainer, range.startOffset);
        const beforeFrag = beforeRange.cloneContents();

        const afterRange = document.createRange();
        afterRange.setStart(range.startContainer, range.startOffset);
        afterRange.setEnd(block, block.childNodes.length);
        const afterFrag = afterRange.cloneContents();

        // Update current block to only have "before" content
        block.innerHTML = '';
        block.appendChild(beforeFrag);
        if (!block.innerHTML || block.innerHTML === '') block.innerHTML = '<br>';

        // Create new block for "after" content with chosen heading
        const newBlock = document.createElement(tag);
        newBlock.appendChild(afterFrag);
        if (!newBlock.textContent && !newBlock.querySelector('br')) newBlock.innerHTML = '<br>';
        block.after(newBlock);

        // Move cursor to start of new block
        const newRange = document.createRange();
        newRange.setStart(newBlock, 0);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
      }

      this._updateActiveFormats();
      this._broadcastContent();
    },

    // ─── Table ────────────────────────────────────────────────────────────────

    toggleTablePicker() {
      this.showTablePicker = !this.showTablePicker;
      this.tableHoverRows = 1;
      this.tableHoverCols = 1;
    },

    insertTable(rows, cols) {
      this.showTablePicker = false;
      this.$refs.docBody?.focus();

      // Build table HTML
      let html = '<table class="doc-table"><tbody>';
      for (let r = 0; r < rows; r++) {
        html += '<tr>';
        for (let c = 0; c < cols; c++) {
          html += r === 0
            ? '<th contenteditable="true"><br></th>'
            : '<td contenteditable="true"><br></td>';
        }
        html += '</tr>';
      }
      html += '</tbody></table><p><br></p>';

      // Insert at cursor position
      const sel = window.getSelection();
      if (sel && sel.rangeCount) {
        const range = sel.getRangeAt(0);
        // If inside a block, insert after it
        const block = this._getParentBlock(range.startContainer);
        if (block) {
          const wrapper = document.createElement('div');
          wrapper.innerHTML = html;
          const table = wrapper.querySelector('table');
          const para  = wrapper.querySelector('p');
          block.after(para);
          block.after(table);
          // Move cursor into first cell
          const firstCell = table.querySelector('th, td');
          if (firstCell) {
            const newRange = document.createRange();
            newRange.setStart(firstCell, 0);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
          }
        } else {
          document.execCommand('insertHTML', false, html);
        }
      } else {
        document.execCommand('insertHTML', false, html);
      }

      this._broadcastContent();
    },

    // ─── Image ────────────────────────────────────────────────────────────────

    insertImage(event) {
      const file = event.target.files[0];
      if (!file) return;
      // Reset input so same file can be picked again
      event.target.value = '';

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        this.$refs.docBody?.focus();

        // Restore saved selection if any
        this._restoreSavedSelection();

        const imgHtml = `<img src="${dataUrl}" class="doc-image" style="max-width:100%;height:auto;display:block;margin:8px 0;border-radius:4px;" /><p><br></p>`;

        const sel = window.getSelection();
        if (sel && sel.rangeCount) {
          const range = sel.getRangeAt(0);
          const block = this._getParentBlock(range.startContainer);
          if (block) {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = imgHtml;
            const img  = wrapper.querySelector('img');
            const para = wrapper.querySelector('p');
            block.after(para);
            block.after(img);
            // Move cursor to paragraph after image
            const newRange = document.createRange();
            newRange.setStart(para, 0);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
          } else {
            document.execCommand('insertHTML', false, imgHtml);
          }
        } else {
          document.execCommand('insertHTML', false, imgHtml);
        }

        this._broadcastContent();
      };
      reader.readAsDataURL(file);
    },

    // ─── Toolbar ─────────────────────────────────────────────────────────────

    _rgbToHex(rgb) {
      if (!rgb) return null;
      if (rgb.startsWith('#')) return rgb;
      const m = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
      if (!m) return null;
      return '#' + [m[1], m[2], m[3]]
        .map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
    },

    _updateActiveFormats() {
      try {
        this.activeFormats.bold         = document.queryCommandState('bold');
        this.activeFormats.italic       = document.queryCommandState('italic');
        this.activeFormats.underline    = document.queryCommandState('underline');
        this.activeFormats.strike       = document.queryCommandState('strikeThrough');
        this.activeFormats.sub          = document.queryCommandState('subscript');
        this.activeFormats.sup          = document.queryCommandState('superscript');
        this.activeFormats.ul           = document.queryCommandState('insertUnorderedList');
        this.activeFormats.ol           = document.queryCommandState('insertOrderedList');
        this.activeFormats.alignLeft    = document.queryCommandState('justifyLeft');
        this.activeFormats.alignCenter  = document.queryCommandState('justifyCenter');
        this.activeFormats.alignRight   = document.queryCommandState('justifyRight');
        this.activeFormats.alignJustify = document.queryCommandState('justifyFull');

        const block = (document.queryCommandValue('formatBlock') || '').toLowerCase().replace(/[<>]/g, '');
        this.activeFormats.h1 = block === 'h1';
        this.activeFormats.h2 = block === 'h2';
        this.activeFormats.h3 = block === 'h3';

        const fs = document.queryCommandValue('fontSize');
        if (fs) this.currentFontSize = String(fs);

        const fn = document.queryCommandValue('fontName');
        if (fn) {
          const clean = fn.replace(/['"]/g, '').split(',')[0].trim();
          if (clean) this.currentFontFamily = clean;
        }

        const fc = document.queryCommandValue('foreColor');
        const hex = this._rgbToHex(fc);
        if (hex && hex !== '#000000' || fc) this.activeFontColor = hex || this.activeFontColor;

      } catch (_) {}
    },

    onCursorChange() {
      this._updateActiveFormats();
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        try { this.savedRange = sel.getRangeAt(0).cloneRange(); } catch (_) {}
      }
    },

    fmt(command) {
      this.$refs.docBody?.focus();
      document.execCommand(command, false, null);
      this._updateActiveFormats();
      this._broadcastContent();
    },

    clearFormatting() {
      this.$refs.docBody?.focus();
      document.execCommand('removeFormat', false, null);
      document.execCommand('formatBlock',  false, 'p');
      this._updateActiveFormats();
      this._broadcastContent();
    },

    setFontFamily(family) {
      this._restoreSavedSelection();
      this.$refs.docBody?.focus();
      document.execCommand('fontName', false, family);
      this.currentFontFamily = family;
      this._updateActiveFormats();
      this._broadcastContent();
    },

    setFontSize(size) {
      this._restoreSavedSelection();
      this.$refs.docBody?.focus();
      document.execCommand('fontSize', false, size);
      this.currentFontSize = size;
      this._updateActiveFormats();
      this._broadcastContent();
    },

    setFontColor(color) {
      this.activeFontColor = color;
      this._restoreSavedSelection();
      this.$refs.docBody?.focus();
      document.execCommand('foreColor', false, color);
      this._broadcastContent();
    },

    setHighlightColor(color) {
      this.activeHighlightColor = color;
      this._restoreSavedSelection();
      this.$refs.docBody?.focus();
      if (!document.execCommand('hiliteColor', false, color)) {
        document.execCommand('backColor', false, color);
      }
      this._broadcastContent();
    },

    // ─── Input / keyboard ────────────────────────────────────────────────────

    onInput() {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this._broadcastContent(), 150);
    },

    onKeydown(e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        if (this.activeFormats.ul || this.activeFormats.ol) {
          document.execCommand(e.shiftKey ? 'outdent' : 'indent', false, null);
        } else {
          // Tab inside table moves to next cell
          const sel = window.getSelection();
          if (sel && sel.rangeCount) {
            const td = this._getClosestTableCell(sel.getRangeAt(0).startContainer);
            if (td) {
              e.preventDefault();
              const cells = Array.from(td.closest('table').querySelectorAll('th, td'));
              const idx = cells.indexOf(td);
              const next = e.shiftKey ? cells[idx - 1] : cells[idx + 1];
              if (next) {
                const range = document.createRange();
                range.selectNodeContents(next);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
              }
              return;
            }
          }
          document.execCommand('insertText', false, '\u00a0\u00a0\u00a0\u00a0');
        }
        this._updateActiveFormats();
      }
      if ((e.ctrlKey || e.metaKey) && ['b', 'i', 'u'].includes(e.key.toLowerCase())) {
        this.$nextTick(() => this._updateActiveFormats());
      }

      // Enter in a heading → create a new <p> after, not another heading
      if (e.key === 'Enter' && !e.shiftKey) {
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) return;
        const block = this._getParentBlock(sel.getRangeAt(0).startContainer);
        if (block && /^H[1-6]$/.test(block.nodeName)) {
          e.preventDefault();
          const newP = document.createElement('p');
          newP.innerHTML = '<br>';
          block.after(newP);
          const range = document.createRange();
          range.setStart(newP, 0);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
          this._broadcastContent();
        }
      }
    },

    _getClosestTableCell(node) {
      let current = node;
      while (current && current !== this.$refs.docBody) {
        if (current.nodeName === 'TD' || current.nodeName === 'TH') return current;
        current = current.parentNode;
      }
      return null;
    },

    // ─── LiveKit / Socket ─────────────────────────────────────────────────────

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
        const text = typeof payload === 'string' ? payload : new TextDecoder().decode(payload);
        const msg  = JSON.parse(text);
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
          if (this.canEdit && !this.isHost) setTimeout(() => this._requestState(), 300);
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

    // ─── Members / access ────────────────────────────────────────────────────

    toggleMembers() { this.showMembers = !this.showMembers; },

    toggleAccess(participantId) {
      this.editors = this.editors.includes(participantId)
        ? this.editors.filter(id => id !== participantId)
        : [...this.editors, participantId];
      this._broadcastAccess();
    },

    grantAll()  { this.editors = this.participants.map(p => p.id); this._broadcastAccess(); },
    revokeAll() { this.editors = []; this._broadcastAccess(); },

    _broadcastAccess() {
      this.sendData({ type: 'doc-access-changed', editors: this.editors, senderId: this.userId });
      setTimeout(() => this.broadcastFullState(), 150);
    },

    _updateAccessStatus() {
      if (this.isHost) { this.statusText = 'Connected'; return; }
      this.statusText = this.canEdit ? '✏️ Edit access granted' : '👁 View only';
      setTimeout(() => { this.statusText = 'Connected'; }, 2500);
    },

    getInitials(name) {
      if (!name) return '?';
      const parts = name.trim().split(' ');
      return parts.length === 1
        ? parts[0].charAt(0).toUpperCase()
        : (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    },

    // ─── Download ────────────────────────────────────────────────────────────

    async downloadDoc() {
      const docBody  = this.$refs.docBody;
      const children = [];

      const buildRuns = (node, inherited = {}) => {
        const runs = [];

        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent.replace(/\u00A0/g, ' ');
          if (!text) return runs;
          runs.push(new TextRun({
            text,
            bold:        inherited.bold      || false,
            italics:     inherited.italic    || false,
            underline:   inherited.underline ? {} : undefined,
            strike:      inherited.strike    || false,
            subScript:   inherited.sub       || false,
            superScript: inherited.sup       || false,
            color:       inherited.color     || undefined,
            font:        inherited.font      || undefined,
            size:        inherited.size      || undefined,
          }));
          return runs;
        }

        if (node.nodeType !== Node.ELEMENT_NODE) return runs;

        const tag = node.tagName.toLowerCase();
        const cs  = node.style || {};

        let size = inherited.size;
        if (cs.fontSize) {
          const px = parseFloat(cs.fontSize);
          if (!isNaN(px)) size = Math.round(px * 1.5);
        }

        const style = {
          bold:      inherited.bold      || ['b','strong'].includes(tag) || cs.fontWeight === 'bold',
          italic:    inherited.italic    || ['i','em'].includes(tag)     || cs.fontStyle  === 'italic',
          underline: inherited.underline || tag === 'u'                  || (cs.textDecoration || '').includes('underline'),
          strike:    inherited.strike    || ['s','strike','del'].includes(tag) || (cs.textDecoration || '').includes('line-through'),
          sub:       inherited.sub       || tag === 'sub',
          sup:       inherited.sup       || tag === 'sup',
          color:     cs.color            ? this._rgbToHex(cs.color)?.replace('#','') : inherited.color,
          font:      cs.fontFamily       ? cs.fontFamily.replace(/['"]/g,'').split(',')[0].trim() : inherited.font,
          size,
        };

        if (tag === 'font') {
          const sizeAttr = node.getAttribute('size');
          if (sizeAttr) {
            const map = { '1':16,'2':20,'3':24,'4':28,'5':36,'6':48,'7':72 };
            style.size = map[sizeAttr] || style.size;
          }
          const faceAttr = node.getAttribute('face');
          if (faceAttr) style.font = faceAttr.replace(/['"]/g,'').split(',')[0].trim();
          const colorAttr = node.getAttribute('color');
          if (colorAttr) style.color = colorAttr.replace('#','');
        }

        for (const child of node.childNodes) runs.push(...buildRuns(child, style));
        return runs;
      };

      const parseList = (listEl, depth) => {
        for (const child of listEl.children) {
          if (child.tagName !== 'LI') continue;
          const liRuns = [];
          for (const node of child.childNodes) {
            const t = node.tagName?.toLowerCase();
            if (t === 'ul' || t === 'ol') continue;
            liRuns.push(...buildRuns(node, {}));
          }
          children.push(new Paragraph({
            bullet: { level: Math.min(depth, 8) },
            children: liRuns.length ? liRuns : [new TextRun('')],
          }));
          for (const nested of child.children) {
            const nt = nested.tagName?.toLowerCase();
            if (nt === 'ul' || nt === 'ol') parseList(nested, depth + 1);
          }
        }
      };

      // Parse table into docx Table
      const parseTable = (tableEl) => {
        const rows = [];
        for (const tr of tableEl.querySelectorAll('tr')) {
          const cells = [];
          for (const cell of tr.querySelectorAll('th, td')) {
            const cellRuns = buildRuns(cell, {});
            cells.push(new TableCell({
              children: [new Paragraph({ children: cellRuns.length ? cellRuns : [new TextRun('')] })],
              borders: {
                top:    { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' },
                left:   { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' },
                right:  { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' },
              },
            }));
          }
          if (cells.length) rows.push(new TableRow({ children: cells }));
        }
        if (rows.length) {
          children.push(new Table({
            rows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          }));
          children.push(new Paragraph({ children: [new TextRun('')] }));
        }
      };

      const BLOCK_TAGS = new Set(['h1','h2','h3','h4','h5','h6','p','div','ul','ol','br','li','blockquote','pre','table']);
      const isInline = (node) => {
        if (node.nodeType === Node.TEXT_NODE) return true;
        if (node.nodeType !== Node.ELEMENT_NODE) return false;
        return !BLOCK_TAGS.has(node.tagName.toLowerCase());
      };

      const getAlignment = (el) => {
        const a = el?.style?.textAlign;
        if (a === 'center')  return 'center';
        if (a === 'right')   return 'right';
        if (a === 'justify') return 'both';
        return undefined;
      };

      const parseNode = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent.replace(/\u00A0/g, ' ');
          if (text.trim()) children.push(new Paragraph({ children: [new TextRun(text)] }));
          return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;

        const tag = node.tagName.toLowerCase();

        if (tag === 'h1') {
          children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: buildRuns(node, {}) }));
        } else if (tag === 'h2') {
          children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: buildRuns(node, {}) }));
        } else if (tag === 'h3') {
          children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: buildRuns(node, {}) }));
        } else if (tag === 'table') {
          parseTable(node);
        } else if (tag === 'ul' || tag === 'ol') {
          parseList(node, 0);
        } else if (tag === 'br') {
          children.push(new Paragraph({ children: [new TextRun('')] }));
        } else if (tag === 'img') {
          // Images are skipped in docx export (base64 images need additional processing)
          children.push(new Paragraph({ children: [new TextRun('[Image]')] }));
        } else if (tag === 'div' || tag === 'p') {
          const alignment = getAlignment(node);
          let inlineGroup = [];
          const flushGroup = () => {
            if (!inlineGroup.length) return;
            const runs = inlineGroup.flatMap(n => buildRuns(n, {}));
            children.push(new Paragraph({ alignment, children: runs.length ? runs : [new TextRun('')] }));
            inlineGroup = [];
          };
          for (const child of node.childNodes) {
            if (isInline(child)) {
              inlineGroup.push(child);
            } else {
              flushGroup();
              parseNode(child);
            }
          }
          flushGroup();
          if (!node.childNodes.length) {
            children.push(new Paragraph({ children: [new TextRun('')] }));
          }
        } else {
          const runs = buildRuns(node, {});
          children.push(new Paragraph({ children: runs.length ? runs : [new TextRun('')] }));
        }
      };

      Array.from(docBody.childNodes).forEach(parseNode);
      if (!children.length) children.push(new Paragraph({ children: [new TextRun('')] }));

      const doc    = new Document({ sections: [{ children }] });
      const buffer = await Packer.toBlob(doc);
      const a      = document.createElement('a');
      a.href       = URL.createObjectURL(buffer);
      a.download   = `doc-${this.roomId}-${Date.now()}.docx`;
      a.click();
      URL.revokeObjectURL(a.href);
    },

    // ─── Selection save / restore (for remote sync) ───────────────────────────

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
  font-weight: 700; font-size: 15px; color: #000;
  flex-shrink: 0; position: relative;
}
.doc-header-right { display: flex; align-items: center; gap: 8px; }
.close-btn { background: none; border: none; font-size: 18px; cursor: pointer; color: #000; padding: 2px 6px; border-radius: 4px; }
.close-btn:hover { background: #e0e0e0; }
.role-badge { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 12px; }
.host-badge  { background: #fff8e1; color: #f57f17; border: 1px solid #ffe082; }
.edit-badge  { background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7; }
.view-badge  { background: #fff3e0; color: #e65100; border: 1px solid #ffcc80; }

/* ── Members ── */
.members-wrapper { position: relative; }
.members-btn {
  display: flex; align-items: center; gap: 5px;
  font-size: 11px; font-weight: 600; color: #3730a3;
  background: #eef2ff; border: 1.5px solid #c7d2fe;
  border-radius: 20px; padding: 4px 10px 4px 8px;
  cursor: pointer; white-space: nowrap;
  transition: background 0.15s, border-color 0.15s;
}
.members-btn:hover, .members-btn.active { background: #e0e7ff; border-color: #a5b4fc; }
.members-count {
  background: #4f46e5; color: #fff;
  border-radius: 10px; padding: 0 6px;
  font-size: 10px; font-weight: 700; min-width: 16px; text-align: center;
}
.chevron { opacity: 0.6; transition: transform 0.2s; }
.chevron.open { transform: rotate(180deg); }
.members-dropdown {
  position: absolute; top: calc(100% + 8px); right: 0;
  width: 280px; background: #fff;
  border: 1.5px solid #e0e7ff; border-radius: 12px;
  box-shadow: 0 8px 24px rgba(79,70,229,0.13);
  z-index: 200; overflow: hidden;
}
.dropdown-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px 8px;
  background: #f0f4ff; border-bottom: 1px solid #d0d8f0;
}
.dropdown-title { font-size: 11px; font-weight: 700; color: #3730a3; letter-spacing: 0.4px; text-transform: uppercase; }
.access-bulk-btns { display: flex; gap: 6px; }
.grant-all-btn, .revoke-all-btn { font-size: 10px; padding: 3px 9px; border: none; border-radius: 10px; cursor: pointer; font-weight: 700; }
.grant-all-btn  { background: #4CAF50; color: white; }
.revoke-all-btn { background: #f44336; color: white; }
.grant-all-btn:hover  { background: #43a047; }
.revoke-all-btn:hover { background: #e53935; }
.access-list { max-height: 220px; overflow-y: auto; padding: 6px 0; }
.access-row { display: flex; justify-content: space-between; align-items: center; padding: 7px 14px; transition: background 0.1s; }
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
.toggle-switch { position: relative; width: 38px; height: 20px; display: inline-block; cursor: pointer; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.toggle-slider { position: absolute; inset: 0; background: #ccc; border-radius: 20px; transition: background 0.2s; }
.toggle-slider::before {
  content: ''; position: absolute; width: 14px; height: 14px;
  left: 3px; bottom: 3px; background: white; border-radius: 50%;
  transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.toggle-switch input:checked + .toggle-slider { background: #4CAF50; }
.toggle-switch input:checked + .toggle-slider::before { transform: translateX(18px); }
.dropdown-enter-active, .dropdown-leave-active { transition: opacity 0.15s, transform 0.15s; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-6px) scale(0.97); }

/* ── Toolbar ── */
.doc-toolbar {
  display: flex; flex-direction: column; gap: 3px;
  padding: 5px 8px 6px; background: #fafafa;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}
.toolbar-row {
  display: flex; align-items: center; gap: 2px; flex-wrap: wrap;
}
.doc-toolbar button {
  background: none; border: 1px solid transparent; border-radius: 5px;
  padding: 3px 7px; cursor: pointer; font-size: 12px; color: #333;
  min-width: 26px; height: 26px;
  display: inline-flex; align-items: center; justify-content: center;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
  user-select: none; -webkit-user-select: none;
  white-space: nowrap; flex-shrink: 0;
}
.doc-toolbar button:hover  { background: #e8e8e8; border-color: #ccc; }
.doc-toolbar button.active { background: #dbeafe; border-color: #93c5fd; color: #1d4ed8; font-weight: 700; }
.toolbar-sep { width: 1px; height: 18px; background: #ddd; margin: 0 2px; flex-shrink: 0; }

.toolbar-select {
  height: 26px; border: 1px solid #ddd; border-radius: 5px;
  background: #fff; color: #333; font-size: 11px;
  cursor: pointer; outline: none; padding: 0 3px;
  flex-shrink: 0;
}
.font-family-select { max-width: 108px; }
.font-size-select   { max-width: 50px; }
.toolbar-select:hover { border-color: #bbb; background: #f5f5f5; }

/* Color pickers */
.toolbar-color-wrap {
  position: relative; display: inline-flex;
  align-items: center; justify-content: center;
  flex-shrink: 0;
}
.color-preview-btn {
  background: none; border: 1px solid transparent; border-radius: 5px;
  padding: 3px 7px; cursor: pointer;
  min-width: 26px; height: 26px;
  display: inline-flex; align-items: center; justify-content: center;
  transition: background 0.12s, border-color 0.12s;
}
.color-preview-btn:hover { background: #e8e8e8; border-color: #ccc; }
.color-letter {
  font-size: 13px; font-weight: 700; color: #222;
  line-height: 1; pointer-events: none;
}
.hidden-color-input {
  position: absolute; width: 0; height: 0;
  opacity: 0; pointer-events: none; border: none;
}

/* ── Table picker popup ── */
.table-picker-popup {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.12);
  padding: 8px;
  z-index: 300;
  min-width: 140px;
}
.table-picker-label {
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  color: #555;
  margin-bottom: 6px;
}
.table-grid {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.table-grid-row {
  display: flex;
  gap: 2px;
}
.table-grid-cell {
  width: 16px;
  height: 16px;
  border: 1px solid #ccc;
  border-radius: 2px;
  cursor: pointer;
  background: #fff;
  transition: background 0.1s, border-color 0.1s;
}
.table-grid-cell.highlighted {
  background: #dbeafe;
  border-color: #93c5fd;
}

/* ── Editor body ── */
.doc-body {
  flex: 1; padding: 20px 24px; overflow-y: auto;
  font-size: 15px; line-height: 1.7; color: #1a1a1a;
  outline: none; min-height: 0;
  word-break: break-word;
}
.doc-body[data-placeholder]:empty::before {
  content: attr(data-placeholder); color: #bbb; pointer-events: none; display: block;
}
.doc-editable { cursor: text; border-top: 2px solid #4CAF5033; }
.doc-readonly  { cursor: default; background: #fafafa; border-top: 2px solid #e0e0e0; }
.doc-body :deep(h1) { font-size: 2em;   margin: 0.4em 0; font-weight: 700; }
.doc-body :deep(h2) { font-size: 1.5em; margin: 0.4em 0; font-weight: 700; }
.doc-body :deep(h3) { font-size: 1.2em; margin: 0.4em 0; font-weight: 700; }
.doc-body :deep(ul), .doc-body :deep(ol) { padding-left: 24px; margin: 4px 0; }
.doc-body :deep(ul ul), .doc-body :deep(ol ol),
.doc-body :deep(ul ol), .doc-body :deep(ol ul) { padding-left: 24px; margin: 2px 0; }
.doc-body :deep(li) { margin: 2px 0; }
.doc-body :deep(b), .doc-body :deep(strong) { font-weight: 700; }
.doc-body :deep(i), .doc-body :deep(em) { font-style: italic; }
.doc-body :deep(u) { text-decoration: underline; }
.doc-body :deep(s), .doc-body :deep(strike) { text-decoration: line-through; }
.doc-body :deep(sub) { vertical-align: sub; font-size: smaller; }
.doc-body :deep(sup) { vertical-align: super; font-size: smaller; }

/* ── Table styles ── */
.doc-body :deep(.doc-table) {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
  font-size: 14px;
  table-layout: fixed;
}
.doc-body :deep(.doc-table th),
.doc-body :deep(.doc-table td) {
  border: 1px solid #c8c8c8;
  padding: 7px 10px;
  min-width: 40px;
  vertical-align: top;
  word-break: break-word;
}
.doc-body :deep(.doc-table th) {
  background: #f0f0f0;
  font-weight: 700;
  text-align: left;
  color: #222;
}
.doc-body :deep(.doc-table td) {
  background: #fff;
}
.doc-body :deep(.doc-table tr:hover td) {
  background: #fafafa;
}
/* Make table cells editable visually */
.doc-body :deep(.doc-table th[contenteditable="true"]:focus),
.doc-body :deep(.doc-table td[contenteditable="true"]:focus) {
  outline: 2px solid #4CAF50;
  outline-offset: -1px;
  background: #f0fff4;
}

/* ── Image styles ── */
.doc-body :deep(.doc-image) {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 8px 0;
  border-radius: 4px;
  cursor: pointer;
}
.doc-body :deep(.doc-image:hover) {
  box-shadow: 0 0 0 2px #4CAF50;
}

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
  transition: background 0.2s;
}
.doc-download-btn:hover { background: #312e81; }

/* ── Mobile ── */
@media (max-width: 768px) {
  #doc-enact-panel { width: 100%; left: 0; bottom: 70px; }
  .doc-toolbar button { min-width: 32px; height: 32px; font-size: 13px; }
  .toolbar-select { height: 32px; font-size: 12px; }
  .color-preview-btn { min-width: 32px; height: 32px; }
  .toggle-switch { width: 46px; height: 26px; }
  .toggle-slider::before { width: 18px; height: 18px; }
  .toggle-switch input:checked + .toggle-slider::before { transform: translateX(20px); }
  .doc-body { padding: 14px 16px; font-size: 16px; }
  .members-dropdown { width: 260px; }
  .table-picker-popup { left: auto; right: 0; }
}
</style>
