import {createRouter, createWebHistory} from '@ionic/vue-router';
import {RouteRecordRaw} from 'vue-router';
import RoomsPage from "@/views/rooms/RoomsPage.vue";
import DiscoverRoomsPage from "@/views/rooms/DiscoverRoomsPage.vue";
import InvitesPage from "@/views/invites/InvitesPage.vue";
import WelcomePage from '@/views/welcome/WelcomePage.vue';
import ForgotPasswordPage from "@/views/welcome/ForgotPasswordPage.vue";
import CreateCharacter from "@/views/createCharacter/CreateCharacter.vue";
import PlayerView from "@/views/character/PlayerView.vue";
import CharacterList from "@/views/rooms/CharacterList.vue";
import CreateRoom from "@/views/rooms/CreateRoom.vue";
import InventoryItemView from "@/views/character/tabs/inventory/InventoryItemView.vue";
import InventorySearchView from "@/views/character/tabs/inventory/InventorySearchView.vue";
import InventoryItemAddView from "@/views/character/tabs/inventory/InventoryItemAddView.vue";
import MagicSearchView from "@/views/character/tabs/magic/MagicSearchView.vue";
import SpellAddView from "@/views/character/tabs/magic/SpellAddView.vue";
import ChooseRuletype from "@/views/rooms/steps/ChooseRuletype.vue";
import ChooseRaces from "@/views/rooms/steps/ChooseRaces.vue";
import ChooseClasses from "@/views/rooms/steps/ChooseClasses.vue";
import ChooseBackgrounds from "@/views/rooms/steps/ChooseBackgrounds.vue";
import RaceFullView from "@/views/common/guidebook/RaceFullView.vue";
import ClassFullView from "@/views/common/guidebook/ClassFullView.vue";
import BackgroundFullView from "@/views/common/guidebook/BackgroundFullView.vue";
import CreateRace from "@/views/common/createEntity/CreateRace.vue";
import CreateClass from "@/views/common/createEntity/CreateClass.vue";
import CreateBackground from "@/views/common/createEntity/CreateBackground.vue";
import MasterView from "@/views/master/MasterView.vue";
import CharacterFilesView from "@/views/character/CharacterFilesView.vue";
import CreateNpcView from "@/views/npcs/CreateNpcView.vue";
import CreateCompanionView from "@/views/character/tabs/companions/CreateCompanionView.vue";
import NpcFullView from "@/views/npcs/NpcFullView.vue";
import SearchNpcView from "@/views/npcs/SearchNpcView.vue";
import CreateClassView from "@/views/master/tabs/CreateClassView.vue";
import CreateRaceView from "@/views/master/tabs/CreateRaceView.vue";
import CreateBackgroundView from "@/views/master/tabs/CreateBackgroundView.vue";
import MasterGuidebookRacesView from "@/views/master/tabs/guidebook/MasterGuidebookRacesView.vue";
import MasterGuidebookClassesView from "@/views/master/tabs/guidebook/MasterGuidebookClassesView.vue";
import MasterGuidebookBackgroundsView from "@/views/master/tabs/guidebook/MasterGuidebookBackgroundsView.vue";
import MasterGuidebookItemsView from "@/views/master/tabs/guidebook/MasterGuidebookItemsView.vue";
import MasterGuidebookSpellsView from "@/views/master/tabs/guidebook/MasterGuidebookSpellsView.vue";
import MasterGuidebookNpcsView from "@/views/master/tabs/guidebook/MasterGuidebookNpcsView.vue";
import MasterGuidebookStatesView from "@/views/master/tabs/guidebook/MasterGuidebookStatesView.vue";
import ProfilePage from "@/views/profile/ProfilePage.vue";
import {applySeo} from "@/config/seo";
import PaywallView from "@/views/subscription/PaywallView.vue";
import CrystalsView from "@/views/subscription/CrystalsView.vue";

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
        path: '/register',
        component: WelcomePage,
        name: 'registerPage'
    },
    {
        path: '/welcome/forgot-password',
        component: ForgotPasswordPage,
        name: 'forgotPasswordPage'
    },
    {
        path: '/profile',
        component: ProfilePage,
        name: 'profilePage'
    },
    {
        path: '/my-bundles',
        component: () => import('@/views/profile/MyBundlesView.vue'),
        name: 'myBundlesView'
    },
    {
        path: '/bundles/:bundleId/items/add',
        component: () => import('@/views/character/tabs/inventory/InventoryItemAddView.vue'),
        name: 'bundleItemAddView'
    },
    {
        path: '/subscription',
        component: PaywallView,
        name: 'paywallView'
    },
    {
        path: '/crystals',
        component: CrystalsView,
        name: 'crystalsView'
    },
    {
        path: '/rooms',
        component: RoomsPage,
        name: 'roomsPage'
    },
    {
        path: '/rooms/discover',
        component: DiscoverRoomsPage,
        name: 'discoverRoomsPage'
    },
    {
        path: '/rooms/create',
        component: CreateRoom,
        name: 'createRoom'
    },
    {
        path: '/rooms/create/ruleType',
        component: ChooseRuletype,
        name: 'ruleType'
    },
    {
        path: '/rooms/create/races',
        component: ChooseRaces,
        name: 'races'
    },
    {
        path: '/rooms/create/classes',
        component: ChooseClasses,
        name: 'classes'
    },
    {
        path: '/rooms/create/backgrounds',
        component: ChooseBackgrounds,
        name: 'backgrounds'
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
        path: '/rooms/:roomId/characters/:characterId/files',
        component: CharacterFilesView,
        name: 'characterFilesView'
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
    },
    {
        path: '/rooms/:roomId/characters/:characterId/magic/search',
        component: MagicSearchView,
        name: 'magicSearchView'
    },
    {
        path: '/rooms/:roomId/characters/:characterId/magic/add',
        component: SpellAddView,
        name: 'spellAddView'
    },
    {
        path: '/guidebook/races/:raceCode',
        component: RaceFullView,
        name: 'raceFullView'
    },
    {
        path: '/guidebook/classes/:classCode',
        component: ClassFullView,
        name: 'classFullView'
    },
    {
        path: '/guidebook/backgrounds/:backgroundCode',
        component: BackgroundFullView,
        name: 'backgroundFullView'
    },
    {
        path: '/rooms/:roomId/npcs/:npcId/full',
        component: NpcFullView,
        name: 'npcFullView'
    },
    {
        path: '/createEntity/race',
        component: CreateRace,
        name: 'createRace',
    },
    {
        path: '/createEntity/class',
        component: CreateClass,
        name: 'createClass',
    },
    {
        path: '/createEntity/background',
        component: CreateBackground,
        name: 'createBackground',
    },

    // NPCs (room-scoped)
    {
        path: '/rooms/:roomId/characters/:characterId/npcs/search',
        component: SearchNpcView,
        name: 'searchNpc',
    },
    {
        path: '/rooms/:roomId/npcs/create',
        component: CreateNpcView,
        name: 'createNpc',
    },
    {
        path: '/rooms/:roomId/npcs/:npcId/edit',
        component: CreateNpcView,
        name: 'editNpc',
    },
    {
        path: '/rooms/:roomId/characters/:characterId/companions/create',
        component: CreateCompanionView,
        name: 'CreateCompanion',
    },


    //MASTER
    {
        path: '/rooms/:roomId/master',
        component: MasterView,
        name: 'masterView',
    },
    {
        path: '/rooms/:roomId/master/create/clazz',
        component: CreateClassView,
        name: 'createClassView',
    },
    {
        path: '/rooms/:roomId/master/create/race',
        component: CreateRaceView,
        name: 'createRaceView',
    },
    {
        path: '/rooms/:roomId/master/create/background',
        component: CreateBackgroundView,
        name: 'createBackgroundView',
    },
    {
        path: '/rooms/:roomId/master/create/item',
        component: InventoryItemAddView,
        name: 'createItemView',
    },
    {
        path: '/rooms/:roomId/master/create/spell',
        component: SpellAddView,
        name: 'masterCreateSpellView',
    },
    {
        path: '/rooms/:roomId/master/guidebook/races',
        component: MasterGuidebookRacesView,
        name: 'masterGuidebookRacesView',
    },
    {
        path: '/rooms/:roomId/master/guidebook/classes',
        component: MasterGuidebookClassesView,
        name: 'masterGuidebookClassesView',
    },
    {
        path: '/rooms/:roomId/master/guidebook/backgrounds',
        component: MasterGuidebookBackgroundsView,
        name: 'masterGuidebookBackgroundsView',
    },
    {
        path: '/rooms/:roomId/master/guidebook/items',
        component: MasterGuidebookItemsView,
        name: 'masterGuidebookItemsView',
    },
    {
        path: '/rooms/:roomId/master/guidebook/spells',
        component: MasterGuidebookSpellsView,
        name: 'masterGuidebookSpellsView',
    },
    {
        path: '/rooms/:roomId/master/guidebook/npcs',
        component: MasterGuidebookNpcsView,
        name: 'masterGuidebookNpcsView',
    },
    {
        path: '/rooms/:roomId/master/guidebook/states',
        component: MasterGuidebookStatesView,
        name: 'masterGuidebookStatesView',
    }
]

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes
})

router.afterEach((to) => {
    applySeo(to.name as string | undefined, to.path);
})

export default router
