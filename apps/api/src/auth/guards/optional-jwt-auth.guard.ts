import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/** Populate req.user when a valid session exists, while allowing anonymous access. */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard("jwt") {
  handleRequest<TUser = unknown>(_error: unknown, user: TUser | false | null): TUser {
    return (user || null) as TUser;
  }
}
