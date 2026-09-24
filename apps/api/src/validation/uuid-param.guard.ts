import { BadRequestException, CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { isUUID } from "class-validator";

export const UUID_ROUTE_PARAM_NAMES = [
  "attachmentId",
  "categoryId",
  "channelId",
  "inviteId",
  "memberId",
  "messageId",
  "roleId",
  "serverId",
  "targetId",
  "targetUserId",
] as const;

const UUID_ROUTE_PARAMS = new Set<string>(UUID_ROUTE_PARAM_NAMES);

@Injectable()
export class UuidParamGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== "http") return true;

    const request = context.switchToHttp().getRequest<{ params?: Record<string, string> }>();

    for (const [name, value] of Object.entries(request.params ?? {})) {
      if (UUID_ROUTE_PARAMS.has(name) && !isUUID(value)) {
        throw new BadRequestException({
          error: {
            code: "INVALID_UUID",
            message: "Invalid UUID route parameter",
          },
        });
      }
    }

    return true;
  }
}
