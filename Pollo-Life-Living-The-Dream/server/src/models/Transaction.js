import mongoose from 'mongoose';

/**
 * Our own record of every money event the app creates in Nessie
 * (creature "fed", bill paid, paycheck deposited). Lets the dashboard show
 * history even if Nessie is slow/down, and lets us tie a transaction to a creature.
 */
const transactionSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    creature: { type: mongoose.Schema.Types.ObjectId, ref: 'Creature' },
    kind: { type: String, enum: ['purchase', 'deposit', 'withdrawal', 'bill_payment', 'transfer'], required: true },
    amount: { type: Number, required: true, min: 0 },
    description: String,
    category: String, // e.g. groceries, student_loan, income — usually the creature type
    date: { type: Date, default: Date.now },
    nessieAccountId: String,
    nessieId: String, // _id of the object Nessie created
  },
  { timestamps: true }
);

transactionSchema.index({ owner: 1, date: -1 });

export default mongoose.model('Transaction', transactionSchema);
