-- CreateTable
CREATE TABLE "character_goals" (
    "id" UUID NOT NULL,
    "character_id" UUID NOT NULL,
    "goal_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "target_value" INTEGER NOT NULL,
    "current_progress" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "xp_reward" INTEGER NOT NULL DEFAULT 50,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "character_goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "character_goals_character_id_idx" ON "character_goals"("character_id");

-- CreateIndex
CREATE INDEX "character_goals_is_active_idx" ON "character_goals"("is_active");

-- AddForeignKey
ALTER TABLE "character_goals" ADD CONSTRAINT "character_goals_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
