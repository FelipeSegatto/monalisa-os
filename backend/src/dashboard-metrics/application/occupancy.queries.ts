export interface ProfessionalOccupancySeries {
  professionalId: number;
  name: string;
  color: string;
  availableMinutes: number[];
  bookedMinutes: number[];
  occupancyPercent: (number | null)[];
}
export abstract class OccupancyQueries {
  /** Only professionals with a configured working period (ProfessionalWorkingPeriod); no default journey is assumed. */
  abstract series(
    months: number,
  ): Promise<{ months: string[]; professionals: ProfessionalOccupancySeries[] }>;
}
