-- AlterTable
ALTER TABLE "User" ADD COLUMN "dateOfBirth" DATE;
ALTER TABLE "User" ADD COLUMN "photoUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "memberNumber" TEXT;

UPDATE "User" AS u
SET "memberNumber" = t.member
FROM (
  SELECT id, 'RPT' || LPAD(ROW_NUMBER() OVER (ORDER BY "createdAt")::text, 8, '0') AS member
  FROM "User"
) AS t
WHERE u.id = t.id AND u."memberNumber" IS NULL;

UPDATE "User"
SET "dateOfBirth" = DATE '1988-04-12'
WHERE email = 'patient@ridgewaypt.com' AND "dateOfBirth" IS NULL;

UPDATE "User"
SET "dateOfBirth" = DATE '1994-09-03'
WHERE email = 'sofia.alvarez@example.com' AND "dateOfBirth" IS NULL;

ALTER TABLE "User" ALTER COLUMN "memberNumber" SET NOT NULL;
CREATE UNIQUE INDEX "User_memberNumber_key" ON "User"("memberNumber");
