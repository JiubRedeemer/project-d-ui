import {createRouter, createWebHistory} from '@ionic/vue-router';
import {RouteRecordRaw} from 'vue-router';
import WelcomePage from "@/views/welcome/WelcomePage.vue";
import LoginPageEmail from "@/views/welcome/login/LoginPageEmail.vue";
import LoginPagePassword from "@/views/welcome/login/LoginPagePassword.vue";
import RegisterPageEmail from "@/views/welcome/register/RegisterPageEmail.vue";
import RegisterPageUsername from "@/views/welcome/register/RegisterPageUsername.vue";
import RegisterPagePassword from "@/views/welcome/register/RegisterPagePassword.vue";
import RegisterPageMatchingPassword from "@/views/welcome/register/RegisterPageMatchingPassword.vue";

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
    }
    // {
    //   path: '/tabs/',
    //   component: TabsPage,
    //   children: [
    //     {
    //       path: '',
    //       redirect: '/tabs/welcome'
    //     },
    //     {
    //       path: 'tab1',
    //       component: () => import('@/views/Tab1Page.vue')
    //     },
    //     {
    //       path: 'tab2',
    //       component: () => import('@/views/Tab2Page.vue')
    //     },
    //     {
    //       path: 'tab3',
    //       component: () => import('@/views/Tab3Page.vue')
    //     },
    //     {
    //       path: 'welcome',
    //       component: () => import('@/views/WelcomePage.vue'),
    //     }
    //   ]
    // }
]

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes
})

export default router
