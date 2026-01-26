-- AlterTable
ALTER TABLE "characters" ADD COLUMN     "character_type" TEXT,
ADD COLUMN     "pending_levelup_attribute_pick" BOOLEAN NOT NULL DEFAULT false;
