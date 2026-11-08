// npm run test:nessie — checks the Nessie key works (read-only)
import { Nessie } from '../src/services/nessie.js';

try {
  const customers = await Nessie.getCustomers();
  const merchants = await Nessie.getMerchants();
  console.log(`✔ Nessie key works. ${customers.length} customers, ${merchants.length} merchants visible.`);
} catch (e) {
  console.error('✖', e.message);
  process.exitCode = 1;
}
