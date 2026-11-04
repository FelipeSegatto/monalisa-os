import { Customer as CustomerRow } from "@prisma/client";
import { Customer } from "../domain/customer";
import { BirthDate } from "../domain/birth-date";
export class CustomerMapper {
  static toDomain(row: CustomerRow): Customer {
    return Customer.restore({
      ...row,
      birthDate: row.birthDate
        ? BirthDate.fromStorage(row.birthDate).toString()
        : null,
    });
  }
  static fields(customer: Customer) {
    const { id, ...data } = customer.snapshot();
    return {
      ...data,
      birthDate: data.birthDate
        ? BirthDate.from(data.birthDate).toStorage()
        : null,
    };
  }
}
