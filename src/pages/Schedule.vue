<template>
  <transition name="fade">
    <div id="container">
      <div id="leftbox">
        <h1>Welcome to CoreTalk</h1>
        <p>Take benefit of our online meeting platform with numerous features to the full extent.</p>
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
        			animation: countdown 8s linear forwards;
        			transform-origin: left;
      			"></div>
    		</div>

    		<button @click="cancelWaiting" style="
      			padding: 8px 20px; background: transparent;
     			order: 1px solid #ccc; border-radius: 6px;
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
      waitingResult: null,   // null | 'admitted' | 'denied'
      waitingSocket: null,
      pendingRoomId: null,
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
    		this.message = 'Please login first';
    		return;
  		}
  		this.$axios.post('https://coretalk-backend-1067959155765.asia-south1.run.app/api/auth/join',
    		{ roomId: this.roomId },
    		{ headers: { Authorization: `Bearer ${token}` } }
  		)
  		.then(res => {
    		localStorage.setItem('token', res.data.token);
    		localStorage.setItem('meetingtitle', this.title);
    		this.pendingRoomId = res.data.roomid;
    		this.startWaiting(res.data.roomid);
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
	async startWaiting(roomId) {
  		this.isWaiting = true;
  		this.waitingResult = null;
  		this.message = '';

  		// Connect a temporary socket just for admission signalling
  		const { io } = await import('socket.io-client');   // or use your existing import
  		this.waitingSocket = io('https://coretalk-backend-1067959155765.asia-south1.run.app', {
    		transports: ['websocket'],
    		forceNew: true
  		});

  		const token = localStorage.getItem('token');
  		const { jwtDecode } = await import('jwt-decode');
  		const decoded = jwtDecode(token);
  		const userName = decoded.name || decoded.username || decoded.email || 'Participant';
  		const userId = decoded.id || decoded.userId || `user_${Date.now()}`;

  		this.waitingSocket.on('connect', () => {
    		this.waitingSocket.emit('participant-waiting', {
      			roomId,
      			userId,
      			userName
    		});
  		});

  		this.waitingSocket.on('admission-result', ({ admitted }) => {
    		clearTimeout(this.waitingTimer);
    		this.waitingSocket.disconnect();
    		this.waitingSocket = null;

    		if (admitted) {
      			this.waitingResult = 'admitted';
      			setTimeout(() => {
        			this.isWaiting = false;
        			this.$router.push(`/MeetingRoom/${roomId}`);
      			}, 800);
    		} else {
      			this.waitingResult = 'denied';
      			this.isWaiting = false;
      			this.message = 'The host did not admit you to this meeting.';
    		}
  		});

  // 8-second timeout — auto-reject
  		this.waitingTimer = setTimeout(() => {
    		if (this.waitingSocket) {
      			this.waitingSocket.disconnect();
      			this.waitingSocket = null;
    		}
    		this.isWaiting = false;
    		this.waitingResult = 'denied';
    		this.message = 'Request timed out. The host did not respond in time.';
  		}, 8000);
	},

	cancelWaiting() {
  		clearTimeout(this.waitingTimer);
  		if (this.waitingSocket) {
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


