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
              <li>User customization allowed.</li>
              <!--li>Email Enact feature.</li-->
            </ol>
            <p>Version v2.</p>
            <!--p>New here? <router-link to="/HowToUse">See how it works</router-link></p-->
          </div>
        </div>
      </div>
      <div id="rightbox">
        <form id="info" @submit.prevent="loginuser">
          <p>Don't have an account? <router-link to="/Registration">Create a new one.</router-link></p>
          <p>It's FREE & takes less than a minute.</p>
          <input v-model="email" @keypress="erase" type="email" placeholder="Email address" />
          <input v-model="password" @keypress="erase" type="password" placeholder="Password" />
          <p v-if="message" style="color:red; font-weight:bold; padding-left:5px;">{{ message }}</p>
          <button type="submit">Login Now</button>
          
          <!-- Divider -->
          <div class="divider">
            <span>OR</span>
          </div>
          
          <!-- Google Sign-In Button — plain redirect, no popup, no COOP crash -->
          <button type="button" id="google-signin-button" @click="signInWithGoogle">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" height="20" alt="Google" />
            Sign in with Google
          </button>
          
          <p id="last">Forget Password <router-link to="/Forget">Click here</router-link></p>
        </form>
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
    };
  },

  mounted() {
    this.show = true;
    this.interval = setInterval(() => {
      this.welcomeText = !this.welcomeText;
    }, 10000);

    // Show error if Google OAuth redirected back with an error
    const params = new URLSearchParams(window.location.search);
    if (params.get('error')) {
      this.message = 'Google sign-in failed. Please try again.';
    }
  },

  beforeUnmount() {
    clearInterval(this.interval);
  },

  methods: {
    // Full page redirect — no popup, no postMessage, no COOP issues ever
    signInWithGoogle() {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const redirectUri = encodeURIComponent(
        `${import.meta.env.VITE_API_URL}/api/auth/google/callback`
      );
      const scope = encodeURIComponent('openid email profile');

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
      if(!this.email || !this.password) {
        this.message = "Fill your details which are empty";
        return;
      }
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if(!regex.test(this.email)) {
        this.message = "Fill your email address properly";
        return;
      }
      if(this.password.length < 6) {
        this.message = "Password should be more than 6 characters";
        return;
      }
      try {
        const res = await this.$axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
          email: this.email,
          password: this.password
        });

        localStorage.setItem('token', res.data.token);
        localStorage.setItem('username', res.data.user.name || this.email);
        
        if(res.data.user.isAdmin) {
          localStorage.setItem("isAdmin", "true");
        } else {
          localStorage.removeItem("isAdmin");
        }

        this.$router.push('/Schedule');
      } catch (err) {
        console.error('Login error', err);
        this.message = "Login failed";
      }
    },

    erase() {
      this.message = '';
    }
  }
};
</script>

<style>
/* Reset & Box Sizing */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* Main Container */
#container {
  display: flex;
  min-height: 100vh;
  width: 100%;
  font-family: helvetica, sans-serif;
  overflow-x: hidden;
}

/* Left Box - Feature Section */
#leftbox {
  flex: 0 0 60%;
  background-color: #1e3a8a;
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 60px 40px;
  text-align: left;
}

#leftbox h1 {
  font-size: clamp(1.5rem, 3vw, 2.5rem);
  margin-bottom: 15px;
  font-weight: 600;
}

#leftbox > div {
  max-width: 600px;
  width: 100%;
}

#leftbox p {
  font-size: clamp(0.95rem, 1.5vw, 1.1rem);
  line-height: 1.6;
  opacity: 0.9;
}

/* Updates Section */
#new_updates {
  text-align: left;
}

#updates_header h1 {
  margin-bottom: 25px;
  text-align: center;
}

#new_updates ol {
  margin: 20px 0 20px 25px;
  padding: 0;
}

#new_updates li {
  font-size: clamp(0.9rem, 1.3vw, 1rem);
  line-height: 1.8;
  margin-bottom: 10px;
}

#new_updates p {
  text-align: center;
  margin-top: 25px;
  font-size: 0.95rem;
  opacity: 0.7;
}

/* Right Box - Login Form */
#rightbox {
  flex: 0 0 40%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 40px 30px;
  background-color: #f8f9fa;
}

#rightbox > h1 {
  font-size: clamp(1.5rem, 2.5vw, 2rem);
  color: #1a1a1a;
  margin-bottom: 30px;
  font-weight: 600;
  position: static;
  width: 100%;
  text-align: center;
}

