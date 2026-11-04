import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";
import { ApplicationError } from "../../shared/domain/application-error";
import { Customer } from "../domain/customer";
import { CustomerNote } from "../domain/customer-note";
import { CustomerRepository } from "../domain/customer.repository";
import { CustomerMapper } from "./customer.mapper";
@Injectable()
export class PrismaCustomerRepository extends CustomerRepository {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {
    super();
  }
  async find(id: number) {
    const row = await this.db.customer.findUnique({ where: { id } });
    return row ? CustomerMapper.toDomain(row) : null;
  }
  async create(customer: Customer) {
    return (
      await this.db.customer.create({ data: CustomerMapper.fields(customer) })
    ).id;
  }
  async save(customer: Customer) {
    if (customer.id === null)
      throw new ApplicationError(
        "Cliente precisa estar cadastrado",
        "CONFLICT",
      );
    await this.db.customer.update({
      where: { id: customer.id! },
      data: CustomerMapper.fields(customer),
    });
  }
  async findNote(customerId: number, noteId: number) {
    const row = await this.db.customerNote.findFirst({
      where: { id: noteId, customerId },
    });
    return row ? CustomerNote.restore(row) : null;
  }
  async addNote(note: CustomerNote) {
    const { id, ...data } = note.snapshot();
    await this.db.customerNote.create({ data });
  }
  async saveNote(note: CustomerNote) {
    const data = note.snapshot();
    if (data.id === null)
      throw new ApplicationError("Nota precisa estar cadastrada", "CONFLICT");
    const updated = await this.db.customerNote.updateMany({
      where: { id: data.id!, customerId: data.customerId },
      data: { title: data.title, content: data.content },
    });
    if (!updated.count)
      throw new ApplicationError("Nota não encontrada", "INVALID_INPUT");
  }
  async deleteNote(customerId: number, noteId: number) {
    await this.db.customerNote.deleteMany({
      where: { id: noteId, customerId },
    });
  }
}
