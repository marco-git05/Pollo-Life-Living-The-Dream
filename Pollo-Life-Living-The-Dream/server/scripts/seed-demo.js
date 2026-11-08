/**
 * npm run seed — creates a ready-to-demo user (login: demo / demo1234) with
 * a Nessie bank, transaction history and a few creatures.
 * Run again to reset that user.
 */
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../src/config/db.js';
import User from '../src/models/User.js';
import Creature from '../src/models/Creature.js';
import Transaction from '../src/models/Transaction.js';
import { provisionBank, getBankSnapshot, syncCreatureBill } from '../src/services/bankSync.js';
import { nessieConfigured } from '../src/services/nessie.js';

const USERNAME = process.argv[2] || 'demo';
const PASSWORD = 'demo1234';

try {
  await connectDB();

  const old = await User.findOne({ username: USERNAME });
  if (old) {
    await Promise.all([Creature.deleteMany({ owner: old._id }), Transaction.deleteMany({ owner: old._id }), old.deleteOne()]);
    console.log('Removed old demo user');
  }

  const user = await User.create({
    username: USERNAME,
    displayName: 'Demo Villager',
    ageGroup: 'young_adult',
    passwordHash: await bcrypt.hash(PASSWORD, 10),
  });

  if (nessieConfigured()) {
    await provisionBank(user, { seed: true });
    console.log('✔ Nessie bank created:', user.nessie.accounts.map((a) => a.type).join(', '));
  } else {
    console.log('… NESSIE_API_KEY not set, skipping bank');
  }

  const creatures = await Creature.insertMany([
    { owner: user._id, type: 'student_loan', nickname: 'Loanie', data: { balance: 18500, interestRate: 5.5, minPayment: 210, dueDay: 15, loanType: 'Federal unsubsidized' }, position: { x: 0.2 } },
    { owner: user._id, type: 'credit_card', nickname: 'Swipe', data: { balance: 640, limit: 1500, apr: 24.99, minPayment: 35, dueDay: 22 }, position: { x: 0.45 } },
    { owner: user._id, type: 'income', nickname: 'Pip', data: { amount: 320, frequency: 'Every 2 weeks', source: 'Part-time job' }, position: { x: 0.65 } },
    { owner: user._id, type: 'savings_goal', nickname: 'Acorn', data: { goalName: 'New laptop', target: 900, saved: 300 }, position: { x: 0.85 } },
  ]);
  for (const c of creatures) await syncCreatureBill(user, c);
  console.log(`✔ ${creatures.length} creatures added`);

  if (user.nessie?.customerId) {
    const snap = await getBankSnapshot(user, { force: true });
    console.log(`✔ Snapshot: cash $${snap.totalCash}, card $${snap.creditCardBalance}, ${snap.upcomingBills.length} upcoming bills`);
  }

  console.log(`\nLog in with  ${USERNAME} / ${PASSWORD}`);
} catch (e) {
  console.error('✖', e.message);
  process.exitCode = 1;
} finally {
  await disconnectDB().catch(() => {});
}
