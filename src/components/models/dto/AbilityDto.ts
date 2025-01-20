interface SkillDto {
    name: string; // Название навыка (например, "Атлетика")
    code: string; // Код навыка (например, "ATHL")
    up: boolean; // Указывает, прокачан ли навык
}

interface AbilityDto {
    code: string; // Код способности (например, "STR")
    value: number; // Значение способности
    name: string; // Название способности (например, "Сила")
    skills?: SkillDto[]; // Список навыков, связанных с этой способностью (опционально)
}
