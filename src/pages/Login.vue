<template>
  <transition name="fade">
    <div id="container" v-if="show">

      <!-- Left Panel -->
      <div id="leftbox">
        <div class="brand">
          <div class="brand-icon">◈</div>
          <span class="brand-name">CoreTalk</span>
        </div>

        <transition name="panel-swap" mode="out-in">
          <div class="panel-content" v-if="welcomeText" key="welcome">
            <h1>Meetings that <em>actually</em> work.</h1>
            <p>Secure, lightweight, and built for teams who need real access control — not a random link anyone can bomb.</p>
            <div class="feature-chips">
              <span>Auto-closing trays while inactive.</span>
              <span>Wider video feed.</span>
              <span>Messaging among members.</span>
              <span>Lightweight and reliable application.</span>
            </div>
          </div>
          <div class="panel-content" v-else key="updates">
            <div class="updates-label">What's new in v2</div>
            <ul class="update-list">
              <li>Auto-closing trays while inactive</li>
              <li>Wider, cleaner video feed</li>
              <li>Lightweight & reliable architecture</li>
              <li>User customization allowed</li>
            </ul>
          </div>
        </transition>

        <div class="left-footer">
          <span v-for="i in 3" :key="i" class="dot" :class="{ active: (welcomeText ? 0 : 1) === i - 1 }"></span>
        </div>
      </div>

      <!-- Right Panel -->
      <div id="rightbox">
        <div id="card">
          <div class="card-header">
            <h2>Welcome back</h2>
            <p>Sign in to your CoreTalk account</p>
          </div>

          <!-- Google Button -->
          <button type="button" @click="signInWithGoogle" class="google-btn" :disabled="googleLoading">
            <span v-if="!googleLoading">
              <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </span>
            <span v-else class="btn-spinner"></span>
          </button>

          <div class="divider"><span>or sign in with email</span></div>

          <!-- Email Form -->
          <form @submit.prevent="loginuser" autocomplete="on">
            <div class="field-group">
              <label>Email</label>
              <input
                v-model="email"
                @keypress="erase"
                type="email"
                placeholder="you@example.com"
                autocomplete="email"
              />
            </div>
            <div class="field-group">
              <label>Password</label>
              <div class="password-wrap">
                <input
                  v-model="password"
                  @keypress="erase"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="••••••••"
                  autocomplete="current-password"
                />
                <button type="button" class="eye-btn" @click="showPassword = !showPassword" tabindex="-1">
                  {{ showPassword ? 'OFF' : 'ON' }}
                </button>
              </div>
            </div>

            <transition name="err">
              <div v-if="message" class="error-box">⚠ {{ message }}</div>
            </transition>

            <button type="submit" class="submit-btn" :disabled="loading">
              <span v-if="!loading">Sign In</span>
              <span v-else class="btn-spinner"></span>
            </button>
          </form>

          <div class="card-footer">
            <router-link to="/Forget">Forgot password?</router-link>
            <span class="sep">·</span>
            <router-link to="/Registration">Create account</router-link>
          </div>
        </div>
      </div>

    </div>
  </transition>
</template>

