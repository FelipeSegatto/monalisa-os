import { Controller, Get, Inject, Param, Res } from "@nestjs/common";
import { Response } from "express";
import { FileStorage } from "../infrastructure/files/file-storage";
@Controller()
export class MediaController {
  constructor(@Inject(FileStorage) private readonly files: FileStorage) {}
  @Get("uploads/:kind/:filename") async file(
    @Param("kind") kind: string,
    @Param("filename") filename: string,
    @Res() response: Response,
  ) {
    const data = await this.files.read(kind, filename);
    if (!data) return response.status(404).send("Não encontrado");
    const extension = filename.split(".").pop();
    response
      .type(
        extension === "jpg"
          ? "image/jpeg"
          : extension === "pdf"
            ? "application/pdf"
            : extension === "png"
              ? "image/png"
              : "image/webp",
      )
      .setHeader("Cache-Control", "private, max-age=600");
    response.send(data);
  }
}
