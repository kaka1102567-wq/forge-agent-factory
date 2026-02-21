-- AlterTable
ALTER TABLE "test_cases" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'general',
ADD COLUMN     "passed" BOOLEAN,
ADD COLUMN     "reasoning" TEXT;
