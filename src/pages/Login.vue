<template>
  <transition name="fade">
    <div id="container" v-if="show">
      <div id="leftbox">
        <div v-if="welcomeText">
          <h1>Welcome to CoreTalk</h1>
          <p>Take benefit of the our online meeting platform with numerous features.</p>
        </div>
        <div v-else>
          <div id="new_updates">
            <div id="updates_header">
              <h1>What's new ?</h1>
            </div>
            <ol>
              <li>Auto-closing trays while inactive.</li>
              <li>Wider video feed.</li>
              <li>Lightweight and reliable application.</li>
              <li>More security measures added.</li>
              <li>User customization allowed.</li>
            </ol>
            <p>Version v2.</p>
          </div>
        </div>
      </div>

      <div id="rightbox">

        <!-- ✅ NORMAL LOGIN FORM -->
        <form v-if="!showAdminOtp" id="info" @submit.prevent="loginuser">
          <p>Don't have an account? <router-link to="/Registration">Create a new one.</router-link></p>
          <p>It's FREE & takes less than a minute.</p>
          <input v-model="email" @keypress="erase" type="email" placeholder="Email address" :disabled="loading" />
          <input v-model="password" @keypress="erase" type="password" placeholder="Password" :disabled="loading" />
          <p v-if="message" style="color:red; font-weight:bold; padding-left:5px;">{{ message }}</p>
          <button type="submit" :disabled="loading || googleLoading">
            <span v-if="loading" class="spinner"></span>
            {{ loading ? 'Logging in...' : 'Login Now' }}
          </button>


          <button type="button" id="google-signin-button" @click="signInWithGoogle" :disabled="loading || googleLoading">
            <span v-if="googleLoading" class="spinner dark"></span>
            <img v-else src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" height="20" alt="Google" />
            {{ googleLoading ? 'Signing in...' : 'Sign in with Google' }}
          </button>

          <div class="divider"><span>OR</span></div>

          <button type="button" @click="showGuestModal = true" :disabled="loading || googleLoading">
            Continue as Guest
          </button>

          <p id="last">Forget Password <router-link to="/Forget">Click here</router-link></p>
        </form>

        <!-- ✅ ADMIN OTP SCREEN -->
        <div v-else id="info" class="otp-screen">
          <div class="otp-icon">🔐</div>
          <h2 class="otp-title">Admin Verification</h2>
          <p class="otp-subtitle">
            An OTP has been sent to<br/>
            <strong>{{ adminEmail }}</strong>
          </p>
          <p class="otp-note">Enter the 6-digit OTP to complete your admin login. It expires in 5 minutes.</p>

          <input
            v-model="adminOtp"
            @keypress="eraseOtp"
            @keyup.enter="verifyAdminOtp"
            type="text"
            inputmode="numeric"
            maxlength="6"
            placeholder="Enter OTP"
            class="otp-input"
            :disabled="otpLoading"
            autocomplete="one-time-code"
          />

          <p v-if="otpMessage" style="color:red; font-weight:bold; padding-left:5px; margin-top:8px;">
            {{ otpMessage }}
          </p>

          <button
            type="button"
            class="otp-verify-btn"
            @click="verifyAdminOtp"
            :disabled="otpLoading || adminOtp.length !== 6"
          >
            <span v-if="otpLoading" class="spinner"></span>
            {{ otpLoading ? 'Verifying...' : 'Verify & Login' }}
          </button>

          <button type="button" class="otp-back-btn" @click="cancelAdminOtp" :disabled="otpLoading">
            ← Back to Login
          </button>
        </div>

      </div>
    </div>

    <!-- Guest name modal -->
