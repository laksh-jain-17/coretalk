<script>
import Login from './pages/Login.vue'
import Ending from './pages/Ending.vue'
import Registration from './pages/Registration.vue'
import Schedule from './pages/Schedule.vue'
import MeetingRoom from './pages/MeetingRoom.vue'
import Forget from './pages/Forget.vue'
import { ref,onMounted } from 'vue'
import axios from 'axios'
import { getToken, logout } from './auth'

const user = ref(null);
onMounted(async() => {
  const token = getToken();
  if(token) {
    try {
      // ✅ Fixed the template literal and used the axios instance
      const res = await axios.get('/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      user.value = res.data.user;
      
      // ✅ PROFESSIONAL TOUCH: If user is on Login but has a valid session, move them!
      if (window.location.pathname === '/Login' || window.location.pathname === '/') {
         window.location.href = '/Schedule';
      }
    }
    catch(err) {
      console.error("Session expired or invalid");
      logout();
      if (window.location.pathname !== '/Login') {
        window.location.href = '/Login';
      }
    }
  }
});
</script>

<template>
  <div id="app">
    <router-view></router-view>
  </div>
</template>

<style scoped>

</style>
