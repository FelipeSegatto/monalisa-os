import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import { required, dateKey } from "../../common/util";
import { ApplicationError } from "../../shared/domain/application-error";
import { Actor } from "../../auth/domain/actor";
import {
  CommercialOffer,
  OfferVersionInput,
  OfferItemSnapshot,
} from "../domain/commercial-offer";
import { Money } from "../domain/money";
const include = {
  versions: {
    include: { items: { orderBy: { id: "asc" as const } } },
    orderBy: { version: "desc" as const },
  },
  events: { orderBy: { id: "desc" as const }, take: 100 },
};
@Injectable()
export class PrismaOfferCatalog {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}
  async resolveProcedure(
    tx: Prisma.TransactionClient,
    procedureId: number,
    variationId: number | null,
    sessions: number,
  ): Promise<OfferItemSnapshot> {
    const p = required(
      await tx.procedure.findUnique({
        where: { id: procedureId },
        include: { variations: true },
      }),
    );
    if (!p.active)
      throw new ApplicationError("Procedimento inativo", "CONFLICT");
    const v = variationId
      ? p.variations.find((v) => v.id === variationId && v.active)
      : null;
    if (variationId && !v)
      throw new ApplicationError(
        "Área/opção inválida para o procedimento",
        "INVALID_INPUT",
      );
    if (!variationId && p.variations.some((v) => v.active))
      throw new ApplicationError(
        "Escolha a área/opção do procedimento",
        "INVALID_INPUT",
      );
    Money.from(String(v?.price ?? p.price)).times(sessions);
    return {
      procedureId: p.id,
      variationId: v?.id ?? null,
      procedureName: p.name,
      variationName: v?.name ?? null,
      sessions,
      referenceUnitPrice: Number(v?.price ?? p.price),
    };
  }
  private view(row: any) {
    const today = dateKey(new Date()),
      effective = CommercialOffer.effective(row.versions, today);
    return {
      ...row,
      effectiveVersionId: row.active ? (effective?.id ?? null) : null,
      status: !row.active
        ? "PAUSED"
        : effective
          ? "ACTIVE"
          : row.versions.every(
                (v: any) => v.startsOn.toISOString().slice(0, 10) > today,
              )
            ? "UPCOMING"
            : "EXPIRED",
      versions: row.versions.map((v: any) => ({
        ...v,
        startsOn: v.startsOn.toISOString().slice(0, 10),
        endsOn: v.endsOn?.toISOString().slice(0, 10) ?? null,
        price: Number(v.price),
        referenceAmount: Number(v.referenceAmount),
        items: v.items.map((i: any) => ({
          ...i,
          referenceUnitPrice: Number(i.referenceUnitPrice),
        })),
      })),
    };
  }
  async list(procedureId?: number) {
    const rows = await this.db.commercialOffer.findMany({
      where: procedureId
        ? { versions: { some: { items: { some: { procedureId } } } } }
        : {},
      include,
      orderBy: { id: "desc" },
    });
    return { offers: rows.map((r) => this.view(r)) };
  }
  async detail(id: number) {
    return this.view(
      required(
        await this.db.commercialOffer.findUnique({ where: { id }, include }),
      ),
    );
  }
  async publish(id: number | null, input: OfferVersionInput, actor: Actor) {
    const offerId = await this.db.$transaction(
      async (tx) => {
        let previous: Awaited<
          ReturnType<typeof tx.commercialOfferVersion.findFirst>
        > = null;
        if (id) {
          const row = await tx.$queryRaw<
            { id: number }[]
          >`SELECT id FROM CommercialOffer WHERE id=${id} FOR UPDATE`;
          if (!row.length)
            throw new ApplicationError("Oferta não encontrada", "NOT_FOUND");
          previous = await tx.commercialOfferVersion.findFirst({
            where: { offerId: id },
            orderBy: { version: "desc" },
          });
        }
        for (const procedureId of [
          ...new Set(input.items.map((i) => i.procedureId)),
        ].sort((a, b) => a - b))
          await tx.$queryRaw`SELECT id FROM \`Procedure\` WHERE id=${procedureId} FOR UPDATE`;
        const items: OfferItemSnapshot[] = [];
        for (const item of input.items)
          items.push(
            await this.resolveProcedure(
              tx,
              item.procedureId,
              item.variationId ?? null,
              item.sessions,
            ),
          );
        const current = id
          ? required(await tx.commercialOffer.findUnique({ where: { id } }))
          : null;
        const aggregate = previous
          ? CommercialOffer.restore({
              name: current!.name,
              active: current!.active,
              version: previous.version,
              lastStartsOn: previous.startsOn.toISOString().slice(0, 10),
            })
          : CommercialOffer.create(input.name);
        const { reference, version: nextVersion } = aggregate.publish(
          input,
          items,
          dateKey(new Date()),
        );
        const root = id
          ? await tx.commercialOffer.update({
              where: { id },
              data: { name: input.name.trim() },
            })
          : await tx.commercialOffer.create({
              data: { name: input.name.trim(), actorId: actor.id },
            });
        const version = await tx.commercialOfferVersion.create({
          data: {
            offerId: root.id,
            version: nextVersion,
            name: input.name.trim(),
            startsOn: new Date(input.startsOn + "T12:00Z"),
            endsOn: input.endsOn ? new Date(input.endsOn + "T12:00Z") : null,
            sessionValidityDays: input.sessionValidityDays,
            price: input.price,
            referenceAmount: Money.ofCents(reference).amount,
            terms: input.terms,
            actorId: actor.id,
            items: { create: items },
          },
        });
        await tx.commercialEvent.create({
          data: {
            offerId: root.id,
            type: "VERSION_PUBLISHED",
            actorId: actor.id,
            details: { versionId: version.id, version: version.version },
          },
        });
        return root.id;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 12000,
      },
    );
    return this.detail(offerId);
  }
  async setActive(id: number, active: boolean, reason: string, actor: Actor) {
    await this.db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM CommercialOffer WHERE id=${id} FOR UPDATE`;
        const current = required(
          await tx.commercialOffer.findUnique({
            where: { id },
            include: { versions: { orderBy: { version: "desc" }, take: 1 } },
          }),
        );
        const aggregate = CommercialOffer.restore({
          name: current.name,
          active: current.active,
          version: current.versions[0]?.version ?? 0,
          lastStartsOn:
            current.versions[0]?.startsOn.toISOString().slice(0, 10) ?? null,
        });
        aggregate.changeState(active, reason);
        if (current.active === active) return;
        await tx.commercialOffer.update({
          where: { id },
          data: { active: aggregate.snapshot().active },
        });
        await tx.commercialEvent.create({
          data: {
            offerId: id,
            type: active ? "RESUMED" : "PAUSED",
            actorId: actor.id,
            reason,
            details: { active },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
    return this.detail(id);
  }
  async sellable(tx: Prisma.TransactionClient, versionId: number) {
    const v = required(
      await tx.commercialOfferVersion.findUnique({
        where: { id: versionId },
        include: {
          items: { orderBy: { id: "asc" } },
          offer: { include: { versions: true } },
        },
      }),
    );
    const effective = CommercialOffer.effective(
      v.offer.versions,
      dateKey(new Date()),
    );
    if (!v.offer.active || effective?.id !== v.id)
      throw new ApplicationError(
        "Versão da oferta indisponível para novas vendas",
        "CONFLICT",
      );
    return v;
  }
}
