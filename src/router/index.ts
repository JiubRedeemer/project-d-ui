import {createRouter, createWebHistory} from '@ionic/vue-router';
import {RouteRecordRaw} from 'vue-router';
import RoomsPage from "@/views/rooms/RoomsPage.vue";
import InvitesPage from "@/views/invites/InvitesPage.vue";
import RegisterPage from '@/views/welcome/register/RegisterPage.vue';
import LoginPage from "@/views/welcome/login/LoginPage.vue";
import WelcomePage from '@/views/welcome/WelcomePage.vue';

const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        redirect: '/welcome'
    },
    {
        path: '/welcome',
        component: WelcomePage,
        name: 'welcomePage'
    },
    {
        path: '/welcome/login/',
        component: LoginPage,
        name: 'loginPage'
    },
    {
        path: '/welcome/register/',
        component: RegisterPage,
        name: 'registerPage'
    },
    {
        path: '/rooms',
        component: RoomsPage,
        name: 'roomsPage'
    },
    {
        path: '/invites',
        component: InvitesPage,
        name: 'invitesPage'
    }
]

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes
})

export default router
