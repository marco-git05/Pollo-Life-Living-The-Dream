# Backend: MongoDB Atlas + Capital One Nessie

This covers the database and mock-bank parts of FinVillage. The front end and
the Nemotron/AI layer plug into it through the endpoints and the one function
listed below.

## Setup

1. **Atlas**
   - Create a free M0 cluster at mongodb.com/atlas.
   - **Database Access** → add a user with a password. Avoid `@ : / ?` in it, or URL-encode them.
   - **Network Access** → Add IP Address → `0.0.0.0/0` (fine for a hackathon; tighten later).
   - **Connect → Drivers** → copy the `mongodb+srv://…` string.
2. **Nessie** – sign in at http://api.nessieisreal.com and copy your API key.
3. In `server/`:
   ```bash
   cp .env.example .env     # paste MONGODB_URI, NESSIE_API_KEY, JWT_SECRET
   npm install
   npm run test:db          # ✔ write/read/delete OK
   npm run test:nessie      # ✔ Nessie key works
   npm run seed             # demo user: demo / demo1234
   npm run seed:demos       # case studies: jack / jack1234, john / john1234
   npm run dev              # API on http://localhost:4000
   ```
   Check http://localhost:4000/api/health — it should say `db: connected`, `nessie: configured`.

**Each teammate needs their own `server/.env`.** It's in `.gitignore`; share
the values privately, never in the repo.

## Collections

| Collection | What's in it | Who writes it |
|---|---|---|
| `users` | login, age group, Nessie customer + account ids, cached bank snapshot, AI prefs, village settings | auth routes, bank sync, AI prefs (AI), village (front end) |
| `creatures` | one per financial item; `type` + flexible `data` per `creatures/catalog.js`; NFC tag; linked Nessie bill; `mood`/`lastAdvice` | creature routes; mood/advice from AI |
| `transactions` | every money event the app created in Nessie, linked to a creature | `POST /api/bank/transactions` |
| `nfcscans` | normalized NFC payloads and scan metadata owned by a user | `POST /api/nfc` |

## API (all except register/login/catalog need `Authorization: Bearer <token>`)

**Auth**
| | | |
|---|---|---|
| POST | `/api/auth/register` | `{ username, password, displayName?, ageGroup? }` → `{ token, user, bankWarning? }`. Also creates a Nessie bank with demo history. |
| POST | `/api/auth/login` | `{ username, password }` → `{ token, user }` |
| GET / PATCH | `/api/auth/me` | profile; PATCH accepts `displayName, ageGroup, aiPrefs, village` |

**Creatures**
| | | |
|---|---|---|
| GET | `/api/creatures/catalog` | creature types, fields, colors, sprites (public) |
| GET | `/api/creatures` | user's creatures |
| POST | `/api/creatures` | `{ type, data, nickname?, nfcTagId? }`. Validated against the catalog. Loans, cards and subscriptions with `dueDay` + payment also get a recurring Nessie bill. |
| PATCH / DELETE | `/api/creatures/:id` | update (merges `data`) / remove (also removes its Nessie bill) |
| POST | `/api/creatures/scan` | `{ payload, serial }` from an NFC card → `{ creature \| null, type }` |

When `nfcTagId` is supplied while registering a creature, the creature is
created as pending and is excluded from the village until `/api/creatures/scan`
receives the matching serial for that logged-in user. This allows the same
physical tag to activate different creatures for different accounts.

**Bank (Nessie)**
| | | |
|---|---|---|
| GET | `/api/bank` | snapshot, or `null` if no bank. Cached ~2 min; `?refresh=1` forces it. |
| POST | `/api/bank/connect` | "Connect account" button: creates the mock bank if missing |
| POST | `/api/bank/seed` | adds demo history to an existing bank |
| POST | `/api/bank/transactions` | `{ kind, amount, description, accountType?, creatureId?, category?, toAccountType? }` |
| GET | `/api/bank/transactions` | `?creatureId=&limit=` |

`kind` is one of `purchase`, `deposit`, `withdrawal`, `bill_payment`, `transfer`.

**NFC**
| | | |
|---|---|---|
| GET | `/api/nfc?limit=50` | Recent scans, newest first; limit is capped at 100 |
| POST | `/api/nfc` | `{ payload, serial?, source? }` → saved scan |
| DELETE | `/api/nfc` | Clears the signed-in user's scan history |

`source` is `bridge`, `manual`, or `web-nfc`. Android Chrome can read NDEF text tags directly through the web app's Web NFC
reader and post the normalized payload to this endpoint. iPhone browsers do
not expose Web NFC, so iPhone users should use the manual payload fallback
until a native iOS reader is added.

Snapshot shape:
```json
{
  "syncedAt": "…",
  "totalCash": 1150,
  "creditCardBalance": 59.99,
  "last30Days": { "moneyIn": 640, "moneyOut": 153.34 },
  "upcomingBills": [{ "payee": "Loanie", "amount": 210, "nextDate": "2026-11-15", "status": "recurring" }],
  "accounts": [{ "id": "…", "type": "Checking", "nickname": "Everyday", "balance": 1090.65, "recent": [], "bills": [] }],
  "stale": true
}
```
`stale` only appears when Nessie was unreachable and the last cached copy was returned.

## Case-study demo accounts

Run `npm run seed:demos` to reset the two public demo accounts:

| Account | Password | Scenario |
|---|---|---|
| `jack` | `jack1234` | Young adult: job, student loan, first credit card, emergency fund |
| `john` | `john1234` | Working family: two incomes, kids' savings, emergency fund, family groceries |

These are intentionally simple credentials for a demo environment only.

## For the AI / Nemotron teammate

```js
import { getFinancialContext, applyCreatureMoods } from '../data/financialContext.js';

const ctx = await getFinancialContext(req.userId);   // creatures + bank + recent transactions, prompt-sized
// … call Nemotron with ctx …
await applyCreatureMoods(req.userId, result.creatureMoods); // [{ creatureId, mood, line }]
```
Mount your router in `src/index.js` where the comment says `// app.use('/api/ai', aiRoutes);`.
Store per-user model choices in `User.aiPrefs` (a Map of role → provider).

## For the front-end teammates

- Vite proxy: `server: { proxy: { '/api': 'http://localhost:4000' } }`, then call `/api/...`.
- Save `token` from register/login and send `Authorization: Bearer <token>`.
- Errors always come back as `{ "error": "message" }` with a sensible status code.
- Build creature forms from `GET /api/creatures/catalog` (`fields[].type` is `money | percent | number | day | text | select | date`).
- "Feeding" a creature = `POST /api/bank/transactions` with its `creatureId`.

## Nessie gotchas

- Purchases need a `merchant_id`. `bankSync.getMerchantId()` creates and caches our own merchants (Village Grocer, Acorn Cafe…).
- Nessie loans only support home/auto/small business, so student loans are modelled as **recurring bills** instead.
- `recurring_date` must be 1–28; days 29–31 are clamped to 28.
- Nessie can be slow. Requests time out after 10s, and snapshots fall back to the cached copy.