<div v-if="showGuestModal" style="
  position:fixed;inset:0;background:rgba(0,0,0,0.45);
  display:flex;align-items:center;justify-content:center;z-index:200;">
  <div style="background:white;border-radius:12px;padding:32px;width:320px;text-align:center;">
    <h3 style="margin:0 0 8px;color:#1e3a8a;">Join as Guest</h3>
    <p style="font-size:0.9rem;color:#666;margin-bottom:16px;">Enter a display name to continue</p>
    <input
      v-model="guestName"
      type="text"
      placeholder="Your name"
      maxlength="30"
      style="width:100%;padding:12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:1rem;box-sizing:border-box;margin-bottom:12px;"
      @keyup.enter="loginAsGuest"
    />
    <p v-if="guestError" style="color:red;font-size:0.85rem;margin-bottom:10px;">{{ guestError }}</p>
    <div style="display:flex;gap:8px;">
      <button type="button" @click="showGuestModal=false;guestName='';guestError=''"
        style="flex:1;padding:11px;background:white;border:1.5px solid #e0e0e0;border-radius:8px;cursor:pointer;font-size:0.9rem;">
        Cancel
      </button>
      <button type="button" @click="loginAsGuest"
        style="flex:1;padding:11px;background:#1e3a8a;color:white;border:none;border-radius:8px;cursor:pointer;font-size:0.9rem;font-weight:600;">
        Continue
      </button>
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

      // ✅ Admin OTP state
      showAdminOtp: false,
      adminEmail: '',
      adminOtp: '',
      otpLoading: false,
      otpMessage: '',
      showGuestModal: false,
      guestName: '',
      guestError: '',
    };
  },

  mounted() {
    this.show = true;
    this.interval = setInterval(() => {
      this.welcomeText = !this.welcomeText;
    }, 10000);
    this.handleGoogleRedirectReturn();
  },

  beforeUnmount() {
    clearInterval(this.interval);
  },

  methods: {
    signInWithGoogle() {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const redirectUri = encodeURIComponent('https://coretalk.vercel.app/Login');
      const scope = encodeURIComponent('openid email profile');

      window.location.href =
        `https://accounts.google.com/o/oauth2/v2/auth` +
        `?client_id=${clientId}` +
        `&redirect_uri=${redirectUri}` +
        `&response_type=id_token` +
        `&scope=${scope}` +
        `&nonce=${Math.random().toString(36).slice(2)}` +
        `&prompt=select_account`;
    },

    async handleGoogleRedirectReturn() {
      const hash = window.location.hash;
      if (!hash.includes('id_token=')) return;

      const params = new URLSearchParams(hash.replace('#', ''));
      const idToken = params.get('id_token');
      if (!idToken) return;

      this.googleLoading = true;
      this.message = '';

      try {
        const res = await this.$axios.post(
          `${import.meta.env.VITE_API_URL}/api/auth/google-login`,
          { credential: idToken }
        );

        if (res.data.token) {
          localStorage.setItem('token', res.data.token);
          localStorage.setItem('username', res.data.user.name || res.data.user.email);

          if (res.data.user.isAdmin) {
            localStorage.setItem('isAdmin', 'true');
          } else {
            localStorage.removeItem('isAdmin');
          }

          window.history.replaceState(null, '', window.location.pathname);
          this.$router.push('/Schedule');
        } else {
          window.history.replaceState(null, '', window.location.pathname);
          this.message = 'Google login failed. Please try again.';
        }
      } catch (err) {
        console.error('Google login error:', err);
        window.history.replaceState(null, '', window.location.pathname);
        this.message = err.response?.data?.msg || 'Google login failed. Please try again.';
      } finally {
        this.googleLoading = false;
      }
    },

    async loginuser() {
      if (this.loading || this.googleLoading) return;

      if (!this.email || !this.password) {
        this.message = 'Fill your details which are empty';
        return;
      }
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!regex.test(this.email)) {
        this.message = 'Fill your email address properly';
        return;
      }
      if (this.password.length < 6) {
        this.message = 'Password should be more than 6 characters';
        return;
      }

      this.loading = true;
      this.message = '';

      try {
        const res = await this.$axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
          email: this.email,
          password: this.password,
        });

        // ✅ Admin OTP flow
        if (res.data.requiresAdminOtp) {
          this.adminEmail = res.data.email;
          this.showAdminOtp = true;
          return;
        }

        // Normal user flow
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
        this.message = err.response?.data?.message || err.response?.data?.msg || 'Login failed. Please try again.';
      } finally {
        this.loading = false;
      }
    },

    // ✅ Verify admin OTP
    async verifyAdminOtp() {
      if (this.otpLoading || this.adminOtp.length !== 6) return;

      this.otpLoading = true;
      this.otpMessage = '';

      try {
        const res = await this.$axios.post(
          `${import.meta.env.VITE_API_URL}/api/auth/admin-login-verify`,
          { email: this.adminEmail, otp: this.adminOtp }
        );

        if (res.data.success) {
          localStorage.setItem('token', res.data.token);
          localStorage.setItem('username', res.data.user.name || this.adminEmail);
          localStorage.setItem('isAdmin', 'true');
          this.$router.push('/Schedule');
        }
      } catch (err) {
        console.error('Admin OTP error:', err);
        this.otpMessage = err.response?.data?.message || 'Invalid or expired OTP. Please try again.';
        this.adminOtp = '';
      } finally {
        this.otpLoading = false;
      }
    },

    // ✅ Go back to login form
    cancelAdminOtp() {
      this.showAdminOtp = false;
      this.adminEmail = '';
      this.adminOtp = '';
      this.otpMessage = '';
      this.message = '';
    },

    erase() {
      this.message = '';
    },

    eraseOtp() {
      this.otpMessage = '';
    },

    loginAsGuest() {
      if (!this.guestName.trim()) {
        this.guestError = 'Please enter a name.';
        return;
      }
      localStorage.setItem('isGuest', 'true');
      localStorage.setItem('username', this.guestName.trim());
      // No token needed — guest is identified by isGuest flag
      this.showGuestModal = false;
      this.$router.push('/Schedule');
    },
  },
};
</script>

