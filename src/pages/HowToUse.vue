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
          @click="current = i"
        ></span>
      </div>
    </div>

    <div id="ht-right">
      <div id="ht-card">

        <!-- Screenshot / Image area -->
        <div id="ht-img">
          <img v-if="currentStep.img" :src="currentStep.img" :alt="currentStep.cardTitle" />
          <div v-else class="ht-img-placeholder">
            <span>{{ currentStep.icon }}</span>
          </div>
        </div>

        <!-- Badges / tags -->
        <div v-if="currentStep.tags && currentStep.tags.length" class="ht-tags">
          <span v-for="tag in currentStep.tags" :key="tag" class="ht-tag">{{ tag }}</span>
        </div>

        <h2>{{ currentStep.cardTitle }}</h2>

        <!-- Tip box -->
        <div class="ht-tip">💡 {{ currentStep.tip }}</div>

        <!-- Main description -->
        <p>{{ currentStep.cardDesc }}</p>

        <!-- Optional bullet list -->
        <ul v-if="currentStep.bullets && currentStep.bullets.length" class="ht-bullets">
          <li v-for="b in currentStep.bullets" :key="b">{{ b }}</li>
        </ul>

        <!-- Navigation -->
        <div id="ht-btn-row">
          <button class="ht-btn ht-prev" :disabled="current === 0" @click="prev">← Back</button>
          <span id="ht-counter">{{ current + 1 }} / {{ steps.length }}</span>
          <button
            class="ht-btn ht-next"
            @click="current === steps.length - 1 ? $router.push('/Schedule') : next()"
          >
            {{ current === steps.length - 1 ? 'Done ✓' : 'Next →' }}
          </button>
        </div>

      </div>
    </div>
  </div>
</template>

<script>
/* ─────────────────────────────────────────────
   Paste your six base-64 screenshot strings
   into the `img` fields below.
   ───────────────────────────────────────────── */

// Tiny helper so we can keep the data readable
const IMG = {
  login:    'YOUR_LOGIN_SCREENSHOT_BASE64',    // Image 1  – Login / Register page
  schedule: 'YOUR_SCHEDULE_SCREENSHOT_BASE64', // Image 2  – Schedule home (Enter / Create)
  create:   'YOUR_CREATE_SCREENSHOT_BASE64',   // Image 3  – Title input appears
  title:    'YOUR_TITLE_SCREENSHOT_BASE64',    // Image 4  – Title filled in
  meetInfo: 'YOUR_MEETINFO_SCREENSHOT_BASE64', // Image 5  – Meeting Info modal
  ending:   'YOUR_ENDING_SCREENSHOT_BASE64',   // Image 6  – Ending / review page
};

