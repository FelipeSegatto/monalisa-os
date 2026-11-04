import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  equipmentInput,
  componentInput,
} from "../src/equipments/presentation/equipment.schemas";
const code = z.string().regex(/^[A-Z0-9-]{1,50}$/);
export const equipmentManifest = z
  .object({
    equipment: z.array(
      equipmentInput.extend({
        code,
        components: z.array(componentInput.extend({ code })).default([]),
      }),
    ),
  })
  .strict();
export async function importEquipment(
  tx: Prisma.TransactionClient,
  actorId: number,
  data: z.infer<typeof equipmentManifest>,
) {
  for (const { components, ...entry } of data.equipment) {
    const equipment = await tx.equipment.upsert({
      where: { code: entry.code },
      update: {},
      create: {
        ...entry,
        events: {
          create: {
            actorId,
            type: "CREATED",
            reason: "Cadastro inicial importado de arquivo revisado",
            details: entry,
          },
        },
      },
    });
    for (const c of components) {
      const existing = await tx.equipmentComponent.findUnique({
        where: { code: c.code },
      });
      if (existing && existing.equipmentId !== equipment.id)
        throw new Error(`Componente ${c.code} já pertence a outro equipamento`);
      if (!existing) {
        const component = await tx.equipmentComponent.create({
          data: { ...c, equipmentId: equipment.id },
        });
        await tx.equipmentEvent.create({
          data: {
            equipmentId: equipment.id,
            componentId: component.id,
            actorId,
            type: "COMPONENT_CREATED",
            reason: "Cadastro inicial importado de arquivo revisado",
            details: c,
          },
        });
      }
    }
  }
}
