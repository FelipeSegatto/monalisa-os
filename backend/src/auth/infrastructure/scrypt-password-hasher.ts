import { Injectable } from "@nestjs/common";
import { randomBytes, scrypt, scryptSync, timingSafeEqual } from "node:crypto";
import { PasswordHasher } from "../application/auth.ports";
const FORMAT = /^scrypt:([a-f0-9]{32}):([a-f0-9]{128})$/;
const DUMMY_SALT = "0".repeat(32);
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password: string, stored: string): boolean {
  const parsed = FORMAT.exec(stored);
  if (!parsed) return false;
  return timingSafeEqual(
    scryptSync(password, parsed[1], 64),
    Buffer.from(parsed[2], "hex"),
  );
}
@Injectable()
export class ScryptPasswordHasher extends PasswordHasher {
  async verify(password: string, stored: string | null): Promise<boolean> {
    const parsed = stored ? FORMAT.exec(stored) : null;
    const actual = await new Promise<Buffer>((resolve, reject) =>
      scrypt(password, parsed?.[1] ?? DUMMY_SALT, 64, (error, key) =>
        error ? reject(error) : resolve(key),
      ),
    );
    const expected = parsed ? Buffer.from(parsed[2], "hex") : Buffer.alloc(64);
    return timingSafeEqual(actual, expected) && parsed !== null;
  }
}
