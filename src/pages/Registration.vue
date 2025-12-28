<template>
    <transition name="fade">
    <div id="container" v-if="show">
        <div id="leftbox">
            <h1>Welcome to CoreTalk</h1>
            <p>Take benefit of the our online meeting / conference platform with numerous features to the full extent.</p>
        </div>
        <div id="rightbox">
            <!--h1>Registration page</h1-->
            <form id="info" @submit.prevent="loginuser">
                <!--p>Don't have an account? <a href="#">Create a new one.</a></p-->
                <!--p>It's FREE & takes less than a minute.</p-->
                <input v-model="name" type="text" placeholder="Enter full name">
                <input v-model="email" type="email" placeholder="Email address">
                <input v-model="password" type="password" placeholder="Password">
                <input v-model="confirm_password" type="password" placeholder="Confirm Password">
                <p v-if="message" style="color:red; font-weight:bold;">{{ message }}</p>
                <button type="submit">Register Now</button>
                <!--button id="google-login">Login with Google</button-->
                <!--p id="last">Forget Password <a href="#">Click here</a></p-->
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
                show : false
            }; 
        },
        mounted(){
            this.show = true;    
        },
        methods:{
          async loginuser(){
            if(!this.email || !this.password)
            {
              console.log("Empty details");
              this.message = "Fill your details which are empty";
              return;
            }
            const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if(!regex.test(this.email))
            {
              this.message = "Fill your email address properly";
              return;
            }
            if(this.password.length < 6)
            {
              this.message = "Password should be more than 6 characters";
              return;
            }
            if(this.password != this.confirm_password)
            {
                this.message = "Password doesn't match";
                return;
            }
            try{
              console.log("Registering user with " , this.name, this.email, this.password);
              const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/register`, {
                method:'POST',
                headers:{ 'Content-Type':'application/json' },
                body: JSON.stringify({
                  name: this.name,
                  email: this.email,
                  password: this.password
                })
              });
              const data = await response.json();
              if(response.ok)
              {
                console.log("Email " + this.email + "Password " + this.password)
                window.location.href = "/Login";
              }
              else{
                this.message = "Login failed";
              }
            }
            catch(err)
            {
              console.error("Login error " , err);
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
}
#rightbox h1{
  font-family:helvetica;
  position:absolute;
  top:50px;
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
#rightbox button#google-login{
  background-color:white;
  color:black;
  border:1px solid black;
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
#rightbox button#google-login:hover{
  background-color:black;
  color:white;
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