<style>
/* ---- all your existing styles stay exactly the same ---- */

/* ✅ Admin OTP Screen Additions */
.otp-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.otp-icon {
  font-size: 3rem;
  margin-bottom: 12px;
}

.otp-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: #1e3a8a;
  margin-bottom: 10px;
}

.otp-subtitle {
  font-size: 0.9rem;
  color: #444;
  margin-bottom: 6px;
  line-height: 1.6;
}

.otp-note {
  font-size: 0.82rem;
  color: #888;
  margin-bottom: 20px;
}

.otp-input {
  width: 100%;
  padding: 14px;
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: 14px;
  text-align: center;
  border: 1.5px solid #e0e0e0;
  border-radius: 8px;
  background: #fafafa;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  margin-bottom: 4px;
}

.otp-input:focus {
  border-color: #1e3a8a;
  box-shadow: 0 0 0 3px rgba(30, 58, 138, 0.1);
  background: white;
}

.otp-verify-btn {
  width: 100%;
  padding: 13px;
  background-color: #1e3a8a;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background-color 0.2s, transform 0.1s;
}

.otp-verify-btn:hover:not(:disabled) {
  background-color: #1a327a;
  transform: translateY(-1px);
}

.otp-verify-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
}

.otp-back-btn {
  width: 100%;
  padding: 11px;
  background: none;
  color: #666;
  border: 1.5px solid #e0e0e0;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  margin-top: 10px;
  transition: background-color 0.2s, color 0.2s;
}

.otp-back-btn:hover:not(:disabled) {
  background-color: #f5f5f5;
  color: #333;
}

