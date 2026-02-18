-- Add alignment fields to characters table (nullable for backwards compatibility)
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "patron_deity_id" TEXT;
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "alignment_value" INTEGER;

-- Add ideological influence fields to district_states table (with safe defaults)
ALTER TABLE "district_states" ADD COLUMN IF NOT EXISTS "influence_radiance" INTEGER NOT NULL DEFAULT 25;
ALTER TABLE "district_states" ADD COLUMN IF NOT EXISTS "influence_stability" INTEGER NOT NULL DEFAULT 25;
ALTER TABLE "district_states" ADD COLUMN IF NOT EXISTS "influence_entropy" INTEGER NOT NULL DEFAULT 25;
ALTER TABLE "district_states" ADD COLUMN IF NOT EXISTS "influence_doubt" INTEGER NOT NULL DEFAULT 25;
