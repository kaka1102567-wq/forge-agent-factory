-- CreateIndex
CREATE INDEX "agents_domainId_idx" ON "agents"("domainId");

-- CreateIndex
CREATE INDEX "documents_domainId_idx" ON "documents"("domainId");

-- CreateIndex
CREATE INDEX "test_cases_agentId_idx" ON "test_cases"("agentId");
