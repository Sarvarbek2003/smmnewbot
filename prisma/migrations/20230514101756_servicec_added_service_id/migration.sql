/*
  Warnings:

  - Added the required column `service_id` to the `services` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "services" ADD COLUMN     "service_id" INTEGER NULL;
