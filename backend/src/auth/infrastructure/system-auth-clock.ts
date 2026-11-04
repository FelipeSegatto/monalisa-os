import { Injectable } from "@nestjs/common";
import { AuthClock } from "../application/auth.ports";
@Injectable()
export class SystemAuthClock extends AuthClock {
  now(): number {
    return Date.now();
  }
}
