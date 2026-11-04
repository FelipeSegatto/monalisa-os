import { ApplicationError } from "../../shared/domain/application-error";
export interface CustomerNoteSnapshot {
  id: number | null;
  customerId: number;
  title: string;
  content: string;
  author: string;
}
export class CustomerNote {
  private title: string;
  private content: string;
  private constructor(
    readonly id: number | null,
    readonly customerId: number,
    title: string,
    content: string,
    private readonly author: string,
  ) {
    if (!Number.isSafeInteger(customerId) || customerId < 1)
      throw new ApplicationError("Cliente inválido", "INVALID_INPUT");
    if (typeof author !== "string" || !author || author.length > 120)
      throw new ApplicationError("Autor inválido", "INVALID_INPUT");
    const values = CustomerNote.validate(title, content);
    this.title = values.title;
    this.content = values.content;
  }
  private static validate(title: string, content: string) {
    if (
      typeof title !== "string" ||
      !title.trim() ||
      title.trim().length > 150 ||
      typeof content !== "string" ||
      !content.trim() ||
      content.trim().length > 10000
    )
      throw new ApplicationError(
        "Título ou conteúdo da nota inválido",
        "INVALID_INPUT",
      );
    return { title: title.trim(), content: content.trim() };
  }
  static create(
    customerId: number,
    title: string,
    content: string,
    author: string,
  ): CustomerNote {
    return new CustomerNote(null, customerId, title, content, author);
  }
  static restore(data: CustomerNoteSnapshot): CustomerNote {
    return new CustomerNote(
      data.id,
      data.customerId,
      data.title,
      data.content,
      data.author,
    );
  }
  revise(title: string, content: string): void {
    const values = CustomerNote.validate(title, content);
    this.title = values.title;
    this.content = values.content;
  }
  snapshot(): CustomerNoteSnapshot {
    return {
      id: this.id,
      customerId: this.customerId,
      title: this.title,
      content: this.content,
      author: this.author,
    };
  }
}
