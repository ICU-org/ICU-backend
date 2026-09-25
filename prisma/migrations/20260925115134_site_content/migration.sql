-- CreateEnum
CREATE TYPE "PartnerType" AS ENUM ('GOV', 'CARRIER', 'PRIVATE');

-- CreateEnum
CREATE TYPE "PartnerService" AS ENUM ('GPS', 'CAMERAS', 'ANALYTICS', 'MAINTENANCE');

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "description" JSONB,
    "type" "PartnerType" NOT NULL,
    "services" "PartnerService"[],
    "vehicleCount" INTEGER,
    "partnerSince" INTEGER,
    "logoFile" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageContent" (
    "slug" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "PageContent_pkey" PRIMARY KEY ("slug")
);

-- CreateIndex
CREATE INDEX "Partner_isVisible_sortOrder_idx" ON "Partner"("isVisible", "sortOrder");
