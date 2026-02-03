-- CreateTable
CREATE TABLE "encounter_runs" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "character_id" UUID NOT NULL,
    "user_id" UUID,
    "action_type" TEXT NOT NULL,
    "encounter_id" TEXT,
    "seed_id" UUID,
    "encounter_type" TEXT NOT NULL,
    "difficulty_tier" INTEGER NOT NULL,
    "district" TEXT,
    "tags" JSONB,
    "factions" JSONB,
    "npc_id" TEXT,
    "npc_name" TEXT,
    "rival_id" UUID,
    "rival_name" TEXT,
    "opponent_kind" TEXT,
    "opponent_name" TEXT,
    "opponent_archetype" TEXT,
    "opponent_threat_tier" INTEGER,
    "prep_type" TEXT,
    "prep_power_id" TEXT,
    "focus_mode" TEXT,
    "focus_modifier" INTEGER,
    "leverage_db_start" JSONB,
    "leverage_gained" JSONB,
    "leverage_spent" JSONB,
    "leverage_final" JSONB,
    "action_counter_before" INTEGER,
    "action_counter_after" INTEGER,
    "decay_applied" BOOLEAN,
    "decay_removed_type" TEXT,
    "turns" JSONB,
    "conflict_result" TEXT,
    "turns_used" INTEGER,
    "final_resources" JSONB,
    "reward_summary" JSONB,
    "is_conflict_driven" BOOLEAN NOT NULL DEFAULT true,
    "execute_ms" INTEGER,
    "resolve_ms" INTEGER,

    CONSTRAINT "encounter_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "encounter_runs_character_id_created_at_idx" ON "encounter_runs"("character_id", "created_at");

-- CreateIndex
CREATE INDEX "encounter_runs_encounter_type_idx" ON "encounter_runs"("encounter_type");

-- CreateIndex
CREATE INDEX "encounter_runs_difficulty_tier_idx" ON "encounter_runs"("difficulty_tier");
