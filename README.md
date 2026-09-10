# Ridgeway Physical Therapy

Patient booking, live slot holds, Stripe checkout, and clinic operations for a single-location physical therapy practice.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- PostgreSQL (Neon) + Prisma
- Socket.IO for live slot updates, with React Query polling as backup
- Stripe PaymentIntents (test mode) + webhook confirmation
- JWT sessions in an httpOnly cookie (`patient`, `therapist`, `admin`)

## Business rules

- One Seattle clinic. Self-pay only.
- Each therapist has 30 / 45 / 60 minute rates.
- Selecting a time holds it for 8 minutes while the patient pays.
- Full refund if cancelled 24+ hours before the visit. No refund inside 24 hours unless an admin overrides.
- Reschedule is allowed only outside the 24-hour window, onto another opening with the same therapist.

## Local setup

1. Copy `.env.example` to `.env.local` and set `DATABASE_URL`, `DIRECT_URL`, and `JWT_SECRET`.
2. Add Stripe test keys when you want card checkout. Without them, payment uses a local demo confirm path so you can still finish a booking.
3. Apply the schema and seed demo data:

```bash
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Patient | `patient@ridgewaypt.com` | `Clinic123!` |
| Therapist | `maya.chen@ridgewaypt.com` | `Clinic123!` |
| Admin | `admin@ridgewaypt.com` | `Clinic123!` |

## Stripe webhook (test mode)

```bash
stripe listen --forward-to localhost:3000/api/payments/webhook
```

Put the CLI `whsec_...` value in `STRIPE_WEBHOOK_SECRET`. Use card `4242 4242 4242 4242`.

Email and SMS confirmations are stubbed with `[notify:*:TODO]` log lines until a provider is connected.
