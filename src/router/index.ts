import {createRouter, createWebHistory} from '@ionic/vue-router';
import {RouteRecordRaw} from 'vue-router';
import RoomsPage from "@/views/rooms/RoomsPage.vue";
import InvitesPage from "@/views/invites/InvitesPage.vue";
import RegisterPage from '@/views/welcome/register/RegisterPage.vue';
import LoginPage from "@/views/welcome/login/LoginPage.vue";
import WelcomePage from '@/views/welcome/WelcomePage.vue';
import CreateCharacter from "@/views/createCharacter/CreateCharacter.vue";
import PlayerView from "@/views/character/PlayerView.vue";
import CharacterList from "@/views/rooms/CharacterList.vue";
import CreateRoom from "@/views/rooms/CreateRoom.vue";
import InventoryItemView from "@/views/character/tabs/inventory/InventoryItemView.vue";
import InventorySearchView from "@/views/character/tabs/inventory/InventorySearchView.vue";
import InventoryItemAddView from "@/views/character/tabs/inventory/InventoryItemAddView.vue";

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
        path: '/rooms/create',
        component: CreateRoom,
        name: 'createRoom'
    },
    {
        path: '/invites',
        component: InvitesPage,
        name: 'invitesPage'
    },
    {
        path: '/rooms/:roomId/create-character',
        component: CreateCharacter,
        name: 'createCharacter'
    },
    {
        path: '/rooms/:roomId/characters',
        component: CharacterList,
        name: 'characterList'
    },
    {
        path: '/rooms/:roomId/characters/:characterId',
        component: PlayerView,
        name: 'playerView'
    },
    {
        path: '/rooms/:roomId/characters/:characterId/inventory/:itemId',
        component: InventoryItemView,
        name: 'inventoryItemView'
    },
    {
        path: '/rooms/:roomId/characters/:characterId/inventory/search',
        component: InventorySearchView,
        name: 'inventorySearchView'
    },
    {
        path: '/rooms/:roomId/characters/:characterId/inventory/add',
        component: InventoryItemAddView,
        name: 'inventoryItemAddView'
    }
]

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes
})

export default router
