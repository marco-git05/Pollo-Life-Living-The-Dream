// npm run test:db — checks the Atlas connection and that we can write/read/delete
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';

try {
  await connectDB();
  const col = mongoose.connection.db.collection('_healthcheck');
  const { insertedId } = await col.insertOne({ at: new Date() });
  const doc = await col.findOne({ _id: insertedId });
  await col.deleteOne({ _id: insertedId });
  console.log('✔ write/read/delete OK', doc ? '' : '(read returned nothing?)');
  const names = (await mongoose.connection.db.listCollections().toArray()).map((c) => c.name);
  console.log('Collections:', names.join(', ') || '(none yet)');
} catch (e) {
  console.error('✖', e.message);
  process.exitCode = 1;
} finally {
  await disconnectDB().catch(() => {});
}
