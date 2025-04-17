import {defineStore} from "pinia";

export const useSubheaderStore = defineStore('subheaderStore', {
    state: () => ({
        subheaderOpened: Boolean(true)
    })
})
