<template>
  <div id="container">
    <div id="box">

      <!-- STEP 1: Enter email -->
      <form v-if="step === 1" @submit.prevent="requestOtp">
        <h2 id="headers">Forget Password</h2>
        <hr>
        <p class="instruction">Enter your email and we'll send you a 6-digit OTP.</p>
        <input v-model="email" @input="clearMessage" class="text" type="email" placeholder="Email address" autocomplete="email" required />
        <p id="error" v-if="message">{{ message }}</p>
        <button id="clicked" type="submit" :disabled="loading">
          {{ loading ? 'Sending OTP...' : 'Send OTP' }}
        </button>
      </form>

      <!-- STEP 2: Enter OTP -->
      <form v-else-if="step === 2" @submit.prevent="verifyOtp">
        <h2 id="headers">Enter OTP</h2>
        <hr>
        <p class="instruction">A 6-digit OTP was sent to <strong>{{ email }}</strong>. It expires in 10 minutes.</p>
        <div class="otp-wrapper">
          <input
            v-for="(_, i) in otpDigits"
            :key="i"
            :ref="el => otpRefs[i] = el"
            v-model="otpDigits[i]"
            @input="onOtpInput(i)"
            @keydown="onOtpKeydown($event, i)"
            @paste="onOtpPaste($event)"
            class="otp-box"
            type="text"
            inputmode="numeric"
            maxlength="1"
          />
        </div>
        <p id="error" v-if="message">{{ message }}</p>
        <button id="clicked" type="submit" :disabled="loading || otpDigits.join('').length < 6">
          {{ loading ? 'Verifying...' : 'Verify OTP' }}
        </button>
        <p class="back-link">
          Didn't get it?
          <span @click="resendOtp" :class="{ disabled: resendCooldown > 0 }">
            {{ resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP' }}
          </span>
        </p>
        <p class="back-link" @click="step = 1">← Change email</p>
      </form>

      <!-- STEP 3: Set new password -->
      <form v-else-if="step === 3" @submit.prevent="resetPassword">
        <h2 id="headers">New Password</h2>
        <hr>
        <p class="instruction">Choose a strong password (min 8 characters).</p>
        <input v-model="password" @input="clearMessage" class="text" type="password" placeholder="New password" autocomplete="new-password" required />
        <input v-model="confirm" @input="clearMessage" class="text" type="password" placeholder="Confirm new password" autocomplete="new-password" required />
        <p id="error" v-if="message">{{ message }}</p>
        <button id="clicked" type="submit" :disabled="loading">
          {{ loading ? 'Updating...' : 'Update Password' }}
        </button>
      </form>

      <!-- STEP 4: Success -->
      <div v-else class="success-box">
        <h2 id="headers">✅ Done!</h2>
        <hr>
        <p class="instruction">Your password has been updated. You can now log in.</p>
        <button id="clicked" @click="$router.push('/Login')">Go to Login</button>
      </div>

    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      step: 1,
      email: '',
      otpDigits: ['', '', '', '', '', ''],
      otpRefs: [],
      password: '',
      confirm: '',
      message: '',
      loading: false,
      resetSessionToken: null,
      resendCooldown: 0,
      resendTimer: null,
    };
  },

  beforeUnmount() {
    clearInterval(this.resendTimer);
  },

  methods: {
    clearMessage() {
      this.message = '';
    },

    // Step 1: Request OTP
    async requestOtp() {
      if (!this.email) { this.message = 'Please enter your email.'; return; }
      this.loading = true;
      try {
        await this.$axios.post(`${import.meta.env.VITE_API_URL}/api/auth/forget-request`, { email: this.email });
        this.step = 2;
        this.startResendCooldown();
      } catch (err) {
        this.message = err.response?.status === 429
          ? 'Too many attempts. Please wait 15 minutes.'
          : 'Something went wrong. Please try again.';
      } finally {
        this.loading = false;
      }
    },

    // Resend OTP
    async resendOtp() {
      if (this.resendCooldown > 0) return;
      this.otpDigits = ['', '', '', '', '', ''];
      this.message = '';
      await this.requestOtp();
    },

    startResendCooldown() {
      this.resendCooldown = 30;
      clearInterval(this.resendTimer);
      this.resendTimer = setInterval(() => {
        if (this.resendCooldown > 0) this.resendCooldown--;
        else clearInterval(this.resendTimer);
      }, 1000);
    },

    // OTP input helpers
    onOtpInput(i) {
      this.otpDigits[i] = this.otpDigits[i].replace(/\D/g, '').slice(-1);
      if (this.otpDigits[i] && i < 5) {
        this.$nextTick(() => this.otpRefs[i + 1]?.focus());
      }
    },

    onOtpKeydown(e, i) {
      if (e.key === 'Backspace' && !this.otpDigits[i] && i > 0) {
        this.$nextTick(() => this.otpRefs[i - 1]?.focus());
      }
    },

    onOtpPaste(e) {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
      pasted.split('').forEach((ch, i) => { this.otpDigits[i] = ch; });
      this.$nextTick(() => this.otpRefs[Math.min(pasted.length, 5)]?.focus());
    },

    // Step 2: Verify OTP
    async verifyOtp() {
      const otp = this.otpDigits.join('');
      if (otp.length < 6) { this.message = 'Please enter the full 6-digit OTP.'; return; }
      this.loading = true;
      try {
        const res = await this.$axios.post(`${import.meta.env.VITE_API_URL}/api/auth/forget-verify`, { email: this.email, otp });
        this.resetSessionToken = res.data.resetSessionToken;
        this.step = 3;
      } catch (err) {
        this.message = err.response?.status === 429
          ? 'Too many attempts. Please wait 15 minutes.'
          : err.response?.data?.message || 'Invalid or expired OTP.';
      } finally {
        this.loading = false;
      }
    },

    // Step 3: Reset password
    async resetPassword() {
      if (!this.password || !this.confirm) { this.message = 'Please fill in both fields.'; return; }
      if (this.password.length < 8) { this.message = 'Password must be at least 8 characters.'; return; }
      if (this.password !== this.confirm) { this.message = 'Passwords do not match.'; return; }
      this.loading = true;
      try {
        const res = await this.$axios.post(`${import.meta.env.VITE_API_URL}/api/auth/forget-reset`, {
          resetSessionToken: this.resetSessionToken,
          newPassword: this.password,
        });
        if (res.data.success) this.step = 4;
        else this.message = res.data.message || 'Something went wrong.';
      } catch (err) {
        this.message = err.response?.status === 429
          ? 'Too many attempts. Please wait 15 minutes.'
          : err.response?.data?.message || 'Failed to update password.';
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
/* ✅ BUG 1 FIX: mobile responsive layout */
#container {
  background-color: #1e3a8a;
  min-height: 100vh;
  font-family: helvetica, sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
}

#box {
  background-color: white;
  width: 100%;
  max-width: 480px;
  border-radius: 10px;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);
  padding: 30px 40px 40px;
  box-sizing: border-box;
}

hr { color: black; margin-bottom: 10px; }

#headers {
  font-size: 2rem;
  text-align: center;
  letter-spacing: 1px;
  padding-top: 10px;
  color: black;
}

.instruction {
  font-size: 0.9rem;
  color: #555;
  text-align: center;
  margin-bottom: 4px;
  line-height: 1.5;
}

.text {
  display: block;
  width: 100%;
  margin-top: 25px;
  height: 40px;
  padding: 10px;
  box-sizing: border-box;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
}

.text:focus {
  outline: none;
  border-color: #1e3a8a;
}

/* OTP boxes */
.otp-wrapper {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin: 24px 0 8px;
}

.otp-box {
  width: 48px;
  height: 56px;
  text-align: center;
  font-size: 1.5rem;
  font-weight: bold;
  border: 2px solid #d1d5db;
  border-radius: 8px;
  outline: none;
  color: #1e3a8a;
}

.otp-box:focus {
  border-color: #1e3a8a;
}

#clicked {
  display: block;
  width: 100%;
  padding: 12px;
  background-color: black;
  margin-top: 25px;
  color: white;
  border: 1px solid black;
  border-radius: 6px;
  font-weight: bold;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

#clicked:hover:not(:disabled) {
  background-color: white;
  color: black;
}

#clicked:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

#error {
  font-weight: bold;
  color: red;
  margin-top: 10px;
  text-align: center;
}

.back-link {
  text-align: center;
  margin-top: 14px;
  color: #6b7280;
  font-size: 0.88rem;
  cursor: pointer;
}

.back-link span {
  color: #1e3a8a;
  font-weight: 600;
  cursor: pointer;
}

.back-link span:hover:not(.disabled) { text-decoration: underline; }
.back-link span.disabled { color: #9ca3af; cursor: default; }

.success-box { text-align: center; }

@media (max-width: 480px) {
  #box { padding: 24px 20px 32px; }
  #headers { font-size: 1.5rem; }
  .otp-box { width: 40px; height: 48px; font-size: 1.2rem; }
}
</style>
