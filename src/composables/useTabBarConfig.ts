import { ref, computed } from 'vue'

export const ALL_TABS = ['character', 'combat', 'inventory', 'notes', 'companions'] as const
export type TabKey = typeof ALL_TABS[number]

export const MAX_VISIBLE = 6
export const MIN_VISIBLE = 3
const DEFAULT_HIDDEN: TabKey[] = []

interface TabBarConfig {
  order: TabKey[]
  hidden: TabKey[]
}

function storageKey(characterId: string) {
  return `tabBarConfig_${characterId}`
}

export function useTabBarConfig(characterId: string) {
  let saved: TabBarConfig | null = null
  try {
    const raw = localStorage.getItem(storageKey(characterId))
    if (raw) saved = JSON.parse(raw)
  } catch { /* ignore */ }

  const validSaved = saved?.order?.length === ALL_TABS.length && saved.order.every(t => (ALL_TABS as readonly string[]).includes(t))
  const order = ref<TabKey[]>(validSaved ? saved!.order : [...ALL_TABS])
  const hidden = ref<TabKey[]>(validSaved ? (saved!.hidden ?? DEFAULT_HIDDEN) : DEFAULT_HIDDEN)

  // Always exactly MAX_VISIBLE tabs shown in the bar (in order)
  const visibleTabs = computed(() => order.value.filter(t => !hidden.value.includes(t)).slice(0, MAX_VISIBLE))
  const visibleCount = computed(() => order.value.filter(t => !hidden.value.includes(t)).length)

  function persist() {
    try {
      localStorage.setItem(storageKey(characterId), JSON.stringify({ order: order.value, hidden: hidden.value }))
    } catch { /* ignore */ }
  }

  function toggleHidden(tab: TabKey) {
    if (hidden.value.includes(tab)) {
      // Showing: only allow if visible < MAX_VISIBLE
      if (visibleCount.value >= MAX_VISIBLE) return
      hidden.value = hidden.value.filter(t => t !== tab)
    } else {
      // Hiding: only allow if visible > MIN_VISIBLE
      if (visibleCount.value <= MIN_VISIBLE) return
      hidden.value = [...hidden.value, tab]
    }
    persist()
  }

  function moveUp(tab: TabKey) {
    const idx = order.value.indexOf(tab)
    if (idx <= 0) return
    const arr = [...order.value]
    ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
    order.value = arr
    persist()
  }

  function moveDown(tab: TabKey) {
    const idx = order.value.indexOf(tab)
    if (idx >= order.value.length - 1) return
    const arr = [...order.value]
    ;[arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
    order.value = arr
    persist()
  }

  return { ALL_TABS: ALL_TABS as readonly TabKey[], order, hidden, visibleTabs, visibleCount, toggleHidden, moveUp, moveDown, MAX_VISIBLE, MIN_VISIBLE }
}
