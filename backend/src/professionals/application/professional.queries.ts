import { ProfessionalSnapshot } from "../domain/professional";
export interface ProfessionalView extends Omit<ProfessionalSnapshot, "id"> {
  id: number;
  upcomingAppointments: number;
  appointmentsThisMonth: number;
}
export abstract class ProfessionalQueries {
  abstract list(): Promise<{ professionals: ProfessionalView[] }>;
  abstract detail(id: number): Promise<ProfessionalView>;
}
