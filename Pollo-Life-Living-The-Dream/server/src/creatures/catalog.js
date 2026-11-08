/**
 * CREATURE CATALOG — the one place to add/edit creature types.
 * The client fetches this from GET /api/creatures/catalog, so the menu,
 * pop-up forms, sprites and AI prompts all update automatically.
 *
 * field.type: 'money' | 'percent' | 'number' | 'day' (1-31) | 'text' | 'select' | 'date'
 * nfcTags:    text payloads written on physical NFC cards that summon this creature
 * portrait:   large sprite for the creature ID card (sprite = small one for the village)
 * category:   'debt' | 'income' | 'expense' | 'goal' — used for dashboard grouping
 */
export const CREATURE_CATALOG = [
  {
    type: 'credit_card',
    name: 'Swipe',
    species: 'Fox',
    category: 'debt',
    color: '#d2386c',
    sprite: '/sprites/fox.webp',
    portrait: '/sprites/fox-big.webp',
    greeting: "Psst — I'm your credit card. Tell me my balance and I'll help you avoid interest!",
    nfcTags: ['creature:credit_card'],
    recurring: true,
    fields: [
      { key: 'balance', label: 'Current balance', type: 'money', required: true },
      { key: 'limit', label: 'Credit limit', type: 'money' },
      { key: 'apr', label: 'APR', type: 'percent', required: true },
      { key: 'minPayment', label: 'Minimum payment', type: 'money' },
      { key: 'dueDay', label: 'Due day of month', type: 'day' },
      { key: 'goalDate', label: 'Goal date', type: 'date' },
    ],
  },
  {
    type: 'income',
    name: 'Pip',
    species: 'Bug',
    category: 'income',
    color: '#3fb27f',
    sprite: '/sprites/bug.webp',
    portrait: '/sprites/bug-big.webp',
    greeting: "Bzzz, payday! How much buzzes into your account?",
    nfcTags: ['creature:income'],
    recurring: true,
    fields: [
      { key: 'amount', label: 'Amount per paycheck', type: 'money', required: true },
      { key: 'frequency', label: 'How often', type: 'select', options: ['Weekly', 'Every 2 weeks', 'Monthly', 'Allowance', 'Irregular'], required: true },
      { key: 'source', label: 'Where it comes from', type: 'text' },
      { key: 'goalDate', label: 'Goal date', type: 'date' },
    ],
  },
  {
    type: 'subscription',
    name: 'Loop',
    species: 'Octopus',
    category: 'expense',
    color: '#7d3a94',
    sprite: '/sprites/octopus.webp',
    portrait: '/sprites/octopus-big.webp',
    greeting: "I keep a tentacle on your wallet every month. Which subscription am I?",
    nfcTags: ['creature:subscription'],
    recurring: true,
    fields: [
      { key: 'service', label: 'Service name', type: 'text', required: true },
      { key: 'cost', label: 'Monthly cost', type: 'money', required: true },
      { key: 'dueDay', label: 'Billing day', type: 'day' },
      { key: 'goalDate', label: 'Goal date', type: 'date' },
    ],
  },
];

export const getCatalogEntry = (type) => CREATURE_CATALOG.find((c) => c.type === type);

export const findTypeByNfc = (payload) =>
  CREATURE_CATALOG.find((c) => c.nfcTags?.includes(payload))?.type;
