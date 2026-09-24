import { Injectable, CanActivate, ExecutionContext, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PermissionService, type PermissionName, PERMISSIONS } from "./permission.service";

@Injectable()
export class ServerAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissionNeeded = this.reflector.getAllAndOverride<PermissionName | undefined>("requiresPermission", [
      context.getHandler(),
      context.getClass(),
    ]);

    const req = context.switchToHttp().getRequest();
    const userId = req.user?.id;
    if (!userId) throw new ForbiddenException();

    // Extract serverId from params (any named param pattern)
    let serverId: string | undefined;
    for (const key of ["serverId", "serverid", "id"]) {
      if (req.params[key]) { serverId = req.params[key]; break; }
    }

    if (!serverId) {
      // For non-server-specific routes, allow if no permission is required
      return !permissionNeeded;
    }

    // Owners are authoritative even if a Member row is accidentally absent;
    // all other callers must be active (not banned) members.
    if (!await this.permissionService.canAccessServer(serverId, userId)) throw new NotFoundException({
      error: { code: "SERVER_NOT_FOUND", message: "Server not found" },
    });

    if (!permissionNeeded) return true;

    const permBit = PERMISSIONS[permissionNeeded];
    if (permBit === undefined) {
      throw new ForbiddenException({ error: { code: "UNKNOWN_PERMISSION", message: "Unknown permission" } });
    }

    await this.permissionService.assertHasPermission(serverId, userId, permBit);
    return true;
  }
}
