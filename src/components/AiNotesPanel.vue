<template>
  <div id="notes-panel">
    <div class="notes-header">
      <span> AI Meeting Summary</span>
      <button @click="$emit('close')">✕</button>
    </div>

    <div class="notes-body">
      <!-- State: idle -->
      <div v-if="state === 'idle'" class="notes-idle">
        <p class="notes-hint">
          AI notes uses your microphone to transcribe the meeting every 30 seconds,
          then summarises everything when you stop.
        </p>
        <button class="notes-start-btn" @click="start">
           Start taking notes
        </button>
      </div>

      <!-- State: recording -->
      <div v-if="state === 'recording'" class="notes-recording">
        <div class="notes-recording-indicator">
          <span class="notes-dot" />
          Recording — captures every 30s
        </div>
        <button class="notes-stop-btn" @click="stop">
           Stop &amp; summarise
        </button>
        <div class="notes-waiting">
          {{ transcript.length ? `${transcript.length} segment(s) captured...` : 'Waiting for first transcription...' }}
        </div>
      </div>

      <!-- State: summarising -->
      <div v-if="state === 'summarising'" class="notes-summarising">
        <div class="notes-spinner" />
        <p>{{ transcript.length ? 'Summarising your meeting...' : 'Finishing transcription...' }}</p>
      </div>

      <!-- State: done -->
      <div v-if="state === 'done'" class="notes-done">
        <div class="notes-section-label">Summary</div>
        <div class="notes-summary-box">
          <pre class="notes-summary-text">{{ summary }}</pre>
        </div>
        <div class="notes-actions">
          <button class="notes-dl-btn" @click="download">
             Download (.docx)
          </button>
          <button class="notes-reset-btn" @click="reset">
            New session
          </button>
        </div>
      </div>

      <!-- Error banner -->
      <div v-if="error" class="notes-error">
        ⚠️ {{ error }}
      </div>
    </div>
  </div>
</template>
<script>
const GROQ_API = 'https://api.groq.com/openai/v1';

export default {
  name: 'AiNotesPanel',
  props: {
    roomTitle: { type: String, default: 'Meeting' }
  },
  emits: ['close'],

  data() {
    return {
      state: 'idle',        // 'idle' | 'recording' | 'summarising' | 'done'
      transcript: [],       // [{ time, text }]
      summary: '',
      error: '',
      captureInterval: null,
      micStream: null,
      activeRecorder: null, // tracks the currently running MediaRecorder
    };
  },

  beforeUnmount() {
    this.stopCapture();
  },

  methods: {
    async start() {
      this.error = '';
      const key = import.meta.env.VITE_GROQ_API_KEY;
      if (!key) {
        this.error = 'VITE_GROQ_API_KEY is not set in your .env file.';
        return;
      }

      try {
        this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        this.error = 'Microphone permission denied.';
        return;
      }

      this.state = 'recording';
      this.transcript = [];
      this.summary = '';
      this.error = '';

      // Capture immediately, then every 30s
      this.captureAndTranscribe();
      this.captureInterval = setInterval(() => {
        this.captureAndTranscribe();
      }, 30000);
    },

    stopCapture() {
      if (this.captureInterval) {
        clearInterval(this.captureInterval);
        this.captureInterval = null;
      }
      if (this.micStream) {
        this.micStream.getTracks().forEach(t => t.stop());
        this.micStream = null;
      }
      this.activeRecorder = null;
    },

    async captureAndTranscribe() {
      if (!this.micStream) return;

      const key = import.meta.env.VITE_GROQ_API_KEY;

      return new Promise((resolve) => {
        let recorder;
        try {
          recorder = new MediaRecorder(this.micStream, { mimeType: 'audio/webm' });
        } catch {
          try {
            recorder = new MediaRecorder(this.micStream);
          } catch (e) {
            this.error = 'MediaRecorder not supported: ' + e.message;
            resolve();
            return;
          }
        }

        const chunks = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = async () => {
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });

          // Too small = silence, skip
          if (blob.size < 1000) {
            this.activeRecorder = null;
            resolve();
            return;
          }

          const formData = new FormData();
          formData.append('file', blob, 'audio.webm');
          formData.append('model', 'whisper-large-v3');
          formData.append('response_format', 'json');

          try {
            const res = await fetch(`${GROQ_API}/audio/transcriptions`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${key}` },
              body: formData
            });

            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              console.error('Whisper error:', errData);
              this.activeRecorder = null;
              resolve();
              return;
            }

            const data = await res.json();
            const text = (data.text || '').trim();
            if (text) {
              this.transcript.push({
                time: new Date().toLocaleTimeString(),
                text
              });
            }
          } catch (e) {
            console.error('Transcription failed:', e);
          }

          this.activeRecorder = null;
          resolve();
        };

        // Store reference so stop() can wait on it
        this.activeRecorder = recorder;
        recorder.start();

        // Record a 25s window (5s buffer before next interval fires)
        setTimeout(() => {
          if (recorder.state === 'recording') recorder.stop();
        }, 25000);
      });
    },

    async stop() {
      // 1. Stop the interval so no new captures start
      if (this.captureInterval) {
        clearInterval(this.captureInterval);
        this.captureInterval = null;
      }

      // 2. If a recorder is currently mid-recording, stop it and wait for
      //    its onstop (which does the Whisper API call) to fully complete
      if (this.activeRecorder && this.activeRecorder.state === 'recording') {
        this.state = 'summarising'; // show spinner while waiting
        await new Promise((resolve) => {
          this.activeRecorder.addEventListener('stop', resolve, { once: true });
          this.activeRecorder.stop();
        });
        // Buffer to let the async onstop handler (Whisper fetch) finish
        await new Promise(r => setTimeout(r, 800));
      }

      // 3. Stop the mic stream
      if (this.micStream) {
        this.micStream.getTracks().forEach(t => t.stop());
        this.micStream = null;
      }

      // 4. Check if we got anything
      if (!this.transcript.length) {
        this.state = 'done';
        this.summary = 'No speech was detected during this session.';
        return;
      }

      // 5. Summarise with Groq
      this.state = 'summarising';

      const key = import.meta.env.VITE_GROQ_API_KEY;
      const fullText = this.transcript
        .map(t => `[${t.time}] ${t.text}`)
        .join('\n');

      try {
        const res = await fetch(`${GROQ_API}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            max_tokens: 1024,
            messages: [
              {
                role: 'system',
                content:
                  'You are a precise meeting notes assistant. From the transcript, extract:\n' +
                  '1. **Key discussion points** (bullet list)\n' +
                  '2. **Decisions made** (bullet list, or "None" if absent)\n' +
                  '3. **Action items** (bullet list with owner if mentioned, or "None" if absent)\n\n' +
                  'Be concise. Ignore filler words and repetitions.'
              },
              {
                role: 'user',
                content: `Meeting: ${this.roomTitle}\n\nTranscript:\n${fullText}`
              }
            ]
          })
        });

        if (!res.ok) {
          throw new Error(`Groq API error: ${res.status}`);
        }

        const data = await res.json();
        this.summary = data.choices?.[0]?.message?.content || 'Could not generate summary.';
        this.state = 'done';
      } catch (e) {
        console.error('Summary error:', e);
        this.error = 'Could not summarise: ' + e.message;
        this.state = 'done';
        this.summary = '';
      }
    },

    async download() {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import(
        'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.min.js'
      );

      const children = [];

      // Title
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun(`Meeting Notes — ${this.roomTitle}`)]
      }));

      // Generated date
      children.push(new Paragraph({
        children: [new TextRun({
          text: `Generated by CoreTalk AI on ${new Date().toLocaleString()}`,
          italics: true
        })]
      }));

      // Spacer
      children.push(new Paragraph({ children: [new TextRun('')] }));

      // Summary heading
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun('Summary')]
      }));

      // Summary lines — strip markdown bold markers
      this.summary.split('\n').forEach(line => {
        children.push(new Paragraph({
          children: [new TextRun(line.replace(/\*\*/g, ''))]
        }));
      });

      // Spacer
      children.push(new Paragraph({ children: [new TextRun('')] }));

      // Transcript heading
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun('Full Transcript')]
      }));

      // Transcript lines with bold timestamps
      this.transcript.forEach(t => {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: `[${t.time}] `, bold: true }),
            new TextRun(t.text)
          ]
        }));
      });

      const doc = new Document({ sections: [{ children }] });
      const blob = await Packer.toBlob(doc);

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `coretalk-notes-${Date.now()}.docx`;
      link.click();
      URL.revokeObjectURL(link.href);
    },

    reset() {
      this.state = 'idle';
      this.transcript = [];
      this.summary = '';
      this.error = '';
      this.activeRecorder = null;
    }
  }
};
</script>

