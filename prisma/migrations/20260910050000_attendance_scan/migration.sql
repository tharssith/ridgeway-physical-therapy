-- AlterTable
CREATE TYPE "Attendance" AS ENUM ('UNMARKED', 'PRESENT', 'ABSENT');

ALTER TABLE "Booking" ADD COLUMN "attendance" "Attendance" NOT NULL DEFAULT 'UNMARKED';
ALTER TABLE "Booking" ADD COLUMN "visitStart" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "visitEnd" TIMESTAMP(3);

UPDATE "Booking" AS b
SET "visitStart" = s."startTime", "visitEnd" = s."endTime"
FROM "AvailabilitySlot" AS s
WHERE b."slotId" = s.id;

ALTER TABLE "Booking" ALTER COLUMN "visitStart" SET NOT NULL;
ALTER TABLE "Booking" ALTER COLUMN "visitEnd" SET NOT NULL;
ALTER TABLE "Booking" ALTER COLUMN "slotId" DROP NOT NULL;
