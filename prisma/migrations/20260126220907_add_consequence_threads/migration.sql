-- CreateTable
CREATE TABLE "consequence_threads" (
    "id" UUID NOT NULL,
    "character_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "type" TEXT NOT NULL,
    "trigger_action_id" TEXT,
    "trigger_location_type" TEXT,
    "trigger_faction_id" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "injection_text" TEXT NOT NULL,
    "expires_in_actions" INTEGER NOT NULL DEFAULT 4,
    "actions_elapsed" INTEGER NOT NULL DEFAULT 0,
    "created_from_encounter_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consequence_threads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consequence_threads_character_id_idx" ON "consequence_threads"("character_id");

-- CreateIndex
CREATE INDEX "consequence_threads_character_id_is_active_idx" ON "consequence_threads"("character_id", "is_active");

-- AddForeignKey
ALTER TABLE "consequence_threads" ADD CONSTRAINT "consequence_threads_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
