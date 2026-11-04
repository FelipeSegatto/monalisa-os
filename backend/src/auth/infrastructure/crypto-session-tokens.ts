import { Injectable } from "@nestjs/common";
import { randomBytes, createHash } from "node:crypto";
import { SessionTokenCodec } from "../application/auth.ports";
import { SessionToken } from "../domain/session-token";
export const newToken = () => randomBytes(32).toString("hex");
export const hashToken = (value: string) =>
  createHash("sha256").update(value).digest("hex");
@Injectable()
export class CryptoSessionTokens extends SessionTokenCodec {
  generate(): SessionToken {
    return SessionToken.from(newToken());
  }
  hash(token: SessionToken): string {
    return hashToken(token.reveal());
  }
}
