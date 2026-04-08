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
import { isLoggedIn } from './auth'

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

router.beforeEach((to, from, next) => {
  const loggedIn = isLoggedIn();
  const isAdmin = localStorage.getItem('isAdmin') === 'true';

  if (to.meta.requiresAuth && !loggedIn) {
    next('/Login');
  } else if (to.meta.requiresAdmin && !isAdmin) {
    // ✅ Admin route guard fixed
    next('/Login');
  } else {
    next();
  }
});

const app = createApp(App);
app.config.globalProperties.$axios = axios;
app.use(router);
app.mount('#app');
