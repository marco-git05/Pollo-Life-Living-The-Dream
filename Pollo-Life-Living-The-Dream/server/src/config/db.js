import mongoose from 'mongoose';

/**
 * Connects to MongoDB Atlas (or any MongoDB) and explains the usual Atlas
 * mistakes in plain English instead of a stack trace.
 */
export async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (mongoose.connection.readyState === 2) return mongoose.connection.asPromise();

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set in server/.env');
  if (uri.includes('<password>') || uri.includes('<user>'))
    throw new Error('MONGODB_URI still has <user>/<password> placeholders — paste your real Atlas credentials');

  mongoose.set('strictQuery', true);
  mongoose.connection.on('disconnected', () => console.warn('[db] disconnected'));
  mongoose.connection.on('reconnected', () => console.log('[db] reconnected'));

  try {
    await mongoose.connect(uri, {
      dbName: process.env.MONGODB_DB || undefined, // overrides the name in the URI if set
      serverSelectionTimeoutMS: 10_000,
      maxPoolSize: 10,
    });
  } catch (err) {
    throw new Error(explainMongoError(err));
  }

  const { host, name } = mongoose.connection;
  console.log(`[db] connected to ${name} @ ${host}`);
  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
}

function explainMongoError(err) {
  const msg = err?.message || String(err);
  if (/bad auth|authentication failed/i.test(msg))
    return 'Atlas rejected the username/password. Check Database Access in Atlas, and URL-encode special characters in the password (e.g. @ → %40).';
  if (/ENOTFOUND|querySrv/i.test(msg))
    return 'Could not find the Atlas cluster host. Re-copy the connection string from Atlas → Connect → Drivers.';
  if (/Server selection timed out|whitelist|IP/i.test(msg))
    return 'Timed out reaching Atlas. Most likely your IP is not allowed: Atlas → Network Access → Add IP Address (use 0.0.0.0/0 for a hackathon).';
  return `MongoDB connection failed: ${msg}`;
}

// Close cleanly on Ctrl+C / nodemon restarts
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.once(sig, async () => {
    await mongoose.disconnect().catch(() => {});
    process.exit(0);
  });
}
