// eslint-disable-next-line @typescript-eslint/no-unused-vars
type AbilityResponse = {
    name: string;
    code: string;
    roomId: string;
    defaultValue: number;
    modifierValue: number;
    byCoinsValue: number;
    bonusValue: number;
    skills: Skill[];
}

type Skill = {
    name: string;
    code: string;
}
