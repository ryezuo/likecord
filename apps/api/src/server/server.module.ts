import { Module, Global } from "@nestjs/common";
import { ServerController } from "./server.controller";
import { MemberRoleController } from "./member-role.controller";
import { ServerService } from "./server.service";
import { RoleModule } from "../role/role.module";
import { InviteModule } from "../invite/invite.module";
import { PermissionService } from "./guards/permission.service";
import { ServerAccessGuard } from "./guards/server-access.guard";

@Global()
@Module({
  imports: [RoleModule, InviteModule],
  controllers: [ServerController, MemberRoleController],
  providers: [ServerService, PermissionService, ServerAccessGuard],
  exports: [ServerService, PermissionService, ServerAccessGuard],
})
export class ServerModule {}
