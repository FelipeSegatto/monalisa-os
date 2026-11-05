import { Actor } from "../../auth/domain/actor";
import { ExecutionInput } from "../domain/attendance";
export abstract class AttendanceRepository {
  abstract cancel(id: number, reason: string, actor: Actor): Promise<unknown>;
  abstract start(appointmentId: number, actor: Actor): Promise<unknown>;
  abstract detail(id: number, actor: Actor): Promise<unknown>;
  abstract complete(
    id: number,
    input: {
      requestKey: string;
      completedAt?: string;
      executions: ExecutionInput[];
    },
    actor: Actor,
  ): Promise<unknown>;
}