export default {
  name: 'HowToUse',
  data() {
    return {
      current: 0,
      steps: [

        /* ── STEP 1 ── Login / Register / Guest ──────────────────── */
        {
          icon: '🔐',
          leftTitle: 'Sign In or Join as Guest',
          leftDesc:
            'Create a free account, log in with an existing one, or jump straight in as a guest — no registration required.',
          cardTitle: 'Step 1 — Login & Registration',
          tags: ['Registered Users', 'Guest Access'],
          tip: 'Guest users get a temporary username and can only join existing meetings — they cannot create rooms or use Gmail Enact.',
          cardDesc:
            'On the login page you have three paths: enter your email + password and click "Login Now"; sign in with Google; or click "Continue as Guest" to enter without an account. New users click "Create a new one" to register — it\'s free and takes under a minute. Forgotten your password? Use the "Forget Password: Click here" link at the bottom.',
          bullets: [
            '📧 Registered account — full access to all features',
            '👤 Guest — temporary username, join-only (no room creation, no Gmail Enact)',
            '🔑 Forgot password — reset link sent to your email',
          ],
          img: IMG.login,
        },

        /* ── STEP 2 ── Schedule / Home page ──────────────────────── */
        {
          icon: '📅',
          leftTitle: 'Schedule Page — Your Home Base',
          leftDesc:
            'After login you land on the Schedule page. Join a meeting by pasting a Room ID, or create your own room.',
          cardTitle: 'Step 2 — Schedule / Home Page',
          tags: ['Join Meeting', 'Create Room'],
          tip: 'Room IDs look like: 7683716f-154a-446d-873e-235674296036. Paste the full ID shared by the host.',
          cardDesc:
            'The Schedule page is your starting point after every login. From here you can either join a meeting someone shared with you or spin up a brand-new room. Guest users land here too, but the "Create your room" flow is disabled for them — they can only join existing rooms.',
          bullets: [
            '➡️ Paste a Room ID → click "Enter" to join',
            '➕ Click "Create your room" to start a new meeting',
            '⚙️ Registered users can also open Settings (gear icon, top-right)',
          ],
          img: IMG.schedule,
        },

        /* ── STEP 3 ── Creating a new room ───────────────────────── */
        {
          icon: '🏠',
          leftTitle: 'Create Your Meeting Room',
          leftDesc:
            'Click "Create your room" and a title input appears. Give your meeting a name, then hit the button again to launch.',
          cardTitle: 'Step 3 — Naming & Creating a Room',
          tags: ['Registered Users Only'],
          tip: 'Guests cannot create rooms. If the title field is empty and you click "Enter", a red "Enter the Room Title" prompt will appear.',
          cardDesc:
            'When you click "Create your room" for the first time, a second input box slides in asking for a meeting title (e.g. "Meeting", "Team Standup"). Type your title and then click "Enter" (or "Create your room" again) to generate a unique Room ID and launch your meeting room. The Room ID is created automatically — no manual entry needed.',
          bullets: [
            '1️⃣ Click "Create your room" — title field appears',
            '2️⃣ Type a meeting name (e.g. "Meeting")',
            '3️⃣ Click "Enter" to launch — Room ID is auto-generated',
          ],
          img: IMG.create,
        },

        /* ── STEP 4 ── Room title filled / ready to launch ───────── */
        {
          icon: '🚀',
          leftTitle: 'Ready to Launch',
          leftDesc:
            'With the title filled in, clicking "Enter" opens your meeting room instantly.',
          cardTitle: 'Step 4 — Launching the Room',
          tags: ['Registered Users Only'],
          tip: 'Once inside you can see the full Room ID in your browser URL bar after /MeetingRoom/.',
          cardDesc:
            'With the title set (here "Meeting"), press "Enter" to create and enter the room. CoreTalk generates a unique UUID-style Room ID for your session. Share that ID with anyone you want to invite — they paste it in the first input on the Schedule page and click "Enter" to join.',
          bullets: [
            '🌐 Room URL: /MeetingRoom/your-room-id',
            '📋 Copy the Room ID from the URL and send to participants',
            '🔗 Or use the "Meeting Info" button inside the room to copy a link',
          ],
          img: IMG.title,
        },

        /* ── STEP 5 ── Meeting Info & sharing link ────────────────── */
        {
          icon: '🔗',
          leftTitle: 'Share the Meeting Link',
          leftDesc:
            'Inside the meeting room, open "Meeting Info" to see the Room ID and copy a shareable link with one click.',
          cardTitle: 'Step 5 — Meeting Info & Controls',
          tags: ['All Users'],
          tip: 'Guests and registered users can both share the Room ID — just copy from the Meeting Info modal or from the browser URL bar.',
          cardDesc:
            'The Meeting Info panel shows: the Meeting Title, the full Room ID, and the current participant count. Click "Copy Meeting Link" to put the join-link on your clipboard. Share it via chat, email, or any messaging app. Recipients paste the Room ID into the Schedule page → Enter to join instantly.',
          bullets: [
            '🎛️ Controls: Mic, Camera, Screen Share, Raise Hand',
            '💬 Chat panel — live messages visible to all participants',
            '📝 Live Captions — real-time transcript overlay',
            '🔇 Mute All / ⛔ End Meeting — host-only controls',
            '🖥️ Left tray: Silent Background, Recording, Fullscreen, Gmail Enact*',
            '*Gmail Enact not available to guest users',
          ],
          img: IMG.meetInfo,
        },

        /* ── STEP 6 ── Ending page / feedback ────────────────────── */
        {
          icon: '🏁',
          leftTitle: 'Wrap Up & Leave Feedback',
          leftDesc:
            'When the meeting ends you land on the Ending page. Leave a review (optional) then return to Schedule or log out.',
          cardTitle: 'Step 6 — Ending Page & Review',
          tags: ['All Users'],
          tip: 'Only the host can "End Meeting" for everyone. Other participants click "Leave" to exit individually.',
          cardDesc:
            'After leaving or ending a meeting, CoreTalk takes you to the Ending page. You\'ll see "Your meeting is over" with two buttons: "Return to Schedule" (to join or create another session) and "Log Out". Below that is an optional review box — type any feedback or issue you experienced and click "Submit". Your review helps improve the platform.',
          bullets: [
            '⭐ Review is optional — skip if you prefer',
            '🔄 "Return to Schedule" — start or join another meeting',
            '🚪 "Log Out" — end your session completely',
          ],
          img: IMG.ending,
        },

      ],
    };
  },

  computed: {
    currentStep() {
      return this.steps[this.current];
    },
  },

  methods: {
    next() {
      if (this.current < this.steps.length - 1) this.current++;
    },
    prev() {
      if (this.current > 0) this.current--;
    },
  },
};
</script>