<script>
export default {
  name: 'Login',
  data() {
    return {
      email: '',
      password: '',
      message: '',
      show: false,
      welcomeText: true,
      loading: false,
      googleLoading: false,
      showPassword: false,
    };
  },

  mounted() {
    this.show = true;
    this.interval = setInterval(() => {
      this.welcomeText = !this.welcomeText;
    }, 8000);

    // Handle error coming back from OAuth redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get('error')) {
      this.message = 'Google sign-in was cancelled or failed. Please try again.';
    }
  },

  beforeUnmount() {
    clearInterval(this.interval);
  },

  methods: {
    signInWithGoogle() {
      this.googleLoading = true;
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const redirectUri = encodeURIComponent(
        `${import.meta.env.VITE_API_URL}/api/auth/google/callback`
      );
      const scope = encodeURIComponent('openid email profile');

      // Full page redirect — no popup, no postMessage, no COOP issues
      window.location.href =
        `https://accounts.google.com/o/oauth2/v2/auth` +
        `?client_id=${clientId}` +
        `&redirect_uri=${redirectUri}` +
        `&response_type=code` +
        `&scope=${scope}` +
        `&access_type=offline` +
        `&prompt=select_account`;
    },

    async loginuser() {
      if (!this.email || !this.password) {
        this.message = 'Please fill in all fields.';
        return;
      }
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!regex.test(this.email)) {
        this.message = 'Please enter a valid email address.';
        return;
      }
      if (this.password.length < 6) {
        this.message = 'Password must be at least 6 characters.';
        return;
      }

      this.loading = true;
      try {
        const res = await this.$axios.post(
          `${import.meta.env.VITE_API_URL}/api/auth/login`,
          { email: this.email, password: this.password }
        );

        localStorage.setItem('token', res.data.token);
        localStorage.setItem('username', res.data.user.name || this.email);

        if (res.data.user.isAdmin) {
          localStorage.setItem('isAdmin', 'true');
        } else {
          localStorage.removeItem('isAdmin');
        }

        this.$router.push('/Schedule');
      } catch (err) {
        console.error('Login error', err);
        this.message = err.response?.data?.msg || 'Incorrect email or password.';
      } finally {
        this.loading = false;
      }
    },

    erase() {
      this.message = '';
    },
  },
};
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --navy: #0f1f3d;
  --navy-mid: #162947;
  --navy-light: #1e3a8a;
  --accent: #3b82f6;
  --accent-glow: rgba(59, 130, 246, 0.25);
  --white: #ffffff;
  --off-white: #f0f4ff;
  --text-muted: #94a3b8;
  --border: rgba(255,255,255,0.08);
  --card-bg: #ffffff;
  --error: #ef4444;
}

body {
  font-family: 'Sora', sans-serif;
  background: var(--navy);
  overflow-x: hidden;
}

/* ── LAYOUT ── */
#container {
  display: flex;
  min-height: 100vh;
  width: 100%;
}

/* ── LEFT PANEL ── */
#leftbox {
  flex: 0 0 55%;
  background: var(--navy);
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 48px 56px;
  overflow: hidden;
}

/* Decorative background mesh */
#leftbox::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 60% 50% at 20% 30%, rgba(59,130,246,0.18) 0%, transparent 70%),
    radial-gradient(ellipse 40% 60% at 80% 70%, rgba(99,102,241,0.12) 0%, transparent 70%);
  pointer-events: none;
}

/* Grid lines */
#leftbox::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 48px 48px;
  pointer-events: none;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  position: relative;
  z-index: 1;
}

.brand-icon {
  font-size: 28px;
  color: var(--accent);
  line-height: 1;
}

.brand-name {
  font-family: 'DM Serif Display', serif;
  font-size: 22px;
  color: var(--white);
  letter-spacing: 0.02em;
}

.panel-content {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 40px 0;
}

.panel-content h1 {
  font-family: 'DM Serif Display', serif;
  font-size: clamp(2rem, 3.5vw, 3rem);
  color: var(--white);
  line-height: 1.2;
  margin-bottom: 20px;
  font-weight: 400;
}

.panel-content h1 em {
  font-style: italic;
  color: var(--accent);
}

.panel-content p {
  font-size: clamp(0.9rem, 1.2vw, 1.05rem);
  color: var(--text-muted);
  line-height: 1.7;
  max-width: 420px;
  margin-bottom: 32px;
}

.feature-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.feature-chips span {
  background: rgba(59,130,246,0.12);
  border: 1px solid rgba(59,130,246,0.25);
  color: #93c5fd;
  padding: 6px 14px;
  border-radius: 100px;
  font-size: 0.82rem;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.updates-label {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--accent);
  font-weight: 600;
  margin-bottom: 24px;
}

.update-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.update-list li {
  color: var(--text-muted);
  font-size: 1rem;
  padding-left: 20px;
  position: relative;
  line-height: 1.5;
}

.update-list li::before {
  content: '→';
  position: absolute;
  left: 0;
  color: var(--accent);
  font-weight: 600;
}

.left-footer {
  display: flex;
  gap: 8px;
  position: relative;
  z-index: 1;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  transition: all 0.4s ease;
}

.dot.active {
  background: var(--accent);
  width: 20px;
  border-radius: 3px;
}

/* ── RIGHT PANEL ── */
#rightbox {
  flex: 0 0 45%;
  background: var(--off-white);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 32px;
}

