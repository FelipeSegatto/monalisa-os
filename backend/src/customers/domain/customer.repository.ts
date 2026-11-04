import { Customer } from "./customer";
import { CustomerNote } from "./customer-note";
export abstract class CustomerRepository {
  abstract find(id: number): Promise<Customer | null>;
  abstract create(customer: Customer): Promise<number>;
  abstract save(customer: Customer): Promise<void>;
  abstract findNote(
    customerId: number,
    noteId: number,
  ): Promise<CustomerNote | null>;
  abstract addNote(note: CustomerNote): Promise<void>;
  abstract saveNote(note: CustomerNote): Promise<void>;
  abstract deleteNote(customerId: number, noteId: number): Promise<void>;
}
