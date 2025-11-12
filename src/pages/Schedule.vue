<template>
  <transition name="fade">
    <div id="container">
      <div id="leftbox">
        <h1>Welcome to CoreTalk</h1>
        <p>Take benefit of our online meeting / conference platform with numerous features to the full extent.</p>
      </div>
      <div id="rightbox">
        <p id="admin-link" v-if="isAdmin"><router-link to="/Admin">Check Admin Dashboard</router-link></p>
	<IconMaterialSymbolsLightSettings style="font-size: 25px; color: grey;" id="settings-link" @click="entering"/>
        <form id="info" @submit.prevent="checkuser">
          <input v-model="roomId" type="text" placeholder="Enter Passcode \ Room ID">
          <input v-show="showdown" v-model="title" @keypress="erase" type="text" placeholder="Enter Title like 'Meeting'">
          <p v-if="message" style="color:red; font-weight:bold;">{{ message }}</p>
          <button type="submit">Enter</button>
          <button type="button" @click="createroom">Create your room</button>
        </form>
      </div>
    </div>
  </transition>
</template>
<script>
import IconMaterialSymbolsLightSettings from '~icons/material-symbols-light/settings';
export default {
  name: 'Schedule',
  data() {
    return {
      roomId: '',
      message: '',
      user: null,
      showdown: false,
      title: '',
      isHost: false,
      isAdmin: localStorage.getItem("isAdmin") === "true",
    };
  },
  methods: {
    erase() {
      this.message = false;
    },
    entering() {
      this.$router.push(`/Settings`);
    },
    checkuser() {
      if (this.roomId === '') {
        this.message = 'Fill your Room ID';
        return;
      }
      const token = localStorage.getItem('token');
      if (!token) {
        this.message = "Please login first";
        return;
      }
      this.$axios.post('https://coretalk-backend-1067959155765.asia-south1.run.app/api/auth/join', {
        roomId: this.roomId
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      .then(res => {
        const roomid = res.data.roomid;
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('meetingtitle', this.title);
        this.$router.push(`/MeetingRoom/${roomid}`);
      })
      .catch(err => {
        if (err.response) {
          console.error(err.response.data.msg);
          this.message = "Failed to join";
        } else {
          this.message = "Network error";
          console.error("Network error");
        }
      });
    },
    createroom() {
      localStorage.setItem('isHost', 'true');
      this.showdown = true;
      if (this.showdown == true && this.title == "") {
        this.message = "Enter the Room Title";
        return;
      }
      const token = localStorage.getItem('token');
      if (!token) {
        this.message = "Please login first";
        return;
      }
      this.$axios.post('https://coretalk-backend-1067959155765.asia-south1.run.app/api/auth/create', {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      .then(res => {
        const roomid = res.data.roomid;
        localStorage.setItem('roomid', roomid);
        localStorage.setItem('meetingtitle', this.title);
        this.$router.push(`/MeetingRoom/${roomid}`);
      })
      .catch(err => {
        if (err.response) {
          console.error('Create room error response:', err.response.data);
          this.message = err.response.data.msg || "Failed to create room";
        } else {
          console.error('Create room error:', err);
          this.message = "Network error or backend not responding";
        }
      });
    },
    showdash() {
      this.$router.push('/Admin');
    },
  },
  async mounted() {
    const token = localStorage.getItem('token');
    if (!token) {
      this.message = "Please login first";
      return;
    }
    try {
      const res = await this.$axios.get('https://coretalk-backend-1067959155765.asia-south1.run.app/api/auth/schedule', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      this.user = res.data.user;
    } catch (err) {
      this.message = "Authentication failed";
      localStorage.removeItem('token');
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
  padding: 80px 70px 50px 50px;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
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
  margin: 10px 0;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
}
#admin-link{
  position:absolute;
  top:30px;
}
#settings-link{
  position:absolute;
  top:30px;
  right:60px;
}
#rightbox button:hover {
  background-color: white;
  color: black;
  border: 1px solid black;
}
.fade-enter-active {
  transition: opacity 1s ease;
}
.fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
.fade-enter-to, .fade-leave-from {
  opacity: 1;
}
@media (max-width: 768px) {
  #container {
    flex-direction: column;
  }
  #leftbox, #rightbox {
    width: 100%;
    padding: 40px;
  }
}
</style>

