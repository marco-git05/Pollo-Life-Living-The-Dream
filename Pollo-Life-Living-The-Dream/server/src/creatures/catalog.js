/**
 * CREATURE CATALOG — the one place to add/edit creature types.
 * The client fetches this from GET /api/creatures/catalog, so the menu,
 * pop-up forms, sprites and AI prompts all update automatically.
 *
 * field.type: 'money' | 'percent' | 'number' | 'day' (1-31) | 'text' | 'select' | 'date'
 * nfcTags:    text payloads written on physical NFC cards that summon this creature
 * category:   'debt' | 'income' | 'expense' | 'goal' — used for dashboard grouping
 */
export const CREATURE_CATALOG = [
  {
    type: 'student_loan',
    name: 'Loanie',
    species: 'Owl',
    category: 'debt',
    color: '#7c6cf0',
    sprite: '/sprites/owl.png',
    greeting: "Hoo! I'm keeping track of your student loan. What does it look like?",
    nfcTags: ['creature:student_loan'],
    recurring: true,
    fields: [
      { key: 'balance', label: 'Loan balance', type: 'money', required: true },
      { key: 'interestRate', label: 'Interest rate', type: 'percent', required: true },
      { key: 'minPayment', label: 'Minimum monthly payment', type: 'money', required: true },
      { key: 'dueDay', label: 'Due day of month', type: 'day' },
      { key: 'loanType', label: 'Loan type', type: 'select', options: ['Federal subsidized', 'Federal unsubsidized', 'Private'] },
    ],
  },
  {
    type: 'credit_card',
    name: 'Swipe',
    species: 'Fox',
    category: 'debt',
    color: '#ef6c3c',
    sprite: '/sprites/fox.png',
    greeting: "Psst — I'm your credit card. Tell me my balance and I'll help you avoid interest!",
    nfcTags: ['creature:credit_card'],
    recurring: true,
    fields: [
      { key: 'balance', label: 'Current balance', type: 'money', required: true },
      { key: 'limit', label: 'Credit limit', type: 'money' },
      { key: 'apr', label: 'APR', type: 'percent', required: true },
      { key: 'minPayment', label: 'Minimum payment', type: 'money' },
      { key: 'dueDay', label: 'Due day of month', type: 'day' },
    ],
  },
  {
    type: 'income',
    name: 'Pip',
    species: 'Bunny',
    category: 'income',
    color: '#3fb27f',
    sprite: '/sprites/bunny.png',
    greeting: "Payday! How much hops into your account?",
    nfcTags: ['creature:income'],
    recurring: true,
    fields: [
      { key: 'amount', label: 'Amount per paycheck', type: 'money', required: true },
      { key: 'frequency', label: 'How often', type: 'select', options: ['Weekly', 'Every 2 weeks', 'Monthly', 'Allowance', 'Irregular'], required: true },
      { key: 'source', label: 'Where it comes from', type: 'text' },
    ],
  },
  {
    type: 'groceries',
    name: 'Munch',
    species: 'Hamster',
    category: 'expense',
    color: '#e8b931',
    sprite: '/sprites/hamster.png',
    greeting: "Snack time! What did the grocery run cost?",
    nfcTags: ['creature:groceries'],
    fields: [
      { key: 'monthlyBudget', label: 'Monthly grocery budget', type: 'money', required: true },
      { key: 'spentSoFar', label: 'Spent so far this month', type: 'money' },
    ],
  },
  {
    type: 'savings_goal',
    name: 'Acorn',
    species: 'Squirrel',
    category: 'goal',
    color: '#a0703c',
    sprite: '/sprites/squirrel.png',
    greeting: "I stash things for later. What are we saving for?",
    nfcTags: ['creature:savings_goal'],
    fields: [
      { key: 'goalName', label: 'Goal', type: 'text', required: true },
      { key: 'target', label: 'Target amount', type: 'money', required: true },
      { key: 'saved', label: 'Saved so far', type: 'money' },
      { key: 'deadline', label: 'Target date', type: 'date' },
    ],
  },
  {
    type: 'subscription',
    name: 'Loop',
    species: 'Snail',
    category: 'expense',
    color: '#4aa3df',
    sprite: '/sprites/snail.png',
    greeting: "I come back every month… slowly. Which subscription am I?",
    nfcTags: ['creature:subscription'],
    recurring: true,
    fields: [
      { key: 'service', label: 'Service name', type: 'text', required: true },
      { key: 'cost', label: 'Monthly cost', type: 'money', required: true },
      { key: 'dueDay', label: 'Billing day', type: 'day' },
    ],
  },
];

export const getCatalogEntry = (type) => CREATURE_CATALOG.find((c) => c.type === type);

export const findTypeByNfc = (payload) =>
  CREATURE_CATALOG.find((c) => c.nfcTags?.includes(payload))?.type;
