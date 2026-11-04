import { apiFileUrl, type ProcedureCategory, type ProcedurePriceVariation } from "../../lib/api";

export interface CatalogItem {
  index: number;
  procedureId: number;
  categoryName: string;
  name: string;
  description: string | null;
  displayPrice: number;
  variations: ProcedurePriceVariation[];
  coverImageUrl: string | null;
  detailImageUrl: string | null;
}

function isEvaluationProcedure(categoryName: string, procedureName: string): boolean {
  return categoryName.trim().toLowerCase() === "avaliação" || procedureName.trim().toLowerCase() === "avaliação";
}

export function flattenCatalog(categories: ProcedureCategory[]): CatalogItem[] {
  const items: CatalogItem[] = [];
  for (const category of categories) {
    for (const procedure of category.procedures) {
      if (isEvaluationProcedure(category.name, procedure.name)) continue;
      items.push({
        index: items.length,
        procedureId: procedure.id,
        categoryName: category.name,
        name: procedure.name,
        description: procedure.description,
        displayPrice: procedure.displayPrice,
        variations: procedure.variations.filter((v) => v.active),
        coverImageUrl: apiFileUrl(procedure.coverImageUrl),
        detailImageUrl: apiFileUrl(procedure.detailImageUrl ?? procedure.coverImageUrl),
      });
    }
  }
  return items;
}
