<template>
  <transition name="fade">
    <div id="container">
      <div id="leftbox">
        <h1>Welcome to CoreTalk</h1>
        <p>Take benefit of our online meeting platform with numerous features to the full extent.</p>
      </div>
      <div id="rightbox">
        <p id="admin-link" v-if="isAdmin && !isGuest">
          <router-link to="/Admin">Check Admin Dashboard</router-link>
        </p>
        <IconMaterialSymbolsLightSettings style="font-size: 25px; color: grey;" id="settings-link" @click="entering"/>
        <form id="info" @submit.prevent="checkuser">
          <input v-model="roomId" type="text" placeholder="Enter Passcode \ Room ID">
          <input v-show="showdown" v-model="title" @keypress="erase" type="text" placeholder="Enter Title like 'Meeting'">
          <p v-if="message" style="color:red; font-weight:bold;">{{ message }}</p>
          <button type="submit">Enter</button>
          <button type="button" v-if="!isGuest" @click="createroom">Create your room</button>
        </form>
        <!-- Waiting overlay -->
        <transition name="fade">
          <div v-if="isWaiting" style="
            position: absolute; inset: 0;
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            background: rgba(245,245,245,0.97);
            border-radius: 8px;
            gap: 20px;
            z-index: 10;
          ">
            <!-- Spinner -->
            <div style="
              width: 48px; height: 48px;
              border: 4px solid #e0e0e0;
              border-top-color: #1e3a8a;
              border-radius: 50%;
              animation: spin 0.9s linear infinite;
            "></div>

            <p style="font-size: 15px; font-weight: 600; color: #1e3a8a; margin: 0;">
              Waiting for host to admit you…
            </p>

            <!-- 8-second countdown bar -->
            <div style="width: 200px; height: 6px; background: #e0e0e0; border-radius: 3px; overflow: hidden;">
              <div style="
                height: 100%; background: #1e3a8a; border-radius: 3px;
                animation: countdown 15s linear forwards;
                transform-origin: left;
              "></div>
            </div>

            <button @click="cancelWaiting" style="
              padding: 8px 20px; background: transparent;
              border: 1px solid #ccc; border-radius: 6px;
              color: #666; font-size: 13px; cursor: pointer;
            ">Cancel</button>
          </div>
        </transition>
      </div>
    </div>
  </transition>
</template>

<script>
import IconMaterialSymbolsLightSettings from '~icons/material-symbols-light/settings';
import { io } from 'socket.io-client';
import { jwtDecode } from 'jwt-decode';

