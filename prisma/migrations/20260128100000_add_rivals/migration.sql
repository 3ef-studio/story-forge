-- CreateTable
CREATE TABLE "rivals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "character_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "personality" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "attributes" JSONB NOT NULL,
    "powers" JSONB NOT NULL,
    "hostility" INTEGER NOT NULL DEFAULT 0,
    "notoriety" INTEGER NOT NULL DEFAULT 0,
    "last_encounter_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rivals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rivals_character_id_key" ON "rivals"("character_id");

-- AddForeignKey
ALTER TABLE "rivals" ADD CONSTRAINT "rivals_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
