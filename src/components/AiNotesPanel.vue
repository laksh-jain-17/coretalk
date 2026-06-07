<template>
  <div id="notes-panel">
    <div class="notes-header">
      <div class="header-left">
        <div class="header-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a5 5 0 1 0 5 5A5 5 0 0 0 12 2zm0 8a3 3 0 1 1 3-3 3 3 0 0 1-3 3zm9 11v-1a7 7 0 0 0-7-7h-4a7 7 0 0 0-7 7v1"/>
          </svg>
        </div>
        <span class="header-title">AI Summary</span>
        <span v-if="state === 'recording'" class="pulse-badge">LIVE</span>
      </div>
      <button class="close-btn" @click="$emit('close')" aria-label="Close">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <div class="notes-body">

      <!-- IDLE -->
      <div v-if="state === 'idle'" class="state-idle">
        <div class="idle-row">
          <div class="idle-mic-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
            </svg>
          </div>
          <div class="idle-text">
            <p class="idle-title">Ready to take notes</p>
            <p class="idle-desc">Captures every 30s · generates intelligent notes</p>
          </div>
        </div>
        <button class="btn-primary" @click="start">Start Recording</button>
      </div>

      <!-- RECORDING -->
      <div v-if="state === 'recording'" class="state-recording">
        <div class="recording-status">
          <span class="rec-dot" />
          <span class="rec-label">Recording in progress</span>
          <span class="seg-pill" v-if="transcript.length > 0">{{ transcript.length }} seg</span>
        </div>

        <div class="wave-container" v-if="transcript.length === 0">
          <div class="wave-idle">Listening for speech…</div>
        </div>
        <div v-else class="latest-preview">
          <div class="preview-label">Latest capture</div>
          <div class="preview-text">{{ transcript[transcript.length - 1].text }}</div>
        </div>

        <button class="btn-stop" @click="stop">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="4" y="4" width="16" height="16" rx="2"/>
          </svg>
          Stop &amp; Generate Notes
        </button>
      </div>

      <!-- SUMMARISING -->
      <div v-if="state === 'summarising'" class="state-summarising">
        <div class="gen-loader">
          <div class="gen-bar" v-for="i in 5" :key="i" :style="`animation-delay: ${(i-1)*0.12}s`" />
        </div>
        <p class="gen-text">{{ transcript.length ? 'Generating your notes…' : 'Finishing transcription…' }}</p>
      </div>

      <!-- DONE -->
      <div v-if="state === 'done'" class="state-done">
        <div class="notes-output">
          <div class="output-header">
            <span class="output-label">Meeting Notes</span>
            <span class="output-time">{{ sessionDate }}</span>
          </div>
          <div class="notes-content" v-html="renderedSummary" />
        </div>
        <div class="done-actions">
          <button class="btn-download" @click="download">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download .docx
          </button>
          <button class="btn-ghost" @click="reset">New Session</button>
        </div>
      </div>

      <!-- ERROR -->
      <div v-if="error" class="notes-error">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        {{ error }}
      </div>

    </div>
  </div>
</template>

<script>
const GROQ_API = 'https://api.groq.com/openai/v1';

// ── Markdown → HTML renderer ─────────────────────────────────────────────────
// Handles: ##/### headings, **bold**, bullet lists, numbered lists, blank lines
function parseSummaryToHtml(text) {
  const lines = text.split('\n');
  let html = '';
  let inUl = false;
  let inOl = false;

  const closeList = () => {
    if (inUl) { html += '</ul>'; inUl = false; }
    if (inOl) { html += '</ol>'; inOl = false; }
  };

  const inlineFmt = (s) =>
    s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
     .replace(/\*(.*?)\*/g, '<em>$1</em>')
     .replace(/`(.*?)`/g, '<code>$1</code>');

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) { closeList(); continue; }

    // Headings
    const h2 = line.match(/^##\s+(.+)/);
    const h3 = line.match(/^###\s+(.+)/);
    if (h2) { closeList(); html += `<h3>${inlineFmt(h2[1])}</h3>`; continue; }
    if (h3) { closeList(); html += `<h4>${inlineFmt(h3[1])}</h4>`; continue; }

    // Bullet list
    const bullet = line.match(/^[-•*]\s+(.+)/);
    if (bullet) {
      if (inOl) { html += '</ol>'; inOl = false; }
      if (!inUl) { html += '<ul>'; inUl = true; }
      html += `<li>${inlineFmt(bullet[1])}</li>`;
      continue;
    }

    // Numbered list
    const numbered = line.match(/^\d+\.\s+(.+)/);
    if (numbered) {
      if (inUl) { html += '</ul>'; inUl = false; }
      if (!inOl) { html += '<ol>'; inOl = true; }
      html += `<li>${inlineFmt(numbered[1])}</li>`;
      continue;
    }

    // Paragraph
    closeList();
    html += `<p>${inlineFmt(line)}</p>`;
  }

  closeList();
  return html;
}

