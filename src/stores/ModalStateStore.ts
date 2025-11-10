import {defineStore} from "pinia";

export const useModalStateStore = defineStore('modalStateStore', {
    state: () => ({
        editItemSkillOpened: Boolean(false)
    })
})