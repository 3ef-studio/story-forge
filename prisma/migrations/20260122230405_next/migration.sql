-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "characters" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "origin_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "current_xp" INTEGER NOT NULL DEFAULT 0,
    "current_hp" INTEGER NOT NULL DEFAULT 100,
    "max_hp" INTEGER NOT NULL DEFAULT 100,
    "current_energy" INTEGER NOT NULL DEFAULT 100,
    "max_energy" INTEGER NOT NULL DEFAULT 100,
    "money" INTEGER NOT NULL DEFAULT 0,
    "last_energy_reset" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_attributes" (
    "id" UUID NOT NULL,
    "character_id" UUID NOT NULL,
    "attribute_id" TEXT NOT NULL,
    "current_value" INTEGER NOT NULL,

    CONSTRAINT "character_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_powers" (
    "id" UUID NOT NULL,
    "character_id" UUID NOT NULL,
    "power_id" TEXT NOT NULL,
    "current_level" INTEGER NOT NULL DEFAULT 1,
    "current_xp" INTEGER NOT NULL DEFAULT 0,
    "times_used" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "character_powers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faction_reputations" (
    "id" UUID NOT NULL,
    "character_id" UUID NOT NULL,
    "faction_id" TEXT NOT NULL,
    "reputation" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "faction_reputations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" UUID NOT NULL,
    "character_id" UUID NOT NULL,
    "item_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "is_equipped" BOOLEAN NOT NULL DEFAULT false,
    "equipment_slot" TEXT,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_events" (
    "id" UUID NOT NULL,
    "character_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "full_description" TEXT,
    "narrative_weight" INTEGER NOT NULL DEFAULT 5,
    "tags" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cached_encounters" (
    "id" UUID NOT NULL,
    "encounter_type" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "faction_context" TEXT[],
    "location_type" TEXT,
    "description" TEXT NOT NULL,
    "choices" JSONB NOT NULL,
    "outcomes" JSONB NOT NULL,
    "times_used" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),

    CONSTRAINT "cached_encounters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_cooldowns" (
    "id" UUID NOT NULL,
    "character_id" UUID NOT NULL,
    "action_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "action_cooldowns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "characters_user_id_key" ON "characters"("user_id");

-- CreateIndex
CREATE INDEX "character_attributes_character_id_idx" ON "character_attributes"("character_id");

-- CreateIndex
CREATE UNIQUE INDEX "character_attributes_character_id_attribute_id_key" ON "character_attributes"("character_id", "attribute_id");

-- CreateIndex
CREATE INDEX "character_powers_character_id_idx" ON "character_powers"("character_id");

-- CreateIndex
CREATE UNIQUE INDEX "character_powers_character_id_power_id_key" ON "character_powers"("character_id", "power_id");

-- CreateIndex
CREATE INDEX "faction_reputations_character_id_idx" ON "faction_reputations"("character_id");

-- CreateIndex
CREATE UNIQUE INDEX "faction_reputations_character_id_faction_id_key" ON "faction_reputations"("character_id", "faction_id");

-- CreateIndex
CREATE INDEX "inventory_items_character_id_idx" ON "inventory_items"("character_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_character_id_item_id_key" ON "inventory_items"("character_id", "item_id");

-- CreateIndex
CREATE INDEX "story_events_character_id_idx" ON "story_events"("character_id");

-- CreateIndex
CREATE INDEX "story_events_created_at_idx" ON "story_events"("created_at" DESC);

-- CreateIndex
CREATE INDEX "cached_encounters_encounter_type_difficulty_idx" ON "cached_encounters"("encounter_type", "difficulty");

-- CreateIndex
CREATE INDEX "action_cooldowns_character_id_idx" ON "action_cooldowns"("character_id");

-- CreateIndex
CREATE INDEX "action_cooldowns_expires_at_idx" ON "action_cooldowns"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "action_cooldowns_character_id_action_id_key" ON "action_cooldowns"("character_id", "action_id");

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_attributes" ADD CONSTRAINT "character_attributes_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_powers" ADD CONSTRAINT "character_powers_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faction_reputations" ADD CONSTRAINT "faction_reputations_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_events" ADD CONSTRAINT "story_events_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_cooldowns" ADD CONSTRAINT "action_cooldowns_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
