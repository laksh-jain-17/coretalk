import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import Login from './pages/Login.vue'
import Ending from './pages/Ending.vue'
import Registration from './pages/Registration.vue'
import Schedule from './pages/Schedule.vue'
import MeetingRoom from './pages/MeetingRoom.vue'
import Forget from './pages/Forget.vue'
import PageNotFound from './pages/PageNotFound.vue'
import Admin from './pages/Admin.vue'
import Settings from './pages/Settings.vue'
import axios from 'axios'
import { isLoggedIn, verifyAuth } from './auth'

axios.defaults.baseURL = import.meta.env.VITE_API_URL;
axios.defaults.withCredentials = true; // ✅ sends cookie automatically with every request

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/Login' },
    { path: '/Registration', component: Registration },
    { path: '/Login', component: Login },
    { path: '/Schedule', component: Schedule, meta: { requiresAuth: true } },
    { path: '/MeetingRoom/:id', component: MeetingRoom, meta: { requiresAuth: true } },
    { path: '/Ending', component: Ending, meta: { requiresAuth: true } },
    { path: '/Forget', component: Forget },
    { path: '/Admin', component: Admin, meta: { requiresAuth: true, requiresAdmin: true } },
    { path: '/Settings', component: Settings, meta: { requiresAuth: true } },
    { path: '/oauth/callback', component: () => import('./pages/OAuthCallback.vue') },
    { path: '/HowToUse', component: () => import('./pages/HowToUse.vue') },
    { path: '/:pathMatch(.*)*', component: PageNotFound }
  ],
});

router.beforeEach(async (to, from, next) => {
  if (!to.meta.requiresAuth && !to.meta.requiresAdmin) {
    return next(); 
  }
  let loggedIn = isLoggedIn();
  if (!loggedIn) {
    loggedIn = await verifyAuth();
  }
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  if (to.meta.requiresAuth && !loggedIn) {
    return next('/Login');
  }
  if (to.meta.requiresAdmin && !isAdmin) {
    return next('/Login');
  }
  next();
});

const app = createApp(App);
app.config.globalProperties.$axios = axios;
app.use(router);
app.mount('#app');