/* Form Styling */
#info {
  width: 100%;
  max-width: 420px;
  background-color: white;
  padding: 35px 30px;
  border-radius: 12px;
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.08);
}

#info p {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 15px;
  text-align: center;
}

#info p a {
  color: black;
  text-decoration: underline;
  font-weight: 600;
}

#info p a:hover {
  text-decoration: underline;
}

/* Input Fields */
#info input {
  width: 100%;
  padding: 13px 15px;
  margin: 10px 0;
  border: 1.5px solid #e0e0e0;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: all 0.3s ease;
  background-color: #fafafa;
}

#info input:focus {
  outline: none;
  border-color: #1e3a8a;
  background-color: white;
  box-shadow: 0 0 0 3px rgba(30, 58, 138, 0.1);
}

#info input::placeholder {
  color: #999;
}

/* Error Message */
#info p[style*="color:red"] {
  font-size: 0.85rem;
  margin: 10px 0;
  padding: 8px 12px;
  background-color: #fee;
  border-left: 3px solid #f44336;
  border-radius: 4px;
}

/* Login Button */
#info button[type="submit"] {
  width: 100%;
  padding: 13px;
  background-color: #1a1a1a;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  margin: 15px 0 10px 0;
  transition: all 0.3s ease;
}

#info button[type="submit"]:hover {
  background-color: #333;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

#info button[type="submit"]:active {
  transform: translateY(0);
}

/* Divider */
.divider {
  display: flex;
  align-items: center;
  margin: 25px 0 20px 0;
  color: #999;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid #e0e0e0;
}

.divider span {
  padding: 0 15px;
  font-size: 0.85rem;
  font-weight: 500;
}

/* Google Sign-In Button */
#google-signin-button {
  width: 100%;
  padding: 13px 15px;
  background-color: white;
  color: #3c4043;
  border: 1.5px solid #dadce0;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  font-family: helvetica, sans-serif;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 15px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

#google-signin-button:hover {
  background-color: #f8f9fa;
  border-color: #c0c0c0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

#google-signin-button:active {
  background-color: #f1f3f4;
  transform: translateY(1px);
}

/* Forget Password Link */
#last {
  margin-top: 20px !important;
  font-size: 0.88rem !important;
}

/* Fade Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ============================================ */
/* RESPONSIVE BREAKPOINTS */
/* ============================================ */

@media (max-width: 1280px) {
  #leftbox {
    flex: 0 0 55%;
    padding: 50px 35px;
  }
  #rightbox {
    flex: 0 0 45%;
  }
}

@media (max-width: 1024px) {
  #container {
    flex-direction: column;
  }
  #leftbox {
    flex: 0 0 auto;
    width: 100%;
    min-height: 350px;
    padding: 50px 30px;
  }
  #rightbox {
    flex: 0 0 auto;
    width: 100%;
    padding: 50px 30px;
  }
  #info {
    max-width: 500px;
  }
}

@media (max-width: 768px) {
  #leftbox {
    min-height: 300px;
    padding: 40px 25px;
  }
  #rightbox {
    padding: 40px 20px;
  }
  #rightbox > h1 {
    margin-bottom: 25px;
  }
  #info {
    padding: 30px 25px;
    max-width: 100%;
  }
  #new_updates ol {
    margin-left: 20px;
  }
}

@media (max-width: 480px) {
  #leftbox {
    padding: 30px 20px;
    min-height: 280px;
  }
  #leftbox h1 {
    font-size: 1.5rem;
  }
  #rightbox {
    padding: 30px 15px;
  }
  #rightbox > h1 {
    font-size: 1.4rem;
    margin-bottom: 20px;
  }
  #info {
    padding: 25px 20px;
    border-radius: 10px;
  }
  #info input {
    padding: 12px 14px;
    font-size: 0.9rem;
  }
  #info button[type="submit"] {
    padding: 12px;
    font-size: 0.95rem;
  }
  #new_updates li {
    font-size: 0.88rem;
  }
  .divider {
    margin: 20px 0 15px 0;
  }
}

@media (max-width: 320px) {
  #leftbox {
    padding: 25px 15px;
  }
  #info {
    padding: 20px 15px;
  }
  #info input,
  #info button[type="submit"] {
    font-size: 0.85rem;
  }
}
</style>
