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
* {
  box-sizing: border-box; /* Ensures padding doesn't break width */
  margin: 0;
  padding: 0;
}

#container {
  display: flex;
  min-height: 100vh; /* Use min-height so it can expand on mobile */
  font-family: helvetica, sans-serif;
  flex-direction: row; /* Default: Side-by-side for laptops */
}

/* 2. Left Box Optimization */
#leftbox {
  flex: 0 0 65%; /* Width 65% on desktop */
  background-color: #1e3a8a;
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 5vw; /* Use vw for padding so it scales with screen width */
}

#leftbox h1 {
  font-size: clamp(1.8rem, 4vw, 2.5rem); /* Scales between 1.8rem and 2.5rem */
  margin-bottom: 20px;
}

/* 3. Right Box (Login Area) */
#rightbox {
  flex: 1; /* Takes remaining 35% */
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 40px 20px;
  background-color: #f5f5f5;
  position: relative;
}

/* 4. Form Styling - No more absolute positioning! */
#rightbox form {
  width: 100%;
  max-width: 420px;
  background-color: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

#rightbox h1 {
  position: static; /* Removed Absolute Positioning */
  margin-bottom: 30px;
  font-size: 1.8rem;
  color: black;
  text-align: center;
}

#rightbox input {
  width: 100%;
  padding: 12px;
  margin: 8px 0;
  border: 1px solid #ccc;
  border-radius: 6px;
}

#rightbox button {
  width: 100%;
  padding: 12px;
  background-color: black;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  margin: 15px 0;
  transition: all 0.3s ease;
}

/* 5. RESPONSIVE MEDIA QUERY (The Magic Fix) */
@media (max-width: 1024px) {
  #leftbox { width: 50%; } /* Equal split for smaller laptops/tablets */
}

@media (max-width: 768px) {
  #container {
    flex-direction: column; /* Stacks vertically on mobile */
  }
  #leftbox {
    width: 100%;
    min-height: 300px; /* Give it some height on mobile */
    padding: 40px 20px;
  }
  #rightbox {
    width: 100%;
    padding: 20px;
  }
  #rightbox form {
    padding: 25px; /* Less padding inside form on mobile */
  }
}

/* Divider & Google Button */
.divider {
  display: flex;
  align-items: center;
  margin: 20px 0;
  color: #666;
}
.divider::before, .divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid #ddd;
}
.divider span { padding: 0 10px; font-size: 14px; }

#google-signin-button {
  width: 100%;
  display: flex;
  justify-content: center;
}

