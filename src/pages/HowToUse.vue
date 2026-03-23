<template>
  <div id="ht-wrap">
    <div id="ht-left">
      <div id="ht-icon">{{ currentStep.icon }}</div>
      <h1>{{ currentStep.leftTitle }}</h1>
      <p>{{ currentStep.leftDesc }}</p>
      <div id="ht-dots">
        <span
          v-for="(s, i) in steps"
          :key="i"
          :class="['ht-dot', { active: i === current }]"
        ></span>
      </div>
    </div>

    <div id="ht-right">
      <div id="ht-card">
        <div id="ht-img">
          <!-- Replace each src with your actual screenshots -->
          <img :src="currentStep.img" :alt="currentStep.cardTitle" />
        </div>
        <h2>{{ currentStep.cardTitle }}</h2>
        <div class="ht-tip">{{ currentStep.tip }}</div>
        <p>{{ currentStep.cardDesc }}</p>
        <div id="ht-btn-row">
          <button class="ht-btn ht-prev" :disabled="current === 0" @click="prev">← Back</button>
          <span id="ht-counter">{{ current + 1 }} / {{ steps.length }}</span>
          <button class="ht-btn ht-next" :disabled="current === steps.length - 1" @click="next">
            {{ current === steps.length - 1 ? 'Done ✓' : 'Next →' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HowToUse',
  data() {
    return {
      current: 0,
      steps: [
        {
          icon: '📝',
          leftTitle: 'Create your account',
          leftDesc: 'Sign up with your email or use Google login to get started in seconds.',
          cardTitle: 'Step 1 — Register or login',
          tip: 'Use a real email address — disposable emails are not allowed.',
          cardDesc: 'Click "Create a new one" on the login page to register. Fill in your name, email and password. You can also sign in instantly using your Google account.',
          img: '/screenshots/step1.png'
        },
        {
          icon: '📅',
          leftTitle: 'Schedule a meeting',
          leftDesc: 'Create a new meeting room and invite others by sharing the meeting link.',
          cardTitle: 'Step 2 — Schedule page',
          tip: 'After login you land on the Schedule page — this is your home base.',
          cardDesc: 'Click "New Meeting" to create a room instantly. Copy the meeting link and share it with participants. Use "Gmail Enact" to send invites directly from the app.',
          img: '/screenshots/step2.png'
        },
        {
          icon: '🎥',
          leftTitle: 'Join the meeting room',
          leftDesc: 'Your camera and microphone will activate when you enter the room.',
          cardTitle: 'Step 3 — Joining a meeting',
          tip: 'Allow camera and microphone access when the browser asks for permission.',
          cardDesc: 'Click "Join" on your scheduled meeting or paste a meeting link in the browser. You will see yourself in the video grid. Other participants appear automatically when they join.',
          img: '/screenshots/step3.png'
        },
        {
          icon: '🎛️',
          leftTitle: 'Control your meeting',
          leftDesc: 'Use the bottom controls to manage your audio, video and screen sharing.',
          cardTitle: 'Step 4 — Meeting controls',
          tip: 'Host controls like Mute All and End Meeting are only visible to the host.',
          cardDesc: 'Toggle your mic and camera using the control buttons. Click Share Screen to present. Raise your hand notifies the host without interrupting. Host can mute all, lock the meeting or end it for everyone.',
          img: '/screenshots/step4.png'
        },
        {
          icon: '✨',
          leftTitle: 'Extra features',
          leftDesc: 'Use the side panel for noise suppression, captions, recording and more.',
          cardTitle: 'Step 5 — Side panel features',
          tip: 'Click "Change Panel" to move the tray from left to right side.',
          cardDesc: 'Open the left tray to access Silent Background (noise suppression), Start Recording, Fullscreen mode and Gmail Enact. Live Captions show a real-time transcript of what is being said.',
          img: '/screenshots/step5.png'
        },
        {
          icon: '💬',
          leftTitle: 'Chat and wrap up',
          leftDesc: 'Use live chat during the meeting. A summary page appears when you leave.',
          cardTitle: 'Step 6 — Chat and ending',
          tip: 'Only the host can end the meeting for everyone. Others can leave individually.',
          cardDesc: 'Click the chat icon to open the live chat panel. Type messages visible to all participants. When the meeting ends you are taken to the Ending page where you can leave a review.',
          img: '/screenshots/step6.png'
        }
      ]
    };
  },
  computed: {
    currentStep() {
      return this.steps[this.current];
    }
  },
  methods: {
    next() { if (this.current < this.steps.length - 1) this.current++; },
    prev() { if (this.current > 0) this.current--; }
  }
};
</script>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; }

#ht-wrap {
  display: flex;
  min-height: 100vh;
  width: 100%;
  font-family: helvetica, sans-serif;
}

#ht-left {
  flex: 0 0 60%;
  background-color: #1e3a8a;
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 60px 40px;
  text-align: center;
}

#ht-icon { font-size: 3rem; margin-bottom: 20px; }

#ht-left h1 {
  font-size: clamp(1.5rem, 3vw, 2.2rem);
  font-weight: 600;
  margin-bottom: 15px;
}

#ht-left p {
  font-size: clamp(0.9rem, 1.4vw, 1rem);
  line-height: 1.6;
  opacity: 0.9;
  max-width: 400px;
}

#ht-dots { display: flex; gap: 8px; margin-top: 30px; }

.ht-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  background: rgba(255,255,255,0.3);
  transition: background 0.3s;
}
.ht-dot.active { background: white; }

#ht-right {
  flex: 0 0 40%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 40px 30px;
  background-color: #f8f9fa;
}

#ht-card {
  width: 100%;
  max-width: 420px;
  background: white;
  padding: 35px 30px;
  border-radius: 12px;
  box-shadow: 0 2px 15px rgba(0,0,0,0.08);
}

#ht-img {
  width: 100%;
  height: 160px;
  border-radius: 8px;
  background: #e8f0fe;
  border: 1.5px solid #c7d7f7;
  margin-bottom: 20px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

#ht-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}

#ht-card h2 {
  font-size: 1.05rem;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 10px;
}

.ht-tip {
  background: #f0f5ff;
  border-left: 3px solid #1e3a8a;
  border-radius: 4px;
  padding: 10px 14px;
  font-size: 0.83rem;
  color: #444;
  margin-bottom: 14px;
  line-height: 1.5;
}

#ht-card p {
  font-size: 0.9rem;
  color: #666;
  line-height: 1.6;
  margin-bottom: 20px;
}

#ht-btn-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ht-btn {
  padding: 11px 22px;
  border-radius: 8px;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.ht-prev { background: #f0f0f0; color: #444; }
.ht-prev:hover { background: #e0e0e0; }
.ht-next { background: #1a1a1a; color: white; }
.ht-next:hover { background: #333; }
.ht-btn:disabled { opacity: 0.35; cursor: not-allowed; }

#ht-counter { font-size: 0.85rem; color: #999; }

@media (max-width: 1024px) {
  #ht-wrap { flex-direction: column; }
  #ht-left { flex: 0 0 auto; width: 100%; min-height: 260px; padding: 40px 30px; }
  #ht-right { flex: 0 0 auto; width: 100%; padding: 40px 20px; }
}
</style>