.otp-back-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ---- paste all your existing styles below this line ---- */
* { box-sizing: border-box; margin: 0; padding: 0; }
#container { display: flex; min-height: 100vh; width: 100%; font-family: helvetica, sans-serif; overflow-x: hidden; }
#leftbox { flex: 0 0 60%; background-color: #1e3a8a; color: white; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 60px 40px; text-align: left; }
#leftbox h1 { font-size: clamp(1.5rem, 3vw, 2.5rem); margin-bottom: 15px; font-weight: 600; }
#leftbox > div { max-width: 600px; width: 100%; }
#leftbox p { font-size: clamp(0.95rem, 1.5vw, 1.1rem); line-height: 1.6; opacity: 0.9; }
#new_updates { text-align: left; }
#updates_header h1 { margin-bottom: 25px; text-align: center; }
#new_updates ol { margin: 20px 0 20px 25px; padding: 0; }
#new_updates li { font-size: clamp(0.9rem, 1.3vw, 1rem); line-height: 1.8; margin-bottom: 10px; }
#new_updates p { text-align: center; margin-top: 25px; font-size: 0.95rem; opacity: 0.7; }
#rightbox { flex: 0 0 40%; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 40px 30px; background-color: #f8f9fa; }
#info { width: 100%; max-width: 420px; background-color: white; padding: 35px 30px; border-radius: 12px; box-shadow: 0 2px 15px rgba(0,0,0,0.08); }
#info p { font-size: 0.9rem; color: #666; margin-bottom: 15px; text-align: center; }
#info p a { color: black; text-decoration: underline; font-weight: 600; }
#info input { width: 100%; padding: 13px 15px; margin: 10px 0; border: 1.5px solid #e0e0e0; border-radius: 8px; font-size: 0.95rem; transition: all 0.3s ease; background-color: #fafafa; }
#info input:focus { outline: none; border-color: #1e3a8a; background-color: white; box-shadow: 0 0 0 3px rgba(30,58,138,0.1); }
#info input::placeholder { color: #999; }
#info input:disabled { opacity: 0.6; cursor: not-allowed; }
#info button[type="submit"] { width: 100%; padding: 13px; background-color: #1a1a1a; color: white; border: none; border-radius: 8px; font-weight: 600; font-size: 1rem; cursor: pointer; margin: 15px 0 10px 0; transition: all 0.3s ease; display: flex; align-items: center; justify-content: center; gap: 8px; }
#info button[type="submit"]:hover:not(:disabled) { background-color: #333; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
#info button:disabled { opacity: 0.65; cursor: not-allowed; transform: none !important; }
.divider { display: flex; align-items: center; margin: 25px 0 20px 0; color: #999; }
.divider::before, .divider::after { content: ''; flex: 1; border-bottom: 1px solid #e0e0e0; }
.divider span { padding: 0 15px; font-size: 0.85rem; font-weight: 500; }
#google-signin-button { width: 100%; padding: 13px 15px; background-color: white; color: #3c4043; border: 1.5px solid #dadce0; border-radius: 8px; font-size: 0.95rem; font-weight: 500; font-family: helvetica, sans-serif; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 15px; transition: all 0.2s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
#google-signin-button:hover:not(:disabled) { background-color: #f8f9fa; border-color: #c0c0c0; box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
.spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.4); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; flex-shrink: 0; }
.spinner.dark { border: 2px solid rgba(0,0,0,0.15); border-top-color: #3c4043; }
@keyframes spin { to { transform: rotate(360deg); } }
#last { margin-top: 20px !important; font-size: 0.88rem !important; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
@media (max-width: 1024px) { #container { flex-direction: column; } #leftbox { flex: 0 0 auto; width: 100%; min-height: 350px; padding: 50px 30px; } #rightbox { flex: 0 0 auto; width: 100%; padding: 50px 30px; } }
@media (max-width: 768px) { #info { padding: 30px 25px; max-width: 100%; } }
@media (max-width: 480px) { #info { padding: 25px 20px; } #info input { padding: 12px 14px; font-size: 0.9rem; } }
</style>
