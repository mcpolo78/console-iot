-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('TEMPERATURE', 'BATTERY');

-- CreateTable
CREATE TABLE "Alert" (
    "id" SERIAL NOT NULL,
    "deviceId" INTEGER NOT NULL,
    "type" "AlertType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "message" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Alert_at_idx" ON "Alert"("at");

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