// ── Build a context-rich prompt ───────────────────────────────────────────────
// Extracts named entities, repeated topics, timestamps to help the model
// understand what actually happened in the meeting.
function buildPrompt(roomTitle, transcript) {
  // Group segments into time buckets for temporal context
  const segments = transcript.map((t, i) => `[${t.time}] ${t.text}`).join('\n');

  // Extract approximate duration
  const first = transcript[0]?.time || '';
  const last  = transcript[transcript.length - 1]?.time || '';
  const durationNote = first && last && first !== last
    ? `The meeting ran from ${first} to ${last}.`
    : '';

  // Word frequency — find the most repeated content words (topic hints)
  const stopWords = new Set([
    'the','a','an','is','it','in','on','at','to','for','of','and','or','but',
    'that','this','with','was','are','be','have','has','had','will','would',
    'can','could','we','i','you','he','she','they','so','just','like','yeah',
    'okay','ok','um','uh','hmm','right','know','think','mean','get','got',
    'going','want','need','make','do','did','done','my','your','our','their',
    'its','from','about','also','some','there','here','what','how','when',
    'which','who','if','then','been','not','no','yes','very','really','well',
  ]);

  const wordFreq = {};
  transcript.forEach(t => {
    t.text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).forEach(w => {
      if (w.length > 3 && !stopWords.has(w)) {
        wordFreq[w] = (wordFreq[w] || 0) + 1;
      }
    });
  });

  const topTopics = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([w]) => w)
    .join(', ');

  const systemPrompt = `You are an expert meeting notes taker. Your job is to read a meeting transcript and produce SHORT, CLEAR, USEFUL notes — the kind a busy professional would actually want to read.

RULES (follow strictly):
1. Start directly with what was discussed. No preamble, no "Here are the notes".
2. Write 2–4 short bullet points covering the MAIN topics discussed. Each bullet = one clear idea.
3. If any decisions were made, list them under "**Decided:**"
4. If any tasks or next steps were mentioned, list them under "**Action items:**"
5. If none of those exist, skip those sections entirely.
6. Total length: under 120 words. Shorter is better.
7. Use plain English. No jargon, no filler words.
8. Capture specific names, numbers, dates, or product names if mentioned — these are the most important details.
9. Do NOT summarise meta-talk ("we should discuss", "let me share my screen"). Focus on actual content.
10. Do NOT include timestamps or section headers like "Summary" or "Key Points".

Context clues from this meeting:
- Meeting title: ${roomTitle || 'Team Meeting'}
- ${durationNote}
- Most discussed words/topics: ${topTopics || 'N/A'}`;

  const userPrompt = `Transcript:\n${segments}\n\nWrite the meeting notes now:`;

  return { systemPrompt, userPrompt };
}

