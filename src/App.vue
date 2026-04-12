<script setup>
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
  if(token)
  {
    try{
      const res = await axios.get('http://localhost:5000/api/auth/profile',{
        headers: { Authorization: `Bearer ${token}` }
      })
      user.value = res.data.user
    }
    catch(err)
    {
      logout();
      window.location.href = '/Login'
    }
  }
})
</script>

<template>
  <div id="app">
    <router-view></router-view>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  overflow-y: auto;
}

#app {
  min-height: 100%;
}
</style>
