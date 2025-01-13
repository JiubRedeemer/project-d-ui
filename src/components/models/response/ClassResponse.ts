type SavingThrowAbility = {
    code: string;
    name: string;
};

type AvailableSkill = {
    type: string;
    count: number;
    of: string[];
};

type Stats = {
    id: string;
    hpDice: string;
    savingThrowsAbilities: SavingThrowAbility[];
    availableSkills: AvailableSkill[];
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type ClassResponse = {
    name: string;
    description: string;
    code: string;
    stats: Stats;
};