<style scoped>
#notes-panel {
  position: relative;
  width: 100%;
  max-height: calc(100vh - 100px);
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  border: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  color: #111;
  overflow: hidden;
}

.notes-header {
  padding: 14px 16px;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  border-radius: 12px 12px 0 0;
  font-weight: 600;
  font-size: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.notes-header button {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #555;
  line-height: 1;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background 0.15s;
}

.notes-header button:hover {
  background: #e0e0e0;
  color: #000;
}

.notes-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ---- Idle ---- */
.notes-hint {
  font-size: 13px;
  color: #555;
  line-height: 1.6;
  margin: 0 0 12px;
}

.notes-start-btn {
  width: 100%;
  padding: 12px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.notes-start-btn:hover {
  background: #059669;
}

/* ---- Recording ---- */
.notes-recording-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #ef4444;
  font-weight: 600;
  margin-bottom: 8px;
}

.notes-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ef4444;
  animation: blink 1s ease-in-out infinite;
  flex-shrink: 0;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.2; }
}

.notes-stop-btn {
  width: 100%;
  padding: 11px;
  background: #1e40af;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  margin-bottom: 12px;
}

.notes-stop-btn:hover {
  background: #1e3a8a;
}

.notes-waiting {
  font-size: 13px;
  color: #888;
  text-align: center;
  padding: 12px 0;
}

/* ---- Summarising ---- */
.notes-summarising {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 0;
  color: #555;
  font-size: 14px;
}

.notes-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e0e0e0;
  border-top-color: #10b981;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ---- Done ---- */
.notes-section-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #888;
  margin-bottom: 6px;
}

.notes-summary-box {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 12px;
  background: #fafafa;
  max-height: 260px;
  overflow-y: auto;
}

.notes-summary-text {
  font-size: 13px;
  line-height: 1.7;
  color: #222;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  margin: 0;
}

.notes-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.notes-dl-btn {
  flex: 1;
  padding: 10px;
  background: #1e40af;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.notes-dl-btn:hover {
  background: #1e3a8a;
}

.notes-reset-btn {
  padding: 10px 14px;
  background: #f5f5f5;
  color: #333;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.notes-reset-btn:hover {
  background: #e5e5e5;
}

/* ---- Error ---- */
.notes-error {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13px;
}
</style>
