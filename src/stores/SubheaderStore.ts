import {defineStore} from "pinia";

export const useSubheaderOpenedStore = defineStore('subheaderStore', {
    state: () => ({
        subheaderOpened: Boolean(true)
    })
})
