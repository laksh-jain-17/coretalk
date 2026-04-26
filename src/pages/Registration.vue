<template>
    <transition name="fade">
    <div id="container" v-if="show">
        <div id="leftbox">
            <h1>Welcome to CoreTalk</h1>
            <p>Take benefit of the our online meeting platform with numerous features to the full extent.</p>
        </div>
        <div id="rightbox">
            <!-- ✅ Show success state after registration -->
            <div v-if="registered" id="success-box">
                <div id="success-icon">✉️</div>
                <h2>Check your email!</h2>
                <p>We've sent a verification link to <strong>{{ submittedEmail }}</strong>. Click the link in the email to activate your account.</p>
                <p id="spam-note">Don't see it? Check your spam folder.</p>
                <a href="/Login" id="back-to-login">Go to Login →</a>
            </div>

            <form v-else id="info" @submit.prevent="loginuser">
                <input v-model="name" type="text" placeholder="Enter full name">
                <input v-model="email" type="email" placeholder="Email address">
                <input v-model="password" type="password" placeholder="Password">
                <input v-model="confirm_password" type="password" placeholder="Confirm Password">
                <p v-if="message" style="color:red; font-weight:bold;">{{ message }}</p>
                <button type="submit" :disabled="loading">
                    {{ loading ? 'Registering...' : 'Register Now' }}
                </button>
            </form>
        </div>
    </div>
    </transition>
</template>

<script>
    export default{
        data(){
            return{
                email : '',
                password : '',
                message : '',
                name : '',
                confirm_password : '',
                show : false,
                registered: false,   // ✅ NEW: tracks successful registration
                submittedEmail: '',  // ✅ NEW: show which email we sent to
                loading: false,      // ✅ NEW: prevent double-submit
            }; 
        },
        mounted(){
            this.show = true;    
        },
        methods:{
          async loginuser(){
            this.message = '';

            if(!this.name || !this.email || !this.password){
              this.message = "Fill your details which are empty";
              return;
            }
            const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if(!regex.test(this.email)){
              this.message = "Fill your email address properly";
              return;
            }
            if(this.password.length < 6){
              this.message = "Password should be more than 6 characters";
              return;
            }
            if(this.password != this.confirm_password){
                this.message = "Password doesn't match";
                return;
            }

            this.loading = true;
            try{
              const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/register`, {
                method:'POST',
                headers:{ 'Content-Type':'application/json' },
                body: JSON.stringify({
                  name: this.name,
                  email: this.email,
                  password: this.password
                })
              });
              const data = await response.json();

              if(response.ok){
                // ✅ FIX: Don't redirect to login. Show "check your email" screen.
                this.submittedEmail = this.email;
                this.registered = true;
              } else {
                // Show the actual error from backend (e.g. "Registration failed...")
                this.message = data.message || "Registration failed. Please try again.";
              }
            }
            catch(err){
              console.error("Registration error", err);
              this.message = "Something went wrong. Please try again.";
            }
            finally {
              this.loading = false;
            }
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
  background-color: #1e3a8a;
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
}

/* ✅ Success box styles */
#success-box {
  width: 100%;
  max-width: 400px;
  background-color: white;
  padding: 50px 40px;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  text-align: center;
}
#success-icon {
  font-size: 3rem;
  margin-bottom: 16px;
}
#success-box h2 {
  font-size: 1.5rem;
  margin-bottom: 12px;
  color: #1e3a8a;
}
#success-box p {
  color: #444;
  font-size: 0.95rem;
  line-height: 1.6;
  margin-bottom: 10px;
}
#spam-note {
  color: #888 !important;
  font-size: 0.82rem !important;
}
#back-to-login {
  display: inline-block;
  margin-top: 20px;
  color: #1e3a8a;
  font-weight: bold;
  text-decoration: none;
  border: 2px solid #1e3a8a;
  padding: 10px 24px;
  border-radius: 6px;
  transition: all 0.2s ease;
}
#back-to-login:hover {
  background-color: #1e3a8a;
  color: white;
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
  box-sizing: border-box;
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
#rightbox button:disabled {
  background-color: #555;
  cursor: not-allowed;
}
#rightbox button:hover:not(:disabled) {
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
</style>
