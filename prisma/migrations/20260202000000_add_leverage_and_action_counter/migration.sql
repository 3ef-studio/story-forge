-- AlterTable
ALTER TABLE "characters" ADD COLUMN "leverage" JSONB NOT NULL DEFAULT '{"control":0,"stability":0,"position":0}';
ALTER TABLE "characters" ADD COLUMN "action_counter" INTEGER NOT NULL DEFAULT 0;
