import { Inject, Injectable } from "@nestjs/common";
import { AttendanceRepository } from "./attendance.repository";
@Injectable()
export class AttendanceService {
  constructor(
    @Inject(AttendanceRepository) private readonly repo: AttendanceRepository,
  ) {}
  cancel(...args: Parameters<AttendanceRepository["cancel"]>) {
    return this.repo.cancel(...args);
  }
  start(...args: Parameters<AttendanceRepository["start"]>) {
    return this.repo.start(...args);
  }
  detail(...args: Parameters<AttendanceRepository["detail"]>) {
    return this.repo.detail(...args);
  }
  complete(...args: Parameters<AttendanceRepository["complete"]>) {
    return this.repo.complete(...args);
  }
}
