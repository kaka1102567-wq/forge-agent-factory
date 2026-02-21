-- CreateEnum
CREATE TYPE "DeployChannel" AS ENUM ('TELEGRAM', 'WEB');

-- CreateEnum
CREATE TYPE "DeploymentStatus" AS ENUM ('ACTIVE', 'ROLLED_BACK', 'STOPPED');

-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('HEALTHY', 'DEGRADED', 'DOWN', 'UNKNOWN');

-- AlterEnum
ALTER TYPE "AgentStatus" ADD VALUE 'DEPLOYED';

-- CreateTable
CREATE TABLE "deployments" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "channel" "DeployChannel" NOT NULL,
    "status" "DeploymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "config" JSONB NOT NULL DEFAULT '{}',
    "systemPromptSnapshot" TEXT NOT NULL,
    "healthStatus" "HealthStatus" NOT NULL DEFAULT 'UNKNOWN',
    "lastHealthCheck" TIMESTAMP(3),
    "healthDetails" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deployments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "deployments_agentId_channel_key" ON "deployments"("agentId", "channel");

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