export default {
  name: 'AiNotesPanel',
  props: {
    roomTitle: { type: String, default: 'Meeting' }
  },
  emits: ['close'],

  data() {
    return {
      state: 'idle',       // idle | recording | summarising | done
      transcript: [],      // [{ time, text }]
      summary: '',
      error: '',
      sessionDate: '',
      captureInterval: null,
      micStream: null,
      activeRecorder: null,
    };
  },

  computed: {
    renderedSummary() {
      return parseSummaryToHtml(this.summary);
    }
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
      this.state      = 'recording';
      this.transcript = [];
      this.summary    = '';
      this.error      = '';

      // Capture first segment immediately, then every 30s
      this.captureAndTranscribe();
      this.captureInterval = setInterval(() => this.captureAndTranscribe(), 30000);
    },

    stopCapture() {
      if (this.captureInterval) { clearInterval(this.captureInterval); this.captureInterval = null; }
      if (this.micStream)       { this.micStream.getTracks().forEach(t => t.stop()); this.micStream = null; }
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
          try { recorder = new MediaRecorder(this.micStream); }
          catch (e) { this.error = 'MediaRecorder not supported: ' + e.message; resolve(); return; }
        }

        const chunks = [];
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

        recorder.onstop = async () => {
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          // Skip tiny blobs (silence / near-silence)
          if (blob.size < 1500) { this.activeRecorder = null; resolve(); return; }

          const formData = new FormData();
          formData.append('file', blob, 'audio.webm');
          formData.append('model', 'whisper-large-v3');
          formData.append('response_format', 'verbose_json'); // gets word-level timestamps
          formData.append('language', 'en');
          // Prompt helps Whisper understand it's a business meeting
          formData.append('prompt', 'This is a business meeting transcript. Speakers discuss work topics, tasks, decisions, and plans.');

          try {
            const res = await fetch(`${GROQ_API}/audio/transcriptions`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${key}` },
              body: formData,
            });

            if (!res.ok) { this.activeRecorder = null; resolve(); return; }

            const data = await res.json();
            const text = (data.text || '').trim();

            // Filter out filler-only transcripts (Whisper sometimes hallucinates on silence)
            const isFillerOnly = /^(\.+|thank you\.?|thanks\.?|you\.?|goodbye\.?|bye\.?)\s*$/i.test(text);
            if (text && !isFillerOnly) {
              this.transcript.push({
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                text,
                // no_speech_prob from verbose_json — skip if model is unsure
                skip: data.segments?.every(s => (s.no_speech_prob ?? 0) > 0.7),
              });
            }
          } catch (e) {
            console.error('Transcription failed:', e);
          }
          this.activeRecorder = null;
          resolve();
        };

        this.activeRecorder = recorder;
        recorder.start();
        // Stop after 25s so there's 5s buffer before next 30s interval
        setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, 25000);
      });
    },

    async stop() {
      // Stop interval first
      if (this.captureInterval) { clearInterval(this.captureInterval); this.captureInterval = null; }

      // Wait for active recorder to finish its current segment
      if (this.activeRecorder && this.activeRecorder.state === 'recording') {
        this.state = 'summarising';
        await new Promise((resolve) => {
          this.activeRecorder.addEventListener('stop', resolve, { once: true });
          this.activeRecorder.stop();
        });
        // Small buffer for the onstop async work to finish
        await new Promise(r => setTimeout(r, 900));
      }

      if (this.micStream) { this.micStream.getTracks().forEach(t => t.stop()); this.micStream = null; }

      this.sessionDate = new Date().toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });

      // Filter out high-no-speech segments
      const usableTranscript = this.transcript.filter(t => !t.skip);

      if (!usableTranscript.length) {
        this.state   = 'done';
        this.summary = 'No speech was detected in this session.';
        return;
      }

      this.state = 'summarising';
      const key = import.meta.env.VITE_GROQ_API_KEY;
      const { systemPrompt, userPrompt } = buildPrompt(this.roomTitle, usableTranscript);

      try {
        const res = await fetch(`${GROQ_API}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            max_tokens: 512,       // tighter limit → forces brevity
            temperature: 0.3,      // lower = more factual, less creative
            top_p: 0.9,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user',   content: userPrompt   },
            ],
          }),
        });

        if (!res.ok) throw new Error(`Groq API error: ${res.status}`);
        const data = await res.json();
        this.summary = (data.choices?.[0]?.message?.content || '').trim() || 'Could not generate notes.';
        this.state   = 'done';
      } catch (e) {
        console.error('Notes generation error:', e);
        this.error   = 'Could not generate notes: ' + e.message;
        this.state   = 'done';
        this.summary = '';
      }
    },

    async download() {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import(
        'https://esm.sh/docx@8.5.0'
      );
      const children = [];

      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun(`${this.roomTitle} — Notes`)],
      }));
      children.push(new Paragraph({
        children: [new TextRun({ text: this.sessionDate, italics: true })],
      }));
      children.push(new Paragraph({ children: [new TextRun('')] }));

      this.summary.split('\n').forEach(line => {
        const clean = line.replace(/\*\*/g, '').trim();
        if (!clean) return;
        const isBullet = /^[-•*]\s+/.test(line);
        children.push(new Paragraph({
          bullet: isBullet ? { level: 0 } : undefined,
          children: [new TextRun(clean.replace(/^[-•*]\s+/, ''))],
        }));
      });

      if (this.transcript.length) {
        children.push(new Paragraph({ children: [new TextRun('')] }));
        children.push(new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun('Full Transcript')],
        }));
        this.transcript.filter(t => !t.skip).forEach(t => {
          children.push(new Paragraph({
            children: [
              new TextRun({ text: `[${t.time}]  `, bold: true }),
              new TextRun(t.text),
            ],
          }));
        });
      }

      const doc    = new Document({ sections: [{ children }] });
      const blob   = await Packer.toBlob(doc);
      const link   = document.createElement('a');
      link.href    = URL.createObjectURL(blob);
      link.download = `notes-${Date.now()}.docx`;
      link.click();
      URL.revokeObjectURL(link.href);
    },

    reset() {
      this.state      = 'idle';
      this.transcript = [];
      this.summary    = '';
      this.error      = '';
      this.activeRecorder = null;
    },
  },
};
</script>

