import { Inject, Injectable } from "@nestjs/common";
import { ApplicationError } from "../../shared/domain/application-error";
import { Customer, CustomerData } from "../domain/customer";
import { CustomerRepository } from "../domain/customer.repository";
import { CustomerQueries, CustomerFilter } from "./customer.queries";
@Injectable()
export class CustomerService {
  constructor(
    @Inject(CustomerRepository) private readonly repository: CustomerRepository,
    @Inject(CustomerQueries) private readonly queries: CustomerQueries,
  ) {}
  list(filter: CustomerFilter) {
    return this.queries.list(filter);
  }
  detail(id: number) {
    return this.queries.detail(id);
  }
  notes(id: number) {
    return this.queries.notes(id);
  }
  private async requireCustomer(id: number) {
    const customer = await this.repository.find(id);
    if (!customer)
      throw new ApplicationError("Registro não encontrado", "NOT_FOUND");
    return customer;
  }
  async create(data: CustomerData) {
    const id = await this.repository.create(Customer.create(data));
    return this.queries.detail(id);
  }
  async update(id: number, data: CustomerData) {
    const customer = await this.requireCustomer(id);
    customer.updateProfile(data);
    await this.repository.save(customer);
    return this.queries.detail(id);
  }
  async addNote(id: number, title: string, content: string, author: string) {
    const customer = await this.requireCustomer(id);
    await this.repository.addNote(customer.addNote(title, content, author));
    return this.queries.notes(id);
  }
  async updateNote(id: number, noteId: number, title: string, content: string) {
    const note = await this.repository.findNote(id, noteId);
    if (!note)
      throw new ApplicationError("Nota não encontrada", "INVALID_INPUT");
    note.revise(title, content);
    await this.repository.saveNote(note);
    return this.queries.notes(id);
  }
  async deleteNote(id: number, noteId: number) {
    await this.repository.deleteNote(id, noteId);
    return this.queries.notes(id);
  }
}
