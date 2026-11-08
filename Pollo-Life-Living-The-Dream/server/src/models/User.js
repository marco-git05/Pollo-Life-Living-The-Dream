import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true, minlength: 3, maxlength: 30 },
    passwordHash: { type: String, required: true, select: false }, // never returned unless asked for
    displayName: { type: String, trim: true, maxlength: 50 },
    ageGroup: { type: String, enum: ['kid', 'teen', 'young_adult', 'adult'], default: 'teen' },

    // Link to the mock bank in Capital One Nessie
    nessie: {
      customerId: String,
      accounts: [
        {
          _id: false,
          id: String, // Nessie account _id
          type: { type: String, enum: ['Checking', 'Savings', 'Credit Card'] },
          nickname: String,
        },
      ],
      lastSnapshot: mongoose.Schema.Types.Mixed, // cached result of bankSnapshot()
      syncedAt: Date,
    },

    // Owned by the AI teammate: which provider each AI role uses
    aiPrefs: { type: Map, of: String, default: {} },

    // Owned by the front-end teammates: village look / unlocks
    village: {
      theme: { type: String, default: 'meadow' },
      unlocked: { type: [String], default: [] },
    },
  },
  { timestamps: true }
);

userSchema.methods.toPublic = function () {
  return {
    id: this._id,
    username: this.username,
    displayName: this.displayName,
    ageGroup: this.ageGroup,
    hasBank: !!this.nessie?.customerId,
    bankAccounts: this.nessie?.accounts || [],
    aiPrefs: Object.fromEntries(this.aiPrefs || []),
    village: this.village,
  };
};

userSchema.methods.accountId = function (type) {
  return this.nessie?.accounts?.find((a) => a.type === type)?.id;
};

export default mongoose.model('User', userSchema);
