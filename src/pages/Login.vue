<template>
  <transition name="fade">
    <div id="container" v-if="show">
      <div id="leftbox">
        <div v-if="welcomeText">
          <h1>Welcome to CoreTalk</h1>
          <p>Take benefit of the our online meeting / conference platform with numerous features.</p>
        </div>
        <div v-else>
          <div id="new_updates">
            <div id="updates_header">
              <h1>What's new ?</h1>
            </div>
            <ol>
              <li>Auto-closing trays while inactive.</li>
              <li>Wider video feed.</li>
              <li>Silent Background feature.</li>
              <li>User customization allowed.</li>
              <li>Real time transcript (improved offline handling).</li>
              <li>Improved UX for unstable connection.</li>
            </ol>
            <p>Version v1.</p>
          </div>
        </div>
      </div>
      <div id="rightbox">
        <h1>Login page</h1>
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
          
          <!-- Google Sign-In Button -->
          <div id="google-signin-button"></div>
          
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
      googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID
    };
  },
  mounted() {
    this.show = true;
    setInterval(() => {
      this.welcomeText = !this.welcomeText;
    }, 10000);
    
    // Initialize Google Sign-In
    this.initGoogleSignIn();
  },
  methods: {
    initGoogleSignIn() {
      // Check if Client ID is configured
      if (!this.googleClientId) {
        console.error('Google Client ID not configured in .env');
        return;
      }

      // Load Google Identity Services script
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        // Initialize Google Sign-In after script loads
        if (window.google) {
          window.google.accounts.id.initialize({
            client_id: this.googleClientId,
            callback: this.handleGoogleCallback,
            auto_select: false,
            cancel_on_tap_outside: true
          });
          
          // Render the Google Sign-In button
          window.google.accounts.id.renderButton(
            document.getElementById('google-signin-button'),
            {
              theme: 'outline',
              size: 'large',
              type: 'standard',
              shape: 'rectangular',
              text: 'signin_with',
              logo_alignment: 'left',
              width: 350
            }
          );
          
          console.log('✅ Google Sign-In initialized successfully');
        }
      };
      script.onerror = () => {
        console.error('❌ Failed to load Google Sign-In script');
      };
      document.head.appendChild(script);
    },
    
    async handleGoogleCallback(response) {
      console.log('🔐 Google Sign-In successful');
      
      try {
        // Send the credential token to your backend
        const res = await this.$axios.post(
          `${import.meta.env.VITE_API_URL}/api/auth/google-login`,
          { credential: response.credential }
        );


        if (res.data.token) {
          // Store authentication data
          localStorage.setItem('token', res.data.token);
          localStorage.setItem('username', res.data.user.name || res.data.user.email);
          
          // Check admin status
          if (res.data.user.isAdmin) {
            localStorage.setItem('isAdmin', 'true');
          } else {
            localStorage.removeItem('isAdmin');
          }

          console.log('✅ Login successful:', res.data.user.email);
          
          // Redirect to schedule
          this.$router.push('/Schedule');
        }
      } catch (err) {
        console.error('❌ Google login error:', err);
        this.message = err.response?.data?.msg || 'Google login failed. Please try again.';
      }
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
#container {
  display: flex;
  height: 100vh;
  font-family: helvetica;
}
#leftbox {
  width: 65%;
  background-color: #1e3a8a; /* Deep blue */
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 60px;
  box-sizing: border-box;
}
#leftbox h1 {
  font-size: 2.5rem;
  margin-bottom: 20px;
  letter-spacing: 1px;
}
#leftbox p {
  font-family: helvetica;
  font-size: 1.2rem;
  line-height: 1.6;
  word-spacing: 2px;
}
#rightbox {
  width: 35%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60px;
  box-sizing: border-box;
  background-color: #f5f5f5;
}
#rightbox form {
  width: 100%;
  max-width: 400px;
  background-color: white;
  padding-left:50px;
  padding-top:80px;
  padding-bottom:50px;
  padding-right:70px;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  margin-top:30px;
}
#rightbox h1{
  font-family:helvetica;
  position:absolute;
  top:50px;
  color:black;
}
#rightbox p{
  color:gray;
  font-size:12px;
}
#rightbox a{
  color:black;
  font-weight:bold;
}
#last{
  text-align:center;
}
#rightbox input {
  width: 100%;
  padding: 12px;
  margin: 10px 0;
  border: 1px solid #ccc;
  border-radius: 6px;
}
#rightbox button {
  width: 100%;
  padding: 12px;
  background-color: black;
  margin-top:10px;
  margin-bottom:10px;
  position:relative;
  left:14px;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
}
#rightbox button:hover {
  background-color:white;
  color:black;
  border:1px solid black;
  border-radius:7px;
}
.fade-enter-active{
  transition:opacity 1s ease;
}
.fade-leave-active{
  transition:opacity 0.5s ease;
}
.fade-enter-from, .fade-leave-to{
  opacity:0;
}
.fade-enter-to, .fade-leave-from{
  opacity:1;
}

/* Divider */
.divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 20px 0;
  color: #666;
  position: relative;
  left: 14px;
}
.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid #ddd;
}
.divider span {
  padding: 0 15px;
  font-size: 14px;
  font-weight: 500;
}

/* Google Sign-In Button Container */
#google-signin-button {
  display: flex;
  justify-content: center;
  margin: 20px 0;
  position: relative;
  left: 14px;
}

@media (max-width: 768px) {
  #container {
    flex-direction: column;
  }
  #leftbox,
  #rightbox {
    width: 100%;
    padding: 40px;
  }
}
#new_updates p {
  text-align:center;
}

</style>
