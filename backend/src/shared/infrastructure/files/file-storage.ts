import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ApplicationError } from "../../domain/application-error";

const allowed: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};
export const fileOptions = {
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (
    _request: unknown,
    file: { mimetype: string },
    callback: (error: Error | null, accept: boolean) => void,
  ) => callback(null, Boolean(allowed[file.mimetype])),
};
/** Physical file storage shared by customer records and procedure imagery. */
@Injectable()
export class FileStorage {
  private readonly root = resolve(process.cwd(), "uploads");
  private detect(buffer: Buffer): string | null {
    if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])))
      return "image/jpeg";
    if (
      buffer
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    )
      return "image/png";
    if (
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    )
      return "image/webp";
    if (buffer.toString("ascii", 0, 5) === "%PDF-") return "application/pdf";
    return null;
  }
  async store(
    file: Express.Multer.File,
    kind: "procedure" | "document" | "photo",
    onlyImage = false,
  ) {
    if (!file?.buffer)
      throw new ApplicationError("Arquivo obrigatório", "INVALID_INPUT");
    const mime = this.detect(file.buffer);
    if (!mime || !allowed[mime] || (onlyImage && mime === "application/pdf"))
      throw new ApplicationError(
        "Formato de arquivo não permitido",
        "INVALID_INPUT",
      );
    await mkdir(resolve(this.root, kind), { recursive: true });
    const filename = randomUUID() + allowed[mime];
    await writeFile(resolve(this.root, kind, filename), file.buffer, {
      flag: "wx",
    });
    return {
      fileUrl: `/uploads/${kind}/${filename}`,
      originalFilename: file.originalname.slice(0, 255),
    };
  }
  async read(kind: string, filename: string) {
    if (
      !["procedure", "document", "photo"].includes(kind) ||
      !/^[a-f0-9-]{36}\.(png|jpg|webp|pdf)$/.test(filename)
    )
      throw new ApplicationError("Arquivo inválido", "INVALID_INPUT");
    return readFile(resolve(this.root, kind, filename)).catch(() => null);
  }
}
