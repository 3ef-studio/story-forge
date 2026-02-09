-- AlterTable
ALTER TABLE "characters" ADD COLUMN     "follow_up_history" JSONB,
ADD COLUMN     "heat" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pending_follow_ups" JSONB;

-- AlterTable
ALTER TABLE "consequence_threads" ADD COLUMN     "npc_id" TEXT;

-- AlterTable
ALTER TABLE "encounter_runs" ADD COLUMN     "gambit_effects" JSONB,
ADD COLUMN     "gambit_intent" TEXT,
ADD COLUMN     "gambit_outcome" TEXT,
ADD COLUMN     "gambit_roll" INTEGER;

-- AlterTable
ALTER TABLE "rivals" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "character_npcs" (
    "id" UUID NOT NULL,
    "character_id" UUID NOT NULL,
    "npc_id" TEXT NOT NULL,
    "familiarity" INTEGER NOT NULL DEFAULT 0,
    "disposition" INTEGER NOT NULL DEFAULT 0,
    "last_seen_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "character_npcs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "district_states" (
    "id" UUID NOT NULL,
    "character_id" UUID NOT NULL,
    "district_id" TEXT NOT NULL,
    "controlling_faction_id" TEXT,
    "control_value" INTEGER NOT NULL DEFAULT 50,
    "instability" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "district_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "character_npcs_character_id_idx" ON "character_npcs"("character_id");

-- CreateIndex
CREATE UNIQUE INDEX "character_npcs_character_id_npc_id_key" ON "character_npcs"("character_id", "npc_id");

-- CreateIndex
CREATE INDEX "district_states_character_id_idx" ON "district_states"("character_id");

-- CreateIndex
CREATE UNIQUE INDEX "district_states_character_id_district_id_key" ON "district_states"("character_id", "district_id");

-- AddForeignKey
ALTER TABLE "character_npcs" ADD CONSTRAINT "character_npcs_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
