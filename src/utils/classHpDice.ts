/** Хиты класса в API: «число_кости+КОД_ХАРАКТЕРИСТИКИ», напр. 8+CON */

const DEFAULT_DIE = "8";
const DEFAULT_ABILITY = "CON";
const ALLOWED_HIT_DICE = new Set(["6", "8", "10", "12"]);

export const HP_HIT_DIE_OPTIONS = [
  {value: "6", label: "d6"},
  {value: "8", label: "d8"},
  {value: "10", label: "d10"},
  {value: "12", label: "d12"},
] as const;

export function parseClassHpDice(raw: string | undefined | null): {die: string; ability: string} {
  const s = (raw ?? "").trim();
  if (!s) return {die: DEFAULT_DIE, ability: DEFAULT_ABILITY};

  const withPlus = /^(\d+)\+([A-Za-z]{2,6})$/i.exec(s);
  if (withPlus) {
    return {
      die: clampHitDieFace(withPlus[1]),
      ability: withPlus[2].toUpperCase(),
    };
  }

  const dWithPlus = /^d(\d+)\+([A-Za-z]{2,6})$/i.exec(s);
  if (dWithPlus) {
    return {
      die: clampHitDieFace(dWithPlus[1]),
      ability: dWithPlus[2].toUpperCase(),
    };
  }

  const dOnly = /^d(\d+)$/i.exec(s);
  if (dOnly) {
    return {die: clampHitDieFace(dOnly[1]), ability: DEFAULT_ABILITY};
  }

  const digitsOnly = /^(\d+)$/.exec(s);
  if (digitsOnly) {
    return {die: clampHitDieFace(digitsOnly[1]), ability: DEFAULT_ABILITY};
  }

  return {die: DEFAULT_DIE, ability: DEFAULT_ABILITY};
}

export function clampHitDieFace(die: string): string {
  const d = String(die).replace(/\D/g, "") || DEFAULT_DIE;
  if (ALLOWED_HIT_DICE.has(d)) return d;
  return DEFAULT_DIE;
}

export function formatClassHpDice(die: string, ability: string): string {
  const d = clampHitDieFace(die);
  const a = (ability ?? DEFAULT_ABILITY).toUpperCase();
  return `${d}+${a}`;
}

/** Короткая подпись для чипа (как раньше — только кость) */
export function hpDiceChipLabel(raw: string | undefined | null): string {
  const {die} = parseClassHpDice(raw);
  return `d${die}`;
}

const ABILITY_NAMES_RU: Record<string, string> = {
  STR: "Сила",
  DEX: "Ловкость",
  CON: "Телосложение",
  INT: "Интеллект",
  WIS: "Мудрость",
  CHA: "Харизма",
};

export function formatClassHpDiceDisplayRu(raw: string | undefined | null): string {
  const {die, ability} = parseClassHpDice(raw);
  const name = ABILITY_NAMES_RU[ability] ?? ability;
  return `d${die} + ${name}`;
}

/** Привести сохранённое значение к каноническому виду N+CODE */
export function normalizeClassHpDice(raw: string | undefined | null): string {
  const p = parseClassHpDice(raw);
  return formatClassHpDice(p.die, p.ability);
}
