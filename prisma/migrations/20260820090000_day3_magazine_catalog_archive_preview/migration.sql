-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "IssueSeason" AS ENUM ('SPRING', 'SUMMER', 'AUTUMN', 'WINTER');

-- CreateEnum
CREATE TYPE "MediaAssetKind" AS ENUM ('ISSUE_COVER', 'ISSUE_PREVIEW_PDF', 'ISSUE_DIGITAL_PDF');

-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "name" TEXT,
ADD COLUMN     "passwordHash" TEXT;

-- CreateTable
CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminLoginAttempt" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ipHash" TEXT,
    "successful" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "kind" "MediaAssetKind" NOT NULL,
    "provider" TEXT NOT NULL,
    "bucket" TEXT,
    "objectKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksum" TEXT,
    "originalFilename" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "pageCount" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MagazineIssue" (
    "id" TEXT NOT NULL,
    "issueNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "publicationDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "tableOfContents" JSONB,
    "priceIrr" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "status" "IssueStatus" NOT NULL DEFAULT 'DRAFT',
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "year" INTEGER NOT NULL,
    "season" "IssueSeason",
    "topic" TEXT,
    "previewPageLimit" INTEGER,
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "coverAssetId" TEXT,
    "previewPdfAssetId" TEXT,
    "digitalPdfAssetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MagazineIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminSession_tokenHash_key" ON "AdminSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AdminSession_adminUserId_idx" ON "AdminSession"("adminUserId");

-- CreateIndex
CREATE INDEX "AdminSession_expiresAt_idx" ON "AdminSession"("expiresAt");

-- CreateIndex
CREATE INDEX "AdminLoginAttempt_email_createdAt_idx" ON "AdminLoginAttempt"("email", "createdAt");

-- CreateIndex
CREATE INDEX "AdminLoginAttempt_ipHash_createdAt_idx" ON "AdminLoginAttempt"("ipHash", "createdAt");

-- CreateIndex
CREATE INDEX "AdminLoginAttempt_createdAt_idx" ON "AdminLoginAttempt"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_objectKey_key" ON "MediaAsset"("objectKey");

-- CreateIndex
CREATE INDEX "MediaAsset_kind_idx" ON "MediaAsset"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "MagazineIssue_issueNumber_key" ON "MagazineIssue"("issueNumber");

-- CreateIndex
CREATE UNIQUE INDEX "MagazineIssue_slug_key" ON "MagazineIssue"("slug");

-- CreateIndex
CREATE INDEX "MagazineIssue_status_issueNumber_idx" ON "MagazineIssue"("status", "issueNumber");

-- CreateIndex
CREATE INDEX "MagazineIssue_status_publicationDate_idx" ON "MagazineIssue"("status", "publicationDate");

-- CreateIndex
CREATE INDEX "MagazineIssue_publicationDate_idx" ON "MagazineIssue"("publicationDate");

-- CreateIndex
CREATE INDEX "MagazineIssue_isCurrent_idx" ON "MagazineIssue"("isCurrent");

-- CreateIndex
CREATE INDEX "MagazineIssue_year_idx" ON "MagazineIssue"("year");

-- CreateIndex
CREATE INDEX "MagazineIssue_season_idx" ON "MagazineIssue"("season");

-- CreateIndex
CREATE INDEX "MagazineIssue_topic_idx" ON "MagazineIssue"("topic");

-- CreateIndex
CREATE INDEX "MagazineIssue_status_year_season_idx" ON "MagazineIssue"("status", "year", "season");

-- AddForeignKey
ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagazineIssue" ADD CONSTRAINT "MagazineIssue_coverAssetId_fkey" FOREIGN KEY ("coverAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagazineIssue" ADD CONSTRAINT "MagazineIssue_previewPdfAssetId_fkey" FOREIGN KEY ("previewPdfAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagazineIssue" ADD CONSTRAINT "MagazineIssue_digitalPdfAssetId_fkey" FOREIGN KEY ("digitalPdfAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

