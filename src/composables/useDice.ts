export interface DieResult {
  sides: number;
  value: number;
}

export interface DiceRollResult {
  dice: DieResult[];
  flat: number;
  total: number;
  isCrit: boolean;
  isCritFail: boolean;
}

function rollOne(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

export function parseDiceFormula(raw: string): { dice: { count: number; sides: number }[]; flat: number } {
  const dice: { count: number; sides: number }[] = [];
  let flat = 0;

  const s = raw.replace(/\s+/g, '').replace(/[−–]/g, '-');
  const terms = s.match(/[+-]?[^+-]+/g) ?? [];

  for (const term of terms) {
    const m = term.match(/^([+-]?)(\d*)d(\d+)$/i);
    if (m) {
      const sign = m[1] === '-' ? -1 : 1;
      const count = sign * Math.max(1, parseInt(m[2] || '1', 10));
      const sides = parseInt(m[3], 10);
      if (count > 0 && sides > 0) dice.push({ count, sides });
    } else {
      const n = parseInt(term, 10);
      if (!isNaN(n)) flat += n;
    }
  }

  return { dice, flat };
}

export function rollFormula(raw: string, isAttackRoll = false): DiceRollResult {
  const parsed = parseDiceFormula(raw);
  const results: DieResult[] = [];

  for (const { count, sides } of parsed.dice) {
    for (let i = 0; i < count; i++) {
      results.push({ sides, value: rollOne(sides) });
    }
  }

  const diceSum = results.reduce((s, d) => s + d.value, 0);
  const total = diceSum + parsed.flat;
  const mainD20 = isAttackRoll ? results.find(d => d.sides === 20) : null;

  return {
    dice: results,
    flat: parsed.flat,
    total,
    isCrit: mainD20?.value === 20,
    isCritFail: mainD20?.value === 1,
  };
}

export function rollAttack(bonus: number): DiceRollResult {
  return rollFormula(`d20+${bonus >= 0 ? '+' : ''}${bonus}`, true);
}
