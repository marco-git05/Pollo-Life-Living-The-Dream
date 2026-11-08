import mongoose from 'mongoose';

/**
 * One creature = one financial item (loan, card, paycheck, ...).
 * `type` matches an entry in src/creatures/catalog.js. `data` holds whatever
 * fields that type declares, so new creature types need no schema change.
 */
const creatureSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true },
    nickname: { type: String, trim: true, maxlength: 40 },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },

    nfcTagId: { type: String, index: true }, // serial of the physical card that summons it
    active: { type: Boolean, default: true, index: true },

    // Link to Nessie: which account it's tied to, and the Nessie bill id for recurring payments
    nessieAccountId: String,
    nessieBillId: String,

    // Written by the AI teammate's pipeline
    mood: { type: String, enum: ['happy', 'ok', 'worried', 'sad'], default: 'ok' },
    lastAdvice: String,

    // Written by the front end
    position: { x: { type: Number, default: 0.5, min: 0, max: 1 } },
  },
  { timestamps: true }
);

// One NFC card can only belong to one creature per user
creatureSchema.index({ owner: 1, nfcTagId: 1 }, { unique: true, partialFilterExpression: { nfcTagId: { $type: 'string' } } });

export default mongoose.model('Creature', creatureSchema);
