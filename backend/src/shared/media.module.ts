import { Module } from "@nestjs/common";
import { FileStorage } from "./infrastructure/files/file-storage";
import { MediaController } from "./presentation/media.controller";
@Module({
  controllers: [MediaController],
  providers: [FileStorage],
  exports: [FileStorage],
})
export class MediaModule {}
