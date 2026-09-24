import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

interface AuditRecord {
  serverId?: string;
  actorId: string;
  action: string;
  targetId?: string;
  details?: Record<string, unknown>;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(params: AuditRecord) {
    await this.recordWithClient(this.prisma.client, params);
  }

  async recordWithClient(client: Prisma.TransactionClient, params: AuditRecord) {
    await client.auditLog.create({
      data: {
        serverId: params.serverId || null,
        actorId: params.actorId,
        action: params.action,
        targetId: params.targetId || null,
        details: params.details as object,
      },
    });
  }
}