const BASE_URL = import.meta.env.VITE_API_URL;

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
      isWaiting: false,
      waitingTimer: null,
      waitingResult: null,
      waitingSocket: null,
      pendingRoomId: null,
      isGuest: localStorage.getItem('isGuest') === 'true',
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
       const isGuest = localStorage.getItem('isGuest') === 'true';
      const token = localStorage.getItem('token');
      if (!token && !isGuest) {
        this.message = 'Please login first';
        return;
      }
      if (isGuest) {
    // Guests join without a token — set name and go straight to waiting
        const guestName = localStorage.getItem('username') || 'Guest';
        localStorage.setItem('isHost', 'false');
        localStorage.setItem('meetingtitle', '');
        this.pendingRoomId = this.roomId;
        this.startWaiting(this.roomId, guestName);
        return;
      }
      this.$axios.post(`${BASE_URL}/api/auth/join`,
        { roomId: this.roomId },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then(res => {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('meetingtitle', this.title);
        this.pendingRoomId = res.data.roomid;
        this.startWaiting(res.data.roomid,res.data.name);
      })
      .catch(err => {
        this.message = err.response ? 'Failed to join' : 'Network error';
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
      this.$axios.post(`${BASE_URL}/api/auth/create`, {}, {
        headers: { Authorization: `Bearer ${token}` }
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

    startWaiting(roomId, userName) {
      this.isWaiting = true;
      this.waitingResult = null;
      this.message = '';

      if (!userName) {
        try {
          const decoded = jwtDecode(localStorage.getItem('token'));
          userName = decoded.name || 'Participant';
      } catch (e) {
        userName = 'Participant';
      }
    }

  // ✅ FIX: stable userId — guest gets a persistent guestId, not Date.now() every time
    let userId = null;
    const isGuest = localStorage.getItem('isGuest') === 'true';

    if (isGuest) {
      let guestId = localStorage.getItem('guestId');
      if (!guestId) {
        guestId = `guest_${Date.now()}`;
        localStorage.setItem('guestId', guestId);
      }
      userId = guestId;
    } else {
      try {
        const decoded = jwtDecode(localStorage.getItem('token'));
        userId = decoded.id || decoded.userId || `user_${Date.now()}`;
      } catch (e) {
        userId = `user_${Date.now()}`;
      }
    }
      
      if (this.waitingSocket) {
        this.waitingSocket.disconnect();
        this.waitingSocket = null;
      }

      // ✅ FIXED: using same backend as host
      this.waitingSocket = io(BASE_URL, {
        transports: ['websocket'],
        forceNew: true,
        timeout: 10000
      });

      this.waitingSocket.on('connect', () => {
        console.log('Waiting socket connected:', this.waitingSocket.id);
        this.waitingSocket.emit('participant-waiting', {
          roomId,
          userId,
          userName
        });
        console.log('Emitted participant-waiting for room:', roomId);
      });

      this.waitingSocket.on('reconnect', () => {
        console.log('Waiting socket reconnected, re-emitting participant-waiting');
        this.waitingSocket.emit('participant-waiting', { roomId, userId, userName });  
      });

      this.waitingSocket.on('connect_error', (err) => {
        console.error('Waiting socket error:', err.message);
        clearTimeout(this.waitingTimer);
        this.isWaiting = false;
        this.message = 'Could not connect to server. Please try again.';
        this.waitingSocket = null;
      });

      this.waitingSocket.on('admission-result', ({ admitted }) => {
        console.log('Admission result:', admitted);
        clearTimeout(this.waitingTimer);
        this.waitingSocket.disconnect();
        this.waitingSocket = null;

        if (admitted) {
          this.waitingResult = 'admitted';
          this.message = '';
          setTimeout(() => {
            this.isWaiting = false;
            this.$router.push(`/MeetingRoom/${roomId}`);
          }, 600);
        } else {
          this.waitingResult = 'denied';
          this.isWaiting = false;
          this.message = 'The host did not admit you to this meeting.';
        }
      });

      // 8-second auto-reject
      this.waitingTimer = setTimeout(() => {
        console.log('Waiting timed out');
        if (this.waitingSocket) {
          this.waitingSocket.disconnect();
          this.waitingSocket = null;
        }
        if (this.isWaiting) {
          this.isWaiting = false;
          this.waitingResult = 'denied';
          this.message = 'No response from host. Request timed out after 8 seconds.';
        }
      }, 15000);
    },

    cancelWaiting() {
      clearTimeout(this.waitingTimer);
      if (this.waitingSocket) {
        this.waitingSocket.emit('waiting-cancelled', {
          roomId: this.pendingRoomId
        });
        this.waitingSocket.disconnect();
        this.waitingSocket = null;
      }
      this.isWaiting = false;
      this.waitingResult = null;
      this.message = '';
    },

    showdash() {
      this.$router.push('/Admin');
    },
  },

  async mounted() {
    const isGuest = localStorage.getItem('isGuest') === 'true';
    if (isGuest) {
        this.user = { name: localStorage.getItem('username') };
        return;  // guests don't need the API call, just stop here
    }
    const token = localStorage.getItem('token');
    if (!token) {
        this.message = "Please login first";
        return;
    }
    try {
      const res = await this.$axios.get(`${BASE_URL}/api/auth/schedule`, {
        headers: { Authorization: `Bearer ${token}` },
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
#admin-link {
  position: absolute;
  top: 30px;
}
#settings-link {
  position: absolute;
  top: 30px;
  right: 60px;
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
@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes countdown {
  from { width: 100%; }
  to   { width: 0%; }
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
