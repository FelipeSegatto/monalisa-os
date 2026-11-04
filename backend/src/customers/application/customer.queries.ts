import { AcquisitionSource } from "../domain/customer";
export interface CustomerFilter {
  search?: string;
  source?: AcquisitionSource | "ALL";
}
export interface CustomerListView {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  birthDate: string | null;
  acquisitionSource: AcquisitionSource;
  acquisitionSourceLabel: string;
  createdAt: string;
  lastAppointmentAt: string | null;
  nextAppointmentAt: string | null;
}
export interface CustomerAppointmentView {
  id: number;
  startsAt: string;
  endsAt: string;
  status: string;
  procedureName: string;
  professionalName: string;
}
export interface CustomerDetailView extends Omit<
  CustomerListView,
  "lastAppointmentAt" | "nextAppointmentAt"
> {
  nextAppointment: CustomerAppointmentView | null;
  history: CustomerAppointmentView[];
}
export interface CustomerNoteView {
  id: number;
  customerId: number;
  title: string;
  content: string;
  author: string;
  createdAt: string;
}
export abstract class CustomerQueries {
  abstract list(
    filter: CustomerFilter,
  ): Promise<{ customers: CustomerListView[] }>;
  abstract detail(id: number): Promise<CustomerDetailView>;
  abstract notes(id: number): Promise<{ notes: CustomerNoteView[] }>;
}
