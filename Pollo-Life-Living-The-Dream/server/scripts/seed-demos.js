import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../src/config/db.js';
import User from '../src/models/User.js';
import Creature from '../src/models/Creature.js';
import Transaction from '../src/models/Transaction.js';
import { provisionBank, syncCreatureBill } from '../src/services/bankSync.js';
import { nessieConfigured } from '../src/services/nessie.js';

const profiles = [
  {
    username: 'jack',
    password: 'jack1234',
    displayName: 'Jack',
    ageGroup: 'young_adult',
    creatures: [
      { type: 'savings_goal', nickname: 'Emergency fund', data: { goalName: 'Emergency fund', target: 3000, saved: 450 }, position: { x: 0.15 } },
      { type: 'student_loan', nickname: 'Student loan', nfcTagId: '04:C4:72:E2:7B:1D:90', active: false, data: { balance: 18500, interestRate: 5.5, minPayment: 210, dueDay: 15, loanType: 'Federal unsubsidized' }, position: { x: 0.4 } },
      { type: 'credit_card', nickname: 'First credit card', data: { balance: 640, limit: 1500, apr: 24.99, minPayment: 35, dueDay: 22 }, position: { x: 0.65 } },
      { type: 'income', nickname: 'First full-time job', data: { amount: 1850, frequency: 'Every 2 weeks', source: 'Full-time job' }, position: { x: 0.85 } },
    ],
  },
  {
    username: 'john',
    password: 'john1234',
    displayName: 'John',
    ageGroup: 'adult',
    creatures: [
      { type: 'income', nickname: 'John income', data: { amount: 2800, frequency: 'Every 2 weeks', source: 'Household income' }, position: { x: 0.12 } },
      { type: 'income', nickname: 'Second household income', data: { amount: 2400, frequency: 'Every 2 weeks', source: 'Household income' }, position: { x: 0.3 } },
      { type: 'savings_goal', nickname: 'Kids savings', nfcTagId: '04:C4:72:E2:7B:1D:90', active: false, data: { goalName: 'Kids savings', target: 10000, saved: 2100 }, position: { x: 0.48 } },
      { type: 'savings_goal', nickname: 'Emergency fund', data: { goalName: 'Emergency fund', target: 15000, saved: 6200 }, position: { x: 0.66 } },
      { type: 'groceries', nickname: 'Family groceries', data: { monthlyBudget: 1100, spentSoFar: 720 }, position: { x: 0.84 } },
    ],
  },
];

async function resetProfile(profile) {
  const old = await User.findOne({ username: profile.username });
  if (old) {
    await Promise.all([
      Creature.deleteMany({ owner: old._id }),
      Transaction.deleteMany({ owner: old._id }),
      old.deleteOne(),
    ]);
  }

  const user = await User.create({
    username: profile.username,
    displayName: profile.displayName,
    ageGroup: profile.ageGroup,
    passwordHash: await bcrypt.hash(profile.password, 10),
  });

  if (nessieConfigured()) {
    try {
      await provisionBank(user, { seed: true });
    } catch (error) {
      console.warn(`Nessie skipped for ${profile.username}: ${error.message}`);
    }
  }

  const creatures = await Creature.insertMany(profile.creatures.map((creature) => ({ ...creature, owner: user._id })));
  for (const creature of creatures) await syncCreatureBill(user, creature);
  console.log(`Created ${profile.username}: ${profile.password} (${creatures.length} creatures)`);
}

try {
  await connectDB();
  for (const profile of profiles) await resetProfile(profile);
} catch (error) {
  console.error('Demo seeding failed:', error.message);
  process.exitCode = 1;
} finally {
  await disconnectDB().catch(() => {});
}
