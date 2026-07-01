import { defineStore } from 'pinia'
import type { CompanionDto } from '@/api/companionApi.types'
import { useCharacterStore } from '@/stores/CharacterStore'
import { FILE_STORAGE_INTEGRATION_ROUTES } from '@/config/integrationRoutes'

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
    transform(characterId: string, form: CompanionDto) {
      const characterStore = useCharacterStore()
      const char = characterStore.character

      if (this.transforms[characterId]) {
        this.revert(characterId)
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

      this._applyFormToStore(characterId, form)
    },

    revert(characterId: string) {
      const entry = this.transforms[characterId]
      if (!entry) return

      const characterStore = useCharacterStore()
      const char = characterStore.character

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

      delete this.transforms[characterId]
    },

    reapplyIfActive(characterId: string) {
      const entry = this.transforms[characterId]
      if (!entry) return
      this._applyFormToStore(characterId, entry.form)
    },

    _applyFormToStore(characterId: string, form: CompanionDto) {
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
        char.health.currentHp = form.currentHp ?? form.maxHp
        char.health.bonusValue = 0
      }
    },
  },
})

export function getFormAvatarUrl(form: CompanionDto): string | null {
  if (!form.imgUrl?.trim()) return null
  return `${FILE_STORAGE_INTEGRATION_ROUTES.baseURL}${FILE_STORAGE_INTEGRATION_ROUTES.api}${FILE_STORAGE_INTEGRATION_ROUTES.npc_images_bucket}${FILE_STORAGE_INTEGRATION_ROUTES.download}/${form.imgUrl}`
}
