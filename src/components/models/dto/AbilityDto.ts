interface SkillDto {
    name: string; // Название навыка (например, "Атлетика")
    code: string; // Код навыка (например, "ATHL")
    up: boolean; // Указывает, прокачан ли навык
    masteryValue: number; // Указывает, сколько раз применяется бонус мастерства
    bonusValue: number; // Кастомное доп значение
    advantageValue?: number; // 1 - преимущество, 0 - обычный, -1 - помеха


}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface AbilityDto {
    code: string; // Код способности (например, "STR")
    value: number; // Значение способности
    bonusValue: number; // Значение способности
    name: string; // Название способности (например, "Сила")
    masteryCheckValue: number;
    masterySavingThrowValue: number;
    advantageCheckValue?: number;
    advantageSavingThrowValue?: number;
    skills?: SkillDto[]; // Список навыков, связанных с этой способностью (опционально)
}
