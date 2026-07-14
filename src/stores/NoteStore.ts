import { defineStore } from "pinia";
import { ref } from "vue";

export const useNoteStore = defineStore("noteStore", () => {
    const refreshTrigger = ref(0);
    // true, пока в NotesView открыта карточка (создание/редактирование) —
    // используется, чтобы прятать нижний таб-бар, перекрывающий контент.
    const editingActive = ref(false);

    function triggerRefresh() {
        refreshTrigger.value++;
    }

    return { refreshTrigger, triggerRefresh, editingActive };
});
