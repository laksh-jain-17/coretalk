<template>
  <div id="wb-panel">
    <div class="wb-header">
      <span class="wb-title">Whiteboard</span>
      <div class="wb-toolbar">
        <div class="wb-colors">
          <button
            v-for="c in colors"
            :key="c.hex"
            class="wb-swatch"
            :title="c.name"
            :style="{
              background: c.hex,
              boxShadow: activeColor === c.hex && !eraseMode
                ? '0 0 0 3px white, 0 0 0 5px ' + c.hex
                : 'none'
            }"
            @click="eraseMode = false; activeColor = c.hex"
          />
        </div>
        <div class="wb-divider" />
        <select v-model="brushSize" class="wb-select">
          <option :value="2">Thin</option>
          <option :value="5">Medium</option>
          <option :value="12">Thick</option>
        </select>
        <button
          class="wb-btn"
          :class="{ 'wb-btn-active': eraseMode }"
          @click="eraseMode = !eraseMode"
          title="Eraser"
        >
          ⌫
        </button>
        <button class="wb-btn" @click="undoStroke" title="Undo">↩</button>
        <button class="wb-btn wb-btn-danger" @click="clearCanvas" title="Clear all">
          🗑
        </button>
        <button class="wb-btn wb-btn-green" @click="downloadCanvas" title="Download PNG">
          Download
        </button>
      </div>
      <button class="wb-close" @click="$emit('close')">✕</button>
    </div>

    <div class="wb-canvas-wrap" ref="canvasWrap">
      <canvas
        ref="canvasRef"
        class="wb-canvas"
        @mousedown="startDraw"
        @mousemove="draw"
        @mouseup="stopDraw"
        @mouseleave="stopDraw"
        @touchstart.prevent="startDrawTouch"
        @touchmove.prevent="drawTouch"
        @touchend.prevent="stopDraw"
        :style="{ cursor: eraseMode ? 'cell' : 'crosshair' }"
      />
    </div>
  </div>
</template>

