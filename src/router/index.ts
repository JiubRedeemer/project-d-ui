import {createRouter, createWebHistory} from '@ionic/vue-router';
import {RouteRecordRaw} from 'vue-router';
import WelcomePage from "@/views/welcome/WelcomePage.vue";
import LoginPageEmailUni from "@/views/welcome/login/LoginPageEmailUni.vue";
import LoginPagePasswordUni from "@/views/welcome/login/LoginPagePasswordUni.vue";
import RegisterPageMatchingPasswordUni from "@/views/welcome/register/RegisterPageMatchingPasswordUni.vue";
import RegisterPagePasswordUni from "@/views/welcome/register/RegisterPagePasswordUni.vue";
import RegisterPageUsernameUni from "@/views/welcome/register/RegisterPageUsernameUni.vue";
import RegisterPageEmailUni from '@/views/welcome/register/RegisterPageEmailUni.vue';

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
        component: RegisterPageEmailUni,
        name: 'registerPageEmail'
    },
    {
        path: '/welcome/register/username',
        component: RegisterPageUsernameUni,
        name: 'registerPageUsername'
    },
    {
        path: '/welcome/register/password',
        component: RegisterPagePasswordUni,
        name: 'registerPagePassword'
    },
    {
        path: '/welcome/register/matchingPassword',
        component: RegisterPageMatchingPasswordUni,
        name: 'registerPageMatchingPassword'
    },
    {
        path: '/welcome/login/email',
        component: LoginPageEmailUni,
        name: 'loginPageEmail'
    },
    {
        path: '/welcome/login/password',
        component: LoginPagePasswordUni,
        name: 'loginPagePassword'
    }
]

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes
})

export default router
