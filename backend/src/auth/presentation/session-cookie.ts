import { CookieOptions } from "express";
import { SESSION_LIFETIME_MS } from "../application/session.service";
export class SessionCookie {
  static readonly name = "clinic_session";
  static read(header: string | undefined): string | undefined {
    return header
      ?.split(";")
      .map((value) => value.trim())
      .find((value) => value.startsWith(`${this.name}=`))
      ?.slice(this.name.length + 1);
  }
  static options(secure: boolean): CookieOptions {
    return {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_LIFETIME_MS,
    };
  }
  static clearOptions(secure: boolean): CookieOptions {
    const { maxAge, ...options } = this.options(secure);
    return options;
  }
}
