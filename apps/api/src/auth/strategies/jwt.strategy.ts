import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Request } from "express";
import { SessionService } from "../../session/session.service";

export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  sid: string;
  sv: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(private readonly sessions: SessionService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          return req?.cookies?.access_token || null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET!,
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sid || !Number.isInteger(payload.sv)
      || !await this.sessions.validateAccessSession(payload.sid, payload.sub, payload.sv)) {
      throw new UnauthorizedException({ error: { code: "SESSION_INVALID", message: "Session is no longer active" } });
    }
    return {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
      sessionId: payload.sid,
      sessionVersion: payload.sv,
    };
  }
}
