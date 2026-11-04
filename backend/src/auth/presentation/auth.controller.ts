import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import { Request, Response } from "express";
import { z } from "zod";
import { parse } from "../../common/util";
import { Actor } from "../domain/actor";
import { AuthService } from "../application/auth.service";
import { SessionService } from "../application/session.service";
import { AuthConfiguration } from "./auth.configuration";
import { Public } from "./auth.decorators";
import { SessionCookie } from "./session-cookie";
const loginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
@Controller("api/v1")
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(SessionService) private readonly sessions: SessionService,
    @Inject(AuthConfiguration)
    private readonly configuration: AuthConfiguration,
  ) {}
  @Public()
  @Post("auth/login")
  @HttpCode(200)
  async login(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const input = parse(loginInput, body);
    const result = await this.auth.login(
      input.email,
      input.password,
      String(request.ip || request.socket.remoteAddress || "unknown"),
    );
    response.cookie(
      SessionCookie.name,
      result.token.reveal(),
      SessionCookie.options(this.configuration.secureCookie),
    );
    return result.profile;
  }
  @Get("me") me(@Req() request: Request & { actor: Actor }) {
    const actor = request.actor;
    return {
      ...actor,
      firstName: actor.name.split(" ")[0],
      roleLabel: actor.role === "ADMIN" ? "Administrador" : "Funcionário",
    };
  }
  @Post("auth/logout")
  @HttpCode(200)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.sessions.revoke(SessionCookie.read(request.headers.cookie));
    response.clearCookie(
      SessionCookie.name,
      SessionCookie.clearOptions(this.configuration.secureCookie),
    );
    return { ok: true };
  }
}
