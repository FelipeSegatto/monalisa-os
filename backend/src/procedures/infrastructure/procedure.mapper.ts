import { Prisma } from "@prisma/client";
import { Procedure } from "../domain/procedure";
import { ProcedureView } from "../application/procedure.queries";
type AggregateRow = Prisma.ProcedureGetPayload<{
  include: { variations: true; materials: true };
}>;
type ViewRow = Prisma.ProcedureGetPayload<{
  include: { category: true; variations: true };
}>;
export class ProcedureMapper {
  static toDomain(row: AggregateRow): Procedure {
    return Procedure.restore({
      id: row.id,
      categoryId: row.categoryId,
      name: row.name,
      description: row.description,
      durationMinutes: row.durationMinutes,
      price: Number(row.price),
      active: row.active,
      technology: row.technology ?? "GENERAL",
      requiresEquipment: row.requiresEquipment ?? false,
      options: row.variations.map((v) => ({
        id: v.id,
        groupName: v.groupName,
        name: v.name,
        reference: v.reference,
        price: Number(v.price),
        active: v.active,
        sortOrder: v.sortOrder,
        kind: v.kind ?? "OTHER",
      })),
      materials: row.materials.map((m) => ({
        stockItemId: m.stockItemId,
        quantity: Number(m.quantity),
      })),
      materialsReviewedAt: row.materialsReviewedAt,
    });
  }
  static toView(row: ViewRow): ProcedureView {
    const variations = row.variations.map((v) => ({
      id: v.id,
      groupName: v.groupName,
      name: v.name,
      reference: v.reference,
      price: Number(v.price),
      active: v.active,
      sortOrder: v.sortOrder,
      kind: v.kind ?? "OTHER",
    }));
    const active = variations.filter((v) => v.active);
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      coverImageUrl: row.coverImageUrl,
      detailImageUrl: row.detailImageUrl,
      durationMinutes: row.durationMinutes,
      price: Number(row.price),
      active: row.active,
      displayPrice: active.length
        ? Math.min(...active.map((v) => v.price))
        : Number(row.price),
      hasVariations: variations.length > 0,
      variations,
      categoryId: row.categoryId,
      categoryName: row.category?.name ?? "",
      technology: row.technology ?? "GENERAL",
      requiresEquipment: row.requiresEquipment ?? false,
    };
  }
  static fields(procedure: Procedure) {
    const { options, materials, materialsReviewedAt, id, ...fields } =
      procedure.snapshot();
    return fields;
  }
}
