import { Module } from "@nestjs/common";
import { PrismaModule } from "../shared/infrastructure/prisma/prisma.module";
import { CustomerRepository } from "./domain/customer.repository";
import { CustomerQueries } from "./application/customer.queries";
import { CustomerService } from "./application/customer.service";
import { PrismaCustomerRepository } from "./infrastructure/prisma-customer.repository";
import { PrismaCustomerQueries } from "./infrastructure/prisma-customer.queries";
import { CustomersController } from "./presentation/customers.controller";
@Module({
  imports: [PrismaModule],
  controllers: [CustomersController],
  providers: [
    CustomerService,
    { provide: CustomerRepository, useClass: PrismaCustomerRepository },
    { provide: CustomerQueries, useClass: PrismaCustomerQueries },
  ],
  exports: [CustomerService],
})
export class CustomersModule {}
