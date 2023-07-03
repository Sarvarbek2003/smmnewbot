-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "return" BOOLEAN;

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "edited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "refill_day" INTEGER;
