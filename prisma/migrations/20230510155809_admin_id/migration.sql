/*
  Warnings:

  - A unique constraint covering the columns `[admin_id]` on the table `setting` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "setting" ADD COLUMN     "admin_id" BIGINT,
ADD COLUMN     "bot_username" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "setting_admin_id_key" ON "setting"("admin_id");
