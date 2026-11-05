import { ApplicationError } from "../../shared/domain/application-error";
import { Money } from "./money";
export interface OfferItemSnapshot {
  procedureId: number;
  variationId: number | null;
  procedureName: string;
  variationName: string | null;
  sessions: number;
  referenceUnitPrice: number;
}
export interface OfferVersionInput {
  name: string;
  startsOn: string;
  endsOn: string | null;
  sessionValidityDays: number | null;
  price: number;
  terms: string | null;
  items: {
    procedureId: number;
    variationId?: number | null;
    sessions: number;
  }[];
}
export function validDay(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value + "T12:00:00Z")) &&
    new Date(value + "T12:00:00Z").toISOString().slice(0, 10) === value
  );
}
export class CommercialOffer {
  private constructor(
    private state: {
      name: string;
      active: boolean;
      version: number;
      lastStartsOn: string | null;
    },
  ) {}
  static create(name: string) {
    return new CommercialOffer({
      name,
      active: true,
      version: 0,
      lastStartsOn: null,
    });
  }
  static restore(state: {
    name: string;
    active: boolean;
    version: number;
    lastStartsOn: string | null;
  }) {
    return new CommercialOffer({ ...state });
  }
  publish(input: OfferVersionInput, items: OfferItemSnapshot[], today: string) {
    const amounts = CommercialOffer.validate(
      input,
      items,
      this.state.lastStartsOn ?? undefined,
    );
    if (this.state.version && input.startsOn < today)
      throw new ApplicationError(
        "Nova versão não pode alterar o passado",
        "INVALID_INPUT",
      );
    this.state = {
      ...this.state,
      name: input.name.trim(),
      version: this.state.version + 1,
      lastStartsOn: input.startsOn,
    };
    return { version: this.state.version, ...amounts };
  }
  changeState(active: boolean, reason: string) {
    if (reason.trim().length < 3 || reason.trim().length > 1000)
      throw new ApplicationError(
        "Informe o motivo da alteração da oferta",
        "INVALID_INPUT",
      );
    this.state = { ...this.state, active };
  }
  snapshot() {
    return { ...this.state };
  }

  static validate(
    input: OfferVersionInput,
    items: OfferItemSnapshot[],
    previousStart?: string,
  ) {
    if (
      input.name.trim().length < 2 ||
      input.name.trim().length > 150 ||
      !validDay(input.startsOn) ||
      (input.endsOn !== null &&
        (!validDay(input.endsOn) || input.endsOn < input.startsOn))
    )
      throw new ApplicationError(
        "Nome ou período da oferta inválido",
        "INVALID_INPUT",
      );
    if (previousStart && input.startsOn < previousStart)
      throw new ApplicationError(
        "Nova versão não pode começar antes da versão anterior",
        "INVALID_INPUT",
      );
    if (
      input.sessionValidityDays !== null &&
      (!Number.isInteger(input.sessionValidityDays) ||
        input.sessionValidityDays < 1 ||
        input.sessionValidityDays > 3650)
    )
      throw new ApplicationError(
        "Prazo de utilização inválido",
        "INVALID_INPUT",
      );
    if (
      !items.length ||
      items.length > 50 ||
      new Set(items.map((i) => `${i.procedureId}:${i.variationId ?? ""}`))
        .size !== items.length
    )
      throw new ApplicationError(
        "Composição vazia ou repetida",
        "INVALID_INPUT",
      );
    const reference = items.reduce(
      (sum, item) =>
        sum + Money.from(item.referenceUnitPrice).times(item.sessions).cents,
      0,
    );
    Money.ofCents(reference);
    const price = Money.from(input.price).cents;
    if (price > reference)
      throw new ApplicationError(
        "Preço da oferta supera o preço de referência",
        "INVALID_INPUT",
      );
    return { reference, price };
  }
  static effective<
    T extends {
      id: number;
      version: number;
      startsOn: Date;
      endsOn: Date | null;
    },
  >(versions: T[], day: string): T | undefined {
    const effective = versions
      .filter((v) => v.startsOn.toISOString().slice(0, 10) <= day)
      .sort((a, b) => b.version - a.version)[0];
    return effective &&
      (!effective.endsOn || effective.endsOn.toISOString().slice(0, 10) >= day)
      ? effective
      : undefined;
  }
}
