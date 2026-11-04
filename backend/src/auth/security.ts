// Compatibility functions for existing account/seed callers. Authentication uses ports.
export {
  hashPassword,
  verifyPassword,
} from "./infrastructure/scrypt-password-hasher";
export { newToken, hashToken } from "./infrastructure/crypto-session-tokens";
