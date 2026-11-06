import {
  Inject,
  Controller,
  Param,
  Post,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";
import {
  FileStorage,
  fileOptions,
} from "../../shared/infrastructure/files/file-storage";
import { Admin } from "../../auth/auth.guard";
import { requiredId } from "../../common/util";
import { ProcedureService } from "../application/procedure.service";
@Controller()
export class ProcedureImagesController {
  constructor(
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(ProcedureService) private readonly procedures: ProcedureService,
    @Inject(FileStorage) private readonly files: FileStorage,
  ) {}
  @Admin()
  @Post("api/v1/procedures/:id/images")
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "cover", maxCount: 1 },
        { name: "detail", maxCount: 1 },
      ],
      { ...fileOptions, limits: { fileSize: 8 * 1024 * 1024 } },
    ),
  )
  async images(
    @Param("id") id: string,
    @UploadedFiles()
    files: { cover?: Express.Multer.File[]; detail?: Express.Multer.File[] },
  ) {
    const data: any = {};
    if (files?.cover?.[0])
      data.coverImageUrl = (
        await this.files.store(files.cover[0], "procedure", true)
      ).fileUrl;
    if (files?.detail?.[0])
      data.detailImageUrl = (
        await this.files.store(files.detail[0], "procedure", true)
      ).fileUrl;
    await this.db.procedure.update({ where: { id: requiredId(id) }, data });
    return this.procedures.detail(requiredId(id));
  }
}
