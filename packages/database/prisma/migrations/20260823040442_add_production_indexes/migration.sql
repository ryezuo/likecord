-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "invites_serverId_idx" ON "invites"("serverId");

-- CreateIndex
CREATE INDEX "member_roles_roleId_idx" ON "member_roles"("roleId");

-- CreateIndex
CREATE INDEX "members_userId_idx" ON "members"("userId");

-- CreateIndex
CREATE INDEX "roles_serverId_position_idx" ON "roles"("serverId", "position" DESC);
