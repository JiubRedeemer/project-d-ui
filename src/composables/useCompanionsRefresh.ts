import { ref } from 'vue'

const _dirty = ref(false)

export function useCompanionsRefresh() {
  return {
    isDirty: _dirty,
    markDirty: () => { _dirty.value = true },
    clearDirty: () => { _dirty.value = false },
  }
}
