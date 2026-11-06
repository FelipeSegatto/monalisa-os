import {
  Inject,
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";
import {
  FileStorage,
  fileOptions,
} from "../../shared/infrastructure/files/file-storage";
import { iso, required, requiredId } from "../../common/util";
@Controller()
export class CustomerAttachmentsController {
  constructor(
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(FileStorage) private readonly files: FileStorage,
  ) {}
  @Get("api/v1/customers/:id/documents") async docs(@Param("id") id: string) {
    const data = await this.db.customerDocument.findMany({
      where: { customerId: requiredId(id) },
      orderBy: { createdAt: "desc" },
    });
    return {
      documents: data.map((x) => ({
        ...x,
        createdAt: iso(x.createdAt),
        signedAt: iso(x.signedAt),
      })),
    };
  }
  @Post("api/v1/customers/:id/documents")
  @UseInterceptors(
    FileInterceptor("file", {
      ...fileOptions,
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  async uploadDoc(@Param("id") id: string, @Req() req: any) {
    const info = await this.files.store(req.file, "document");
    const b = req.body;
    const customerId = requiredId(id);
    await this.db.customer.findUniqueOrThrow({ where: { id: customerId } });
    if (b.appointmentId) {
      const ap = required(
        await this.db.appointment.findUnique({
          where: { id: requiredId(b.appointmentId) },
        }),
      );
      if (ap.customerId !== customerId)
        throw new BadRequestException("Agendamento não pertence ao cliente");
    }
    const procedureId = b.procedureId ? requiredId(b.procedureId) : null;
    const proc = procedureId
      ? await this.db.procedure.findUnique({ where: { id: procedureId } })
      : null;
    await this.db.customerDocument.create({
      data: {
        customerId,
        appointmentId: b.appointmentId ? requiredId(b.appointmentId) : null,
        procedureId,
        procedureName: proc?.name || null,
        type: ["ANAMNESIS", "CONTRACT", "OTHER"].includes(b.type)
          ? b.type
          : "OTHER",
        status: ["AWAITING_SIGNATURE", "SIGNED"].includes(b.status)
          ? b.status
          : "AWAITING_SIGNATURE",
        ...info,
        signedBy: b.signedBy || null,
        signedAt: b.signedAt ? new Date(b.signedAt) : null,
        note: b.note || null,
      },
    });
    return this.docs(id);
  }
  @Get("api/v1/customers/:id/photos") async photos(@Param("id") id: string) {
    const data = await this.db.customerPhoto.findMany({
      where: { customerId: requiredId(id) },
      orderBy: { createdAt: "desc" },
    });
    return { photos: data.map((x) => ({ ...x, createdAt: iso(x.createdAt) })) };
  }
  @Post("api/v1/customers/:id/photos")
  @UseInterceptors(
    FileInterceptor("file", {
      ...fileOptions,
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  async uploadPhoto(@Param("id") id: string, @Req() req: any) {
    const info = await this.files.store(req.file, "photo", true);
    const b = req.body,
      customerId = requiredId(id);
    await this.db.customer.findUniqueOrThrow({ where: { id: customerId } });
    const procedureId = b.procedureId ? requiredId(b.procedureId) : null,
      proc = procedureId
        ? await this.db.procedure.findUnique({ where: { id: procedureId } })
        : null;
    await this.db.customerPhoto.create({
      data: {
        customerId,
        appointmentId: b.appointmentId ? requiredId(b.appointmentId) : null,
        procedureId,
        procedureName: proc?.name || null,
        label: ["BEFORE", "AFTER", "EVOLUTION", "OTHER"].includes(b.label)
          ? b.label
          : null,
        ...info,
        note: b.note || null,
      },
    });
    return this.photos(id);
  }
}
