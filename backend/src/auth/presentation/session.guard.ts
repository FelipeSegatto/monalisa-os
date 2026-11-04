import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { SessionService } from "../application/session.service";
import { AuthorizationPolicy } from "../domain/authorization-policy";
import { AuthConfiguration } from "./auth.configuration";
import { SessionCookie } from "./session-cookie";
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    @Inject(SessionService) private readonly sessions: SessionService,
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthConfiguration)
    private readonly configuration: AuthConfiguration,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    this.configuration.assertOrigin(
      req.method,
      String(req.headers.origin || ""),
    );
    if (
      req.method === "GET" &&
      /^\/uploads\/procedure\/[a-f0-9-]{36}\.(png|jpg|webp)$/.test(req.path)
    )
      return true;
    if (
      this.reflector.getAllAndOverride<boolean>("isPublic", [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    req.actor = await this.sessions.authenticate(
      SessionCookie.read(req.headers.cookie),
    );
    if (
      this.reflector.getAllAndOverride<boolean>("adminOnly", [
        context.getHandler(),
        context.getClass(),
      ])
    )
      AuthorizationPolicy.requireAdministrator(req.actor);
    return true;
  }
}
