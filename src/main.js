import { createApp } from 'vue'
//import './style.css'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import Login from './pages/Login.vue'
import Ending from './pages/Ending.vue'
import Registration from './pages/Registration.vue'
import Schedule from './pages/Schedule.vue'
import MeetingRoom from './pages/MeetingRoom.vue'
import Forget from './pages/Forget.vue'
import PageNotFound from './pages/PageNotFound.vue';
import Admin from './pages/Admin.vue';
import Settings from './pages/Settings.vue';
import axios from 'axios'
import { isLoggedIn } from './auth'
axios.defaults.baseURL = 'http://localhost:5000';
const router = createRouter({
    history:createWebHistory(),
    routes:[
        { path : '/' , redirect : '/Login'},
        { path : '/Registration' , component : Registration },
        { path : '/Login' , component : Login },
        { path : '/Schedule' , component : Schedule,meta: { requiresAuth: true} },
        //{ path : '/MeetingRoom' , component : MeetingRoom,meta: { requiresAuth: true} },
        { path : '/MeetingRoom/:id' , component : MeetingRoom,meta: { requiresAuth: true} },
        { path : '/Ending' , component : Ending,meta: { requiresAuth: true} },
        { path : '/Forget' , component : Forget },
       // { path : '*' , component : PageNotFound },
		{ path: '/Admin', component: Admin },
	{ path : '/Settings' , component : Settings },
		{ path: '/oauth/callback', component: () => import('./pages/OAuthCallback.vue') },
		{ path: '/HowToUse', component: () => import('./pages/HowToUse.vue') }
    ],
});

router.beforeEach((to,from,next) => {
    if(to.meta.requiresAuth && !isLoggedIn())
    {
        next({ path: '/Login', query: {redirect: to.fullPath}});
    }
    else{
        next();
    }
});

const app = createApp(App);
app.config.globalProperties.$axios = axios;
app.use(router);
app.mount('#app');
