-- Migrate leverage from JSON blob to integer columns
-- Extract values from existing JSON, then drop the JSON column

ALTER TABLE "characters" ADD COLUMN "leverage_control" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "characters" ADD COLUMN "leverage_stability" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "characters" ADD COLUMN "leverage_position" INTEGER NOT NULL DEFAULT 0;

-- Copy existing JSON values into integer columns
UPDATE "characters"
SET
  "leverage_control" = COALESCE(("leverage"->>'control')::INTEGER, 0),
  "leverage_stability" = COALESCE(("leverage"->>'stability')::INTEGER, 0),
  "leverage_position" = COALESCE(("leverage"->>'position')::INTEGER, 0)
WHERE "leverage" IS NOT NULL;

-- Drop the old JSON column
ALTER TABLE "characters" DROP COLUMN "leverage";
