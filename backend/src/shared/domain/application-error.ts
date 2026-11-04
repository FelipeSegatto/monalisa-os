export type FailureCategory =
  "INVALID_INPUT" | "UNAUTHENTICATED" | "FORBIDDEN" | "CONFLICT" | "NOT_FOUND";
/** Expected application/domain failure. HTTP mapping belongs to presentation. */
export class ApplicationError extends Error {
  constructor(
    message: string,
    readonly category: FailureCategory,
  ) {
    super(message);
    this.name = "ApplicationError";
  }
}
