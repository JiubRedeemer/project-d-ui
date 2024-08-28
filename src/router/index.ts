import {createRouter, createWebHistory} from '@ionic/vue-router';
import {RouteRecordRaw} from 'vue-router';
import WelcomePage from "@/views/welcome/WelcomePage.vue";
import LoginPageEmail from "@/views/welcome/login/LoginPageEmail.vue";
import LoginPagePassword from "@/views/welcome/login/LoginPagePassword.vue";
import RegisterPageMatchingPassword from "@/views/welcome/register/RegisterPageMatchingPassword.vue";
import RegisterPagePassword from "@/views/welcome/register/RegisterPagePassword.vue";
import RegisterPageUsername from "@/views/welcome/register/RegisterPageUsername.vue";
import RegisterPageEmail from '@/views/welcome/register/RegisterPageEmail.vue';
import RoomsPage from "@/views/rooms/RoomsPage.vue";
import InvitesPage from "@/views/invites/InvitesPage.vue";

const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        redirect: '/welcome'
    },
    {
        path: '/welcome/',
        component: WelcomePage,
        name: 'welcomePage'
    },
    {
        path: '/welcome/register/email',
        component: RegisterPageEmail,
        name: 'registerPageEmail'
    },
    {
        path: '/welcome/register/username',
        component: RegisterPageUsername,
        name: 'registerPageUsername'
    },
    {
        path: '/welcome/register/password',
        component: RegisterPagePassword,
        name: 'registerPagePassword'
    },
    {
        path: '/welcome/register/matchingPassword',
        component: RegisterPageMatchingPassword,
        name: 'registerPageMatchingPassword'
    },
    {
        path: '/welcome/login/email',
        component: LoginPageEmail,
        name: 'loginPageEmail'
    },
    {
        path: '/welcome/login/password',
        component: LoginPagePassword,
        name: 'loginPagePassword'
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