<style scoped>
/* ── Root ── */
#notes-panel {
  width: 100%;
  max-height: calc(100vh - 80px);
  display: flex;
  flex-direction: column;
  background: #0f0f11;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.08);
  color: #f0f0f2;
  font-family: 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  overflow: hidden;
}

/* ── Header ── */
.notes-header {
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  flex-shrink: 0;
  background: rgba(255,255,255,0.03);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #5b6cf8, #8b5cf6);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.header-title {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: #f0f0f2;
}

.pulse-badge {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #ef4444;
  background: rgba(239,68,68,0.12);
  border: 1px solid rgba(239,68,68,0.25);
  border-radius: 4px;
  padding: 2px 6px;
  animation: badgePulse 2s ease-in-out infinite;
}

@keyframes badgePulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.5; }
}

.close-btn {
  width: 24px; height: 24px;
  background: transparent; border: none; border-radius: 6px;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.4);
  transition: background 0.15s, color 0.15s;
}
.close-btn:hover { background: rgba(255,255,255,0.08); color: #f0f0f2; }

/* ── Body ── */
.notes-body {
  flex: 1; overflow-y: auto; padding: 10px 12px;
  display: flex; flex-direction: column; gap: 10px;
}

/* ── Idle ── */
.state-idle { display: flex; flex-direction: column; gap: 8px; }

.idle-row { display: flex; align-items: center; gap: 10px; }

.idle-mic-icon {
  width: 36px; height: 36px; flex-shrink: 0;
  background: rgba(91,108,248,0.1);
  border: 1px solid rgba(91,108,248,0.2);
  border-radius: 10px; display: flex;
  align-items: center; justify-content: center; color: #8b9cf8;
}

.idle-text { display: flex; flex-direction: column; gap: 2px; }

.idle-title { font-size: 13px; font-weight: 600; color: #f0f0f2; margin: 0; }
.idle-desc  { font-size: 11px; color: rgba(255,255,255,0.4); line-height: 1.4; margin: 0; }

/* ── Recording ── */
.state-recording { display: flex; flex-direction: column; gap: 10px; }

.recording-status { display: flex; align-items: center; gap: 8px; }

.rec-dot {
  width: 8px; height: 8px; border-radius: 50%; background: #ef4444;
  box-shadow: 0 0 0 0 rgba(239,68,68,0.5);
  animation: ripple 1.4s ease-out infinite; flex-shrink: 0;
}

@keyframes ripple {
  0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
  70%  { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
  100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
}

.rec-label { font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.7); }

.seg-pill {
  margin-left: auto;
  font-size: 10px; font-weight: 600;
  background: rgba(91,108,248,0.15);
  color: #a5b4fc;
  border: 1px solid rgba(91,108,248,0.2);
  border-radius: 20px;
  padding: 2px 8px;
}

.wave-idle {
  font-size: 12px; color: rgba(255,255,255,0.3);
  text-align: center; padding: 6px 0; font-style: italic;
}

.latest-preview {
  padding: 10px 12px;
  background: rgba(91,108,248,0.07);
  border: 1px solid rgba(91,108,248,0.15);
  border-radius: 10px;
}

.preview-label {
  font-size: 10px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.08em; color: rgba(165,180,252,0.6); margin-bottom: 4px;
}

.preview-text {
  font-size: 12px; color: rgba(255,255,255,0.6); line-height: 1.5;
  display: -webkit-box; -webkit-line-clamp: 3;
  -webkit-box-orient: vertical; overflow: hidden;
}

/* ── Summarising ── */
.state-summarising {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 12px; padding: 16px 0;
}

.gen-loader { display: flex; align-items: flex-end; gap: 5px; height: 28px; }

.gen-bar {
  width: 5px; border-radius: 3px;
  background: linear-gradient(180deg, #818cf8, #5b6cf8);
  animation: barBounce 0.9s ease-in-out infinite alternate;
}
.gen-bar:nth-child(1) { height: 12px; }
.gen-bar:nth-child(2) { height: 20px; }
.gen-bar:nth-child(3) { height: 26px; }
.gen-bar:nth-child(4) { height: 20px; }
.gen-bar:nth-child(5) { height: 12px; }

@keyframes barBounce { to { height: 6px; opacity: 0.4; } }

.gen-text { font-size: 12px; color: rgba(255,255,255,0.4); margin: 0; font-style: italic; }

/* ── Done ── */
.state-done { display: flex; flex-direction: column; gap: 10px; }

.notes-output {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 10px; overflow: hidden;
}

.output-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.02);
}

.output-label {
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.08em; color: rgba(165,180,252,0.7);
}

.output-time { font-size: 10px; color: rgba(255,255,255,0.25); }

.notes-content {
  padding: 12px; max-height: 260px; overflow-y: auto;
  font-size: 12.5px; line-height: 1.75; color: rgba(255,255,255,0.82);
}

.notes-content :deep(p)  { margin: 0 0 8px; }
.notes-content :deep(p:last-child) { margin-bottom: 0; }
.notes-content :deep(ul),
.notes-content :deep(ol) { margin: 4px 0 10px; padding-left: 18px; }
.notes-content :deep(li) { margin-bottom: 5px; color: rgba(255,255,255,0.75); }
.notes-content :deep(h3) {
  font-size: 12px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.07em; color: rgba(165,180,252,0.8);
  margin: 12px 0 5px; border-bottom: 1px solid rgba(255,255,255,0.06);
  padding-bottom: 4px;
}
.notes-content :deep(h4) {
  font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.06em; color: rgba(165,180,252,0.6);
  margin: 10px 0 4px;
}
.notes-content :deep(strong) { font-weight: 700; color: rgba(255,255,255,0.95); }
.notes-content :deep(em)     { font-style: italic; color: rgba(255,255,255,0.7); }
.notes-content :deep(code)   {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 11px; background: rgba(255,255,255,0.08);
  border-radius: 3px; padding: 1px 4px; color: #a5f3fc;
}

/* ── Actions ── */
.done-actions { display: flex; gap: 6px; }

/* ── Shared Buttons ── */
.btn-primary, .btn-stop, .btn-download {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  width: 100%; border: none; border-radius: 8px;
  font-size: 13px; font-weight: 600; cursor: pointer;
  transition: opacity 0.2s, transform 0.15s;
  padding: 9px 14px;
}

.btn-primary  { background: linear-gradient(135deg, #5b6cf8, #8b5cf6); color: white; }
.btn-stop     { background: rgba(239,68,68,0.12); color: #f87171; border: 1px solid rgba(239,68,68,0.2); }
.btn-download {
  flex: 1; background: rgba(91,108,248,0.12); color: #a5b4fc;
  border: 1px solid rgba(91,108,248,0.2); padding: 8px 12px; font-size: 12px;
}

.btn-primary:hover, .btn-stop:hover, .btn-download:hover  { opacity: 0.85; transform: translateY(-1px); }
.btn-primary:active, .btn-stop:active, .btn-download:active { transform: scale(0.98); }

.btn-ghost {
  padding: 8px 12px; background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.45); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px; font-size: 12px; font-weight: 500;
  cursor: pointer; white-space: nowrap;
  transition: background 0.15s, color 0.15s;
}
.btn-ghost:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.7); }

/* ── Error ── */
.notes-error {
  display: flex; align-items: flex-start; gap: 8px;
  background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.18);
  border-radius: 8px; padding: 8px 10px;
  font-size: 12px; color: #f87171; line-height: 1.5;
}
.notes-error svg { flex-shrink: 0; margin-top: 1px; }

/* ── Scrollbar ── */
.notes-body::-webkit-scrollbar,
.notes-content::-webkit-scrollbar         { width: 4px; }
.notes-body::-webkit-scrollbar-track,
.notes-content::-webkit-scrollbar-track  { background: transparent; }
.notes-body::-webkit-scrollbar-thumb,
.notes-content::-webkit-scrollbar-thumb  { background: rgba(255,255,255,0.1); border-radius: 4px; }
</style>