<style>
/* ── Reset ─────────────────────────────────────────────────────────── */
* { box-sizing: border-box; margin: 0; padding: 0; }

/* ── Outer wrapper ──────────────────────────────────────────────────── */
#ht-wrap {
  display: flex;
  min-height: 100vh;
  width: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
}

/* ── LEFT PANEL ─────────────────────────────────────────────────────── */
#ht-left {
  flex: 0 0 55%;
  background-color: #1e3a8a;
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 60px 48px;
  text-align: center;
}

#ht-icon { font-size: 3rem; margin-bottom: 18px; }

#ht-left h1 {
  font-size: clamp(1.4rem, 2.6vw, 2rem);
  font-weight: 700;
  margin-bottom: 14px;
  line-height: 1.25;
}

#ht-left > p {
  font-size: clamp(0.88rem, 1.3vw, 1rem);
  line-height: 1.7;
  opacity: 0.88;
  max-width: 420px;
}

/* Dot navigation */
#ht-dots { display: flex; gap: 8px; margin-top: 32px; }
.ht-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  background: rgba(255,255,255,0.3);
  transition: background 0.25s;
  cursor: pointer;
}
.ht-dot:hover { background: rgba(255,255,255,0.6); }
.ht-dot.active { background: #fff; }

/* ── RIGHT PANEL ────────────────────────────────────────────────────── */
#ht-right {
  flex: 0 0 45%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 36px 28px;
  background-color: #f0f4fa;
  overflow-y: auto;
}

/* ── CARD ───────────────────────────────────────────────────────────── */
#ht-card {
  width: 100%;
  max-width: 440px;
  background: #fff;
  padding: 28px 26px 24px;
  border-radius: 14px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.09);
}

/* Screenshot / placeholder */
#ht-img {
  width: 100%;
  height: 200px;
  border-radius: 10px;
  background: #e8f0fe;
  border: 1.5px solid #c7d7f7;
  margin-bottom: 16px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
#ht-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 10px;
}
.ht-img-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 4rem;
  opacity: 0.35;
}

/* Tags / badges */
.ht-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}
.ht-tag {
  background: #e8f0fe;
  color: #1e3a8a;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 20px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

/* Card title */
#ht-card h2 {
  font-size: 1.02rem;
  font-weight: 700;
  color: #111;
  margin-bottom: 10px;
}

/* Tip box */
.ht-tip {
  background: #f0f5ff;
  border-left: 3px solid #1e3a8a;
  border-radius: 5px;
  padding: 10px 13px;
  font-size: 0.82rem;
  color: #374151;
  margin-bottom: 12px;
  line-height: 1.55;
}

/* Description paragraph */
#ht-card > p {
  font-size: 0.88rem;
  color: #555;
  line-height: 1.65;
  margin-bottom: 12px;
}

/* Bullet list */
.ht-bullets {
  list-style: none;
  padding: 0;
  margin-bottom: 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ht-bullets li {
  font-size: 0.83rem;
  color: #444;
  line-height: 1.5;
  padding-left: 2px;
}

/* Nav row */
#ht-btn-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 6px;
}

.ht-btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: background 0.18s, opacity 0.18s;
}
.ht-prev { background: #e9ecef; color: #333; }
.ht-prev:hover:not(:disabled) { background: #d5d9de; }
.ht-next { background: #1a1a2e; color: #fff; }
.ht-next:hover { background: #2d2d50; }
.ht-btn:disabled { opacity: 0.35; cursor: not-allowed; }

#ht-counter { font-size: 0.82rem; color: #999; }

/* ── Responsive ─────────────────────────────────────────────────────── */
@media (max-width: 960px) {
  #ht-wrap { flex-direction: column; }
  #ht-left { flex: none; width: 100%; min-height: 240px; padding: 40px 28px; }
  #ht-right { flex: none; width: 100%; padding: 36px 20px; }
}
</style>
