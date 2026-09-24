import { SetMetadata } from "@nestjs/common";
import { PermissionName } from "./permission.service";

export const RequiresPermission = (perm: PermissionName) => SetMetadata("requiresPermission", perm);
