type AbilityModifier = {
    code: string; // Код характеристики (например, "DEX", "INT")
    value: number; // Значение модификатора
    count: number; // Дополнительный параметр (например, количество применений)
};

type Trait = {
    id: string; // Уникальный идентификатор свойства
    raceStatsId: string; // Идентификатор расы, связанный с этим свойством
    name: string; // Название свойства
    code: string; // Код свойства (например, "DARK_VISION")
    description: string; // Описание свойства
};

type RaceStats = {
    maxAge: number; // Максимальный возраст
    maxHeight: number; // Максимальный рост
    maxWeight: number; // Максимальный вес
    baseSpeed: number; // Базовая скорость
    abilityModifiers: AbilityModifier[]; // Массив модификаторов характеристик
    traits: Trait[]; // Массив особенностей
    proficiencies: string[]; // Профессии или навыки (пока пустой массив)
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type RaceResponse = {
    name: string; // Название расы
    description: string; // Описание расы
    code: string; // Код расы
    stats: RaceStats; // Статистика расы
};