#card {
  width: 100%;
  max-width: 400px;
  background: var(--card-bg);
  border-radius: 20px;
  padding: 40px 36px;
  box-shadow:
    0 0 0 1px rgba(0,0,0,0.06),
    0 4px 24px rgba(0,0,0,0.08),
    0 1px 2px rgba(0,0,0,0.04);
}

.card-header {
  margin-bottom: 28px;
}

.card-header h2 {
  font-family: 'DM Serif Display', serif;
  font-size: 1.75rem;
  color: var(--navy);
  font-weight: 400;
  margin-bottom: 6px;
}

.card-header p {
  font-size: 0.9rem;
  color: #64748b;
}

/* Google Button */
.google-btn {
  width: 100%;
  padding: 13px 16px;
  background: white;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-family: 'Sora', sans-serif;
  font-size: 0.92rem;
  font-weight: 500;
  color: #1e293b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  margin-bottom: 20px;
}

.google-btn:hover:not(:disabled) {
  border-color: #cbd5e1;
  background: #f8fafc;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transform: translateY(-1px);
}

.google-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.google-btn span {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Divider */
.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e2e8f0;
}

.divider span {
  font-size: 0.78rem;
  color: #94a3b8;
  white-space: nowrap;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* Fields */
.field-group {
  margin-bottom: 16px;
}

.field-group label {
  display: block;
  font-size: 0.82rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
  letter-spacing: 0.01em;
}

.field-group input {
  width: 100%;
  padding: 12px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 9px;
  font-family: 'Sora', sans-serif;
  font-size: 0.92rem;
  color: #0f172a;
  background: #f8fafc;
  transition: all 0.2s ease;
  outline: none;
}

.field-group input::placeholder {
  color: #cbd5e1;
}

.field-group input:focus {
  border-color: var(--accent);
  background: white;
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.password-wrap {
  position: relative;
}

.password-wrap input {
  padding-right: 44px;
}

.eye-btn {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 4px;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.eye-btn:hover {
  opacity: 1;
}

/* Error */
.error-box {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: var(--error);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 0.84rem;
  margin-bottom: 16px;
  font-weight: 500;
}

/* Submit Button */
.submit-btn {
  width: 100%;
  padding: 13px;
  background: var(--navy);
  color: white;
  border: none;
  border-radius: 10px;
  font-family: 'Sora', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 4px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  letter-spacing: 0.01em;
}

.submit-btn:hover:not(:disabled) {
  background: var(--navy-light);
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(15,31,61,0.25);
}

.submit-btn:active:not(:disabled) {
  transform: translateY(0);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Spinner */
.btn-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  display: inline-block;
}

.google-btn .btn-spinner {
  border-color: rgba(0,0,0,0.15);
  border-top-color: #1e293b;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Card Footer */
.card-footer {
  margin-top: 24px;
  text-align: center;
  font-size: 0.85rem;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.card-footer a {
  color: var(--navy-light);
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s;
}

.card-footer a:hover {
  color: var(--accent);
}

.sep {
  color: #cbd5e1;
}

/* ── TRANSITIONS ── */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.panel-swap-enter-active,
.panel-swap-leave-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}
.panel-swap-enter-from {
  opacity: 0;
  transform: translateY(16px);
}
.panel-swap-leave-to {
  opacity: 0;
  transform: translateY(-16px);
}

.err-enter-active,
.err-leave-active {
  transition: all 0.25s ease;
}
.err-enter-from,
.err-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ── RESPONSIVE ── */
@media (max-width: 1024px) {
  #container {
    flex-direction: column;
  }

  #leftbox {
    flex: 0 0 auto;
    width: 100%;
    min-height: 260px;
    padding: 36px 32px;
  }

  .panel-content {
    padding: 20px 0;
  }

  #rightbox {
    flex: 0 0 auto;
    width: 100%;
    padding: 40px 24px 60px;
  }
}

@media (max-width: 480px) {
  #leftbox {
    padding: 28px 24px;
    min-height: 220px;
  }

  .panel-content h1 {
    font-size: 1.6rem;
  }

  #card {
    padding: 32px 24px;
    border-radius: 16px;
  }

  .card-header h2 {
    font-size: 1.5rem;
  }
}
</style>
