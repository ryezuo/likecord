import { Module, Global } from "@nestjs/common";
import { AuditLogService } from "./audit.service";

@Global()
@Module({
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditModule {}
