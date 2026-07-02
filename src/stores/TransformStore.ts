import { defineStore } from 'pinia'
import type { CompanionDto } from '@/api/companionApi.types'
import { useCharacterStore } from '@/stores/CharacterStore'
import { FILE_STORAGE_INTEGRATION_ROUTES, GATEWAY_INTEGRATION_ROUTES } from '@/config/integrationRoutes'
import axios from 'axios'

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
}

function characterBaseUrl(roomId: string, characterId: string) {
  return `${GATEWAY_INTEGRATION_ROUTES.baseURL}${GATEWAY_INTEGRATION_ROUTES.api}${GATEWAY_INTEGRATION_ROUTES.rooms}/${roomId}${GATEWAY_INTEGRATION_ROUTES.characters}/${characterId}`
}

async function syncHpToBackend(roomId: string, characterId: string, oldHp: number, newCurrentHp: number, newMaxHp: number) {
  const base = characterBaseUrl(roomId, characterId)
  const headers = authHeaders()
  try {
    await axios.patch(`${base}${GATEWAY_INTEGRATION_ROUTES.health}${GATEWAY_INTEGRATION_ROUTES.max}`, { bonusValue: newMaxHp }, { headers })
    const delta = newCurrentHp - oldHp
    if (delta !== 0) {
      const type = delta > 0 ? 'HEAL' : 'DAMAGE'
      await axios.patch(`${base}${GATEWAY_INTEGRATION_ROUTES.health}${GATEWAY_INTEGRATION_ROUTES.updateCurrent}`, { type, value: Math.abs(delta) }, { headers })
    }
  } catch (e) {
    console.warn('[TransformStore] failed to sync HP to backend', e)
  }
}

async function syncAcBonusToBackend(roomId: string, characterId: string, bonusValue: number) {
  try {
    await axios.patch(
      `${characterBaseUrl(roomId, characterId)}${GATEWAY_INTEGRATION_ROUTES.armoryClass}${GATEWAY_INTEGRATION_ROUTES.bonus}`,
      { bonusValue },
      { headers: authHeaders() }
    )
  } catch (e) {
    console.warn('[TransformStore] failed to sync AC to backend', e)
  }
}

interface AbilityBackup {
  code: string
  value: number
  bonusValue: number
}

interface TransformEntry {
  form: CompanionDto
  backupAbilities: AbilityBackup[]
  backupArmoryClass: number
  backupBonusArmoryClass: number
  backupSpeed: number
  backupBonusSpeed: number
  backupCurrentHp: number
  backupMaxHp: number
  backupBonusHp: number
}

export const useTransformStore = defineStore('transformStore', {
  state: () => ({
    transforms: {} as Record<string, TransformEntry>,
  }),
  persist: true,

  getters: {
    isTransformed: (state) => (characterId: string) => characterId in state.transforms,
    activeForm: (state) => (characterId: string): CompanionDto | null =>
      state.transforms[characterId]?.form ?? null,
  },

  actions: {
    transform(characterId: string, form: CompanionDto, roomId?: string) {
      const characterStore = useCharacterStore()
      const char = characterStore.character

      if (this.transforms[characterId]) {
        this.revert(characterId, roomId)
      }

      const entry: TransformEntry = {
        form,
        backupAbilities: (char.abilities ?? []).map(a => ({
          code: a.code ?? '',
          value: a.value ?? 0,
          bonusValue: a.bonusValue ?? 0,
        })),
        backupArmoryClass: char.armoryClass ?? 0,
        backupBonusArmoryClass: char.bonusArmoryClass ?? 0,
        backupSpeed: char.speed ?? 0,
        backupBonusSpeed: char.bonusSpeed ?? 0,
        backupCurrentHp: char.health?.currentHp ?? 0,
        backupMaxHp: char.health?.maxHp ?? 0,
        backupBonusHp: char.health?.bonusValue ?? 0,
      }
      this.transforms[characterId] = entry

      const oldHp = entry.backupCurrentHp
      this._applyFormToStore(characterId, form)

      if (roomId && form.maxHp != null) {
        const newCurrentHp = char.health?.currentHp ?? 0
        const newMaxHp = char.health?.maxHp ?? 0
        syncHpToBackend(roomId, characterId, oldHp, newCurrentHp, newMaxHp)
        if (form.armoryClass != null) {
          // Form AC becomes base AC; zero out the bonus so effective AC = form.armoryClass
          syncAcBonusToBackend(roomId, characterId, 0)
        }
      }
    },

    revert(characterId: string, roomId?: string) {
      const entry = this.transforms[characterId]
      if (!entry) return

      const characterStore = useCharacterStore()
      const char = characterStore.character

      const currentHpBeforeRevert = char.health?.currentHp ?? 0

      if (char.abilities) {
        for (const ab of char.abilities) {
          const backup = entry.backupAbilities.find(b => b.code === ab.code)
          if (backup) {
            ab.value = backup.value
            ab.bonusValue = backup.bonusValue
          }
        }
      }
      char.armoryClass = entry.backupArmoryClass
      char.bonusArmoryClass = entry.backupBonusArmoryClass
      char.speed = entry.backupSpeed
      char.bonusSpeed = entry.backupBonusSpeed
      if (char.health) {
        char.health.currentHp = entry.backupCurrentHp
        char.health.maxHp = entry.backupMaxHp
        char.health.bonusValue = entry.backupBonusHp
      }

      if (roomId) {
        syncHpToBackend(roomId, characterId, currentHpBeforeRevert, entry.backupCurrentHp, entry.backupMaxHp)
        syncAcBonusToBackend(roomId, characterId, entry.backupBonusArmoryClass)
      }

      delete this.transforms[characterId]
    },

    reapplyIfActive(characterId: string) {
      const entry = this.transforms[characterId]
      if (!entry) return
      this._applyFormToStore(characterId, entry.form, false)
    },

    _applyFormToStore(characterId: string, form: CompanionDto, setCurrentHp = true) {
      const characterStore = useCharacterStore()
      const char = characterStore.character

      if (char.abilities && form.abilities) {
        for (const ab of char.abilities) {
          const formAb = form.abilities.find(a => a.code === ab.code)
          if (formAb != null) {
            ab.value = formAb.value
            ab.bonusValue = 0
          }
        }
      }

      if (form.armoryClass != null) {
        const parsed = parseInt(String(form.armoryClass), 10)
        if (!isNaN(parsed)) {
          char.armoryClass = parsed
          char.bonusArmoryClass = 0
        }
      }

      if (form.speed != null) {
        const parsed = parseInt(String(form.speed), 10)
        if (!isNaN(parsed)) {
          char.speed = parsed
          char.bonusSpeed = 0
        }
      }

      if (form.maxHp != null && char.health) {
        char.health.maxHp = form.maxHp
        char.health.bonusValue = 0
        if (setCurrentHp) {
          char.health.currentHp = form.currentHp ?? form.maxHp
        }
      }
    },
  },
})

export function getFormAvatarUrl(form: CompanionDto): string | null {
  if (!form.imgUrl?.trim()) return null
  return `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.npc_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${form.imgUrl}`
}
