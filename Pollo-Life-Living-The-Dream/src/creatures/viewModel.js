// Turns a creature (Mongo doc) + its catalog entry into what the UI needs.
import { fmt } from '../utils/finance';

// Backend moods: happy | ok | worried | sad. The village engine uses these names:
const MOODS = { happy: 'happy', ok: 'neutral', worried: 'worried', sad: 'sad' };

export const MOOD_LABEL = { happy: 'Thriving', ok: 'Steady', worried: 'Needs attention', sad: 'Struggling' };
export const MOOD_TONE = { happy: 'good', ok: 'ok', worried: 'warn', sad: 'warn' };

// Placeholder shapes until the pixel-art sprites exist (the catalog's `sprite` is used when the file loads).
const SHAPES = {
  student_loan: 'square',
  credit_card: 'triangle',
  income: 'circle',
  groceries: 'pill',
  savings_goal: 'diamond',
  subscription: 'hexagon',
};

export const typeLabel = (type) => String(type).replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

const money = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return fmt(n, Number.isInteger(n) ? 0 : 2);
};

export function formatField(field, value) {
  if (value === undefined || value === null || value === '') return '—';
  switch (field.type) {
    case 'money':
      return money(value);
    case 'percent':
      return `${value}%`;
    case 'day':
      return `Day ${value}`;
    case 'date': {
      const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
      return Number.isNaN(d.getTime())
        ? String(value)
        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    default:
      return String(value);
  }
}

// One-line headline for a creature, per type.
export function summaryFor(type, data = {}) {
  switch (type) {
    case 'student_loan':
      return `${money(data.balance)} left`;
    case 'credit_card':
      return `${money(data.balance)} balance`;
    case 'income':
      return `${money(data.amount)} · ${data.frequency ?? 'per paycheck'}`;
    case 'groceries':
      return `${money(data.spentSoFar ?? 0)} of ${money(data.monthlyBudget)}`;
    case 'savings_goal':
      return `${money(data.saved ?? 0)} of ${money(data.target)}`;
    case 'subscription':
      return `${money(data.cost)} / mo`;
    default:
      return '';
  }
}

// What the village draws and the chip menu lists.
export function toVillageCreature(creature, entry) {
  return {
    id: creature._id,
    name: creature.nickname || entry?.name || typeLabel(creature.type),
    shape: SHAPES[creature.type] ?? 'circle',
    color: entry?.color ?? '#a3a380',
    sprite: entry?.sprite ?? null,
    mood: MOODS[creature.mood] ?? 'neutral',
    positionX: creature.position?.x ?? null,
  };
}
