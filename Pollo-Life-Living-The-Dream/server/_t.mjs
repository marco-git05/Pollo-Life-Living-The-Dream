import mongoose from 'mongoose';
for (const family of [4, 6]) {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB, serverSelectionTimeoutMS: 12000, family });
    console.log(`IPv${family}: OK`); await mongoose.disconnect();
  } catch (e) { console.log(`IPv${family}: FAIL -`, e.reason?.servers ? [...e.reason.servers.values()].map(s=>s.error?.message).filter(Boolean)[0] || e.message : e.message); }
}
