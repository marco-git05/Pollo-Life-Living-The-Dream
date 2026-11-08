// THIS IS DUMMY DATA
// eventually, we will use real data used by nessie and the database 

export const user = {
  name: 'Sam',
};

// Account balances (liabilities are positive numbers; `kind` says which side)
export const accounts = [
  { id: 'checking', name: 'Checking', kind: 'asset', balance: 1150 },
  { id: 'savings', name: 'Savings', kind: 'asset', balance: 3200 },
  { id: 'card', name: 'Credit card', kind: 'debt', balance: 1860, limit: 3000 },
  { id: 'loan', name: 'Student loan', kind: 'debt', balance: 18400 },
];

// Spending this month, by category
export const spending = [
  { name: 'Rent', amount: 1050 },
  { name: 'Groceries', amount: 380 },
  { name: 'Dining', amount: 210 },
  { name: 'Transport', amount: 160 },
  { name: 'Fun', amount: 145 },
  { name: 'Other', amount: 120 },
  { name: 'Subscriptions', amount: 65 },
];

const monthlyExpenses = spending.reduce((sum, s) => sum + s.amount, 0);

// Inputs used to compute the health indicators
export const profile = {
  monthlyIncome: 2900,
  monthlyExpenses, // living costs, excluding debt payments
  monthlyDebtPayments: 430, // student loan 310 + card 120
  savingsBalance: 3200,
  creditBalance: 1860,
  creditLimit: 3000,
};

// Forecast setup: checking balance projected 6 months out
export const forecastSetup = {
  startBalance: 1150,
  safetyBuffer: 500,
  // one-off obligations; monthOffset 0 = now
  events: [{ monthOffset: 4, amount: -480, label: 'Annual car insurance' }],
};

// Student loan used by the what-if simulator
export const studentLoan = {
  balance: 18400,
  apr: 5.5,
  payment: 310,
};

export const news = [
  {
    id: 'n1',
    tag: 'Loans',
    headline: 'What federal student loan borrowers should know about repayment options',
    source: 'Sample News',
    time: '2h ago',
  },
  {
    id: 'n2',
    tag: 'Markets',
    headline: 'Stocks end the week mixed as investors weigh interest rate signals',
    source: 'Sample Markets',
    time: '5h ago',
  },
  {
    id: 'n3',
    tag: 'Credit',
    headline: 'Credit card APRs stay elevated: how to lower what you pay in interest',
    source: 'Sample Finance',
    time: 'Yesterday',
  },
  {
    id: 'n4',
    tag: 'Savings',
    headline: 'High-yield savings accounts: are rates still worth chasing?',
    source: 'Sample News',
    time: 'Yesterday',
  },
];

// dueInDays: null = no hard deadline. creatureId links to a village creature.
export const priorities = [
  { id: 'p1', title: 'Credit card minimum payment', amount: 120, dueInDays: 3, urgency: 'high', creatureId: 'credit-card' },
  { id: 'p2', title: 'Student loan payment', amount: 310, dueInDays: 12, urgency: 'high', creatureId: 'student-loan' },
  { id: 'p3', title: 'Pay card below 30% utilization', amount: 960, dueInDays: null, urgency: 'med', creatureId: 'credit-card' },
  { id: 'p4', title: 'Add to emergency fund', amount: 150, dueInDays: null, urgency: 'med', creatureId: 'savings' },
  { id: 'p5', title: 'Review subscriptions', amount: 65, dueInDays: null, urgency: 'low', creatureId: 'spending' },
];

// Placeholder for what Nemotron will return (title / body / actions)
export const tips = [
  {
    id: 't1',
    title: 'Your card is at 62% utilization',
    body: 'Paying down part of the balance this week can lift your credit score and cut interest.',
    actions: ['Pay $400 now', 'Set a reminder'],
  },
  {
    id: 't2',
    title: 'Emergency fund covers about 1.5 months',
    body: 'A small automatic transfer each payday builds toward a 3-month cushion.',
    actions: ['Auto-save $85'],
  },
  {
    id: 't3',
    title: 'Try an extra loan payment',
    body: 'Use the what-if simulator to see how a little extra each month shortens your payoff.',
    actions: ['Open simulator'],
  },
];

// Village creatures. shape: circle | square | triangle | diamond | pill
// mood: happy | neutral | worried
export const creatures = [
  {
    id: 'income',
    name: 'Sprout',
    kind: 'Income',
    amount: '$2,900 / mo',
    shape: 'circle',
    color: '#a3a380',
    mood: 'happy',
    note: 'Paycheck lands every other Friday.',
  },
  {
    id: 'student-loan',
    name: 'Boulder',
    kind: 'Student loan',
    amount: '$18,400 left',
    shape: 'square',
    color: '#bb8588',
    mood: 'neutral',
    note: '$310 due on the 20th at 5.5% APR.',
  },
  {
    id: 'credit-card',
    name: 'Swipe',
    kind: 'Credit card',
    amount: '$1,860 balance',
    shape: 'triangle',
    color: '#d8a48f',
    mood: 'worried',
    note: '62% utilization. Minimum $120 is due soon.',
  },
  {
    id: 'savings',
    name: 'Acorn',
    kind: 'Savings',
    amount: '$3,200 saved',
    shape: 'diamond',
    color: '#d6ce93',
    mood: 'worried',
    note: 'About 1.5 months of expenses. Goal: 3 months.',
  },
  {
    id: 'spending',
    name: 'Basket',
    kind: 'Spending',
    amount: '$2,130 this month',
    shape: 'pill',
    color: '#c4b89a',
    mood: 'neutral',
    note: 'Dining is running a bit above last month.',
  },
];
