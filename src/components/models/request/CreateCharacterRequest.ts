// eslint-disable-next-line @typescript-eslint/no-unused-vars
type CreateCharacterRequest = {
    //---TECH-------------------
    roomId: string,
    //---MAIN-INFO--------------
    name: string,
    classCode: string,
    raceCode: string,
    abilities: AbilityShort[],
    skills: SkillShort[],
    //---ABOUT-----------------
    age: number,
    height: number,
    weight: number,
    attachments: string,
    history: string,
    ideals: string,
    personality: string,
    relationships: string,
    weaknesses: string
}

type AbilityShort = {
    code: string;
    value: number
}

type SkillShort = {
    code: string;
    type: string
}