<script>
export default {
  name: 'WhiteboardPanel',
  props: {
    socket: { type: Object, required: true },
    roomId: { type: String, required: true }
  },
  emits: ['close'],

  data() {
    return {
      colors: [
        { hex: '#10b981', name: 'Emerald' },
        { hex: '#1e40af', name: 'Cobalt blue' },
        { hex: '#facc15', name: 'Yellow' },
        { hex: '#ef4444', name: 'Red' },
        { hex: '#6b7280', name: 'Grey' },
        { hex: '#ec4899', name: 'Pink' },
      ],
      activeColor: '#10b981',
      brushSize: 5,
      eraseMode: false,
      isDrawing: false,
      lastX: 0,
      lastY: 0,
      // Each stroke is stored as array of segments for undo
      strokes: [],        // [ { segments: [{x0,y0,x1,y1,color,size,erase}] } ]
      currentStroke: null
    };
  },

  mounted() {
    this.setupCanvas();
    this.setupSocketListeners();
    window.addEventListener('resize', this.onResize);
  },

  beforeUnmount() {
    window.removeEventListener('resize', this.onResize);
    if (this.socket) {
      this.socket.off('wb:stroke');
      this.socket.off('wb:clear');
    }
  },

  methods: {
    setupCanvas() {
      const canvas = this.$refs.canvasRef;
      const wrap = this.$refs.canvasWrap;
      canvas.width = wrap.clientWidth || 1200;
      canvas.height = wrap.clientHeight || 650;
      const ctx = canvas.getContext('2d');
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    },

    onResize() {
      // Save current drawing, resize, redraw
      const canvas = this.$refs.canvasRef;
      const wrap = this.$refs.canvasWrap;
      const snapshot = canvas.toDataURL();
      canvas.width = wrap.clientWidth;
      canvas.height = wrap.clientHeight;
      const ctx = canvas.getContext('2d');
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = snapshot;
    },

    setupSocketListeners() {
      this.socket.on('wb:stroke', (data) => {
        this.drawSegment(data.x0, data.y0, data.x1, data.y1, data.color, data.size, data.erase);
      });
      this.socket.on('wb:clear', () => {
        const canvas = this.$refs.canvasRef;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.strokes = [];
      });
    },

    getPos(e) {
      const canvas = this.$refs.canvasRef;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    },

    getTouchPos(e) {
      const touch = e.touches[0];
      return this.getPos(touch);
    },

    startDraw(e) {
      this.isDrawing = true;
      const { x, y } = this.getPos(e);
      this.lastX = x;
      this.lastY = y;
      this.currentStroke = { segments: [] };
    },

    startDrawTouch(e) {
      this.isDrawing = true;
      const { x, y } = this.getTouchPos(e);
      this.lastX = x;
      this.lastY = y;
      this.currentStroke = { segments: [] };
    },

    draw(e) {
      if (!this.isDrawing) return;
      const { x, y } = this.getPos(e);
      this.emitAndDraw(x, y);
    },

    drawTouch(e) {
      if (!this.isDrawing) return;
      const { x, y } = this.getTouchPos(e);
      this.emitAndDraw(x, y);
    },

    emitAndDraw(x, y) {
      const seg = {
        x0: this.lastX,
        y0: this.lastY,
        x1: x,
        y1: y,
        color: this.activeColor,
        size: this.brushSize,
        erase: this.eraseMode
      };

      this.drawSegment(seg.x0, seg.y0, seg.x1, seg.y1, seg.color, seg.size, seg.erase);

      if (this.currentStroke) {
        this.currentStroke.segments.push(seg);
      }

      this.socket.emit('wb:stroke', { roomId: this.roomId, ...seg });

      this.lastX = x;
      this.lastY = y;
    },

    stopDraw() {
      if (!this.isDrawing) return;
      this.isDrawing = false;
      if (this.currentStroke && this.currentStroke.segments.length > 0) {
        this.strokes.push(this.currentStroke);
      }
      this.currentStroke = null;
    },

    drawSegment(x0, y0, x1, y1, color, size, erase) {
      const canvas = this.$refs.canvasRef;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.globalCompositeOperation = erase ? 'destination-out' : 'source-over';
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.strokeStyle = color;
      ctx.lineWidth = erase ? size * 4 : size;
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    },

    undoStroke() {
      if (this.strokes.length === 0) return;
      this.strokes.pop();
      // Redraw everything from strokes array
      const canvas = this.$refs.canvasRef;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const stroke of this.strokes) {
        for (const seg of stroke.segments) {
          this.drawSegment(seg.x0, seg.y0, seg.x1, seg.y1, seg.color, seg.size, seg.erase);
        }
      }
      // Note: undo is local only — syncing undo across peers
      // requires a full redraw broadcast which is a v4 feature
    },

    clearCanvas() {
      const canvas = this.$refs.canvasRef;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.strokes = [];
      this.socket.emit('wb:clear', { roomId: this.roomId });
    },

    downloadCanvas() {
      const canvas = this.$refs.canvasRef;
      // Draw white background behind the drawing
      const offscreen = document.createElement('canvas');
      offscreen.width = canvas.width;
      offscreen.height = canvas.height;
      const offCtx = offscreen.getContext('2d');
      offCtx.fillStyle = '#ffffff';
      offCtx.fillRect(0, 0, offscreen.width, offscreen.height);
      offCtx.drawImage(canvas, 0, 0);

      const link = document.createElement('a');
      link.download = `coretalk-whiteboard-${Date.now()}.png`;
      link.href = offscreen.toDataURL('image/png');
      link.click();
    }
  }
};
</script>

<style scoped>
#wb-panel {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 70px; /* sits above the navbar */
  background: #1a1a1a;
  z-index: 90;
  display: flex;
  flex-direction: column;
}

.wb-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: #2d2d2d;
  border-bottom: 1px solid #444;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.wb-title {
  font-size: 15px;
  font-weight: 600;
  color: white;
  white-space: nowrap;
}

.wb-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  flex-wrap: wrap;
}

.wb-colors {
  display: flex;
  gap: 6px;
  align-items: center;
}

.wb-swatch {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
  transition: box-shadow 0.15s;
}

.wb-swatch:hover {
  transform: scale(1.15);
}

.wb-divider {
  width: 1px;
  height: 24px;
  background: #555;
}

.wb-select {
  background: #3a3a3a;
  color: white;
  border: 1px solid #555;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 13px;
  cursor: pointer;
}

.wb-btn {
  background: #3a3a3a;
  color: white;
  border: 1px solid #555;
  border-radius: 6px;
  padding: 5px 10px;
  font-size: 15px;
  cursor: pointer;
  transition: background 0.15s;
  line-height: 1;
}

.wb-btn:hover { background: #4a4a4a; }

.wb-btn-active {
  background: #1e40af !important;
  border-color: #3b60f0 !important;
}

.wb-btn-danger { }
.wb-btn-danger:hover { background: #b91c1c; }

.wb-btn-green:hover { background: #15803d; }

.wb-close {
  margin-left: auto;
  background: none;
  border: none;
  color: #aaa;
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  line-height: 1;
}

.wb-close:hover { color: white; background: #444; }

.wb-canvas-wrap {
  flex: 1;
  overflow: hidden;
  position: relative;
  background: #fff;
}

.wb-canvas {
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
}
</style>
