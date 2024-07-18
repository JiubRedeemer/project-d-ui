import {createRouter, createWebHistory} from '@ionic/vue-router';
import {RouteRecordRaw} from 'vue-router';
import WelcomePage from "@/views/welcome/WelcomePage.vue";
import RegisterPage from "@/views/welcome/RegisterPage.vue";
import LoginPage from "@/views/welcome/LoginPage.vue";

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
        path: '/welcome/register',
        component: RegisterPage,
        name: 'registerPage'
    },
    {
        path: '/welcome/login',
        component: LoginPage,
        name: 'loginPage'
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
