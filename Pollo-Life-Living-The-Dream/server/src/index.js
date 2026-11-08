import app from './app.js';
import { connectDB } from './config/db.js';
import { nessieConfigured } from './services/nessie.js';

const port = process.env.PORT || 4000;
try {
  await connectDB();
  app.listen(port, () => console.log(`API on http://localhost:${port}  (Nessie: ${nessieConfigured() ? 'on' : 'no key'})`));
} catch (err) {
  console.error(`\n✖ ${err.message}\n`);
  process.exit(1);
}

export default app;
