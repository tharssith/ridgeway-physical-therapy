ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "ticketCode" TEXT;

UPDATE "Booking"
SET "ticketCode" = 'RPT-' || UPPER(RIGHT(REPLACE("id", '-', ''), 6))
WHERE "ticketCode" IS NULL;

ALTER TABLE "Booking" ALTER COLUMN "ticketCode" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Booking_ticketCode_key" ON "Booking"("ticketCode");
