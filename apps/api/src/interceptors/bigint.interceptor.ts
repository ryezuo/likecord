import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

function replaceBigInts(obj: unknown): unknown {
  if (typeof obj === "bigint") return obj.toString();
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(replaceBigInts);
  if (obj && typeof obj === "object") {
    const replaced: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      replaced[key] = replaceBigInts(value);
    }
    return replaced;
  }
  return obj;
}

@Injectable()
export class BigIntInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => replaceBigInts(data)));
  }
}
