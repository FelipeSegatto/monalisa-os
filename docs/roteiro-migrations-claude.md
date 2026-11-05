# Roteiro essencial para validação local

```text
No FelipeSegatto/monalisa-os, use a ponta de feat/equipment-operations. Preserve trabalho local e não altere main. Use Node >=24.19 <25 e npm >=11.9 <12.

O dev já teve baseline reconhecida e equipment_operations aplicada, conforme seu relatório. Confira o estado real antes de agir. Existem agora quatro migrations: baseline, equipment_operations, procedure_resources e clinical_execution_ledgers.

1. Confira git status, commit e migrate status no banco DEV explicitamente identificado, sem expor DATABASE_URL. Não execute SQL da baseline novamente nem marque evoluções como aplicadas sem executá-las.
2. Se procedure_resources ainda estiver pendente, revise o backfill de HIFU/depilação/tatuagem e AREA/SIZE/OTHER contra IDs e nomes reais. Não edite migration já aplicada; correções posteriores precisam de nova migration.
3. Valide migrate deploy primeiro em banco descartável/cópia. O SQL das quatro migrations já passou em MySQL 8.4.13 isolado, mas falta conferir a execução pelo Prisma Migrate. Confira os CHECKs e os triggers de imutabilidade da clinical_execution_ledgers.
4. Aplique somente migrations pendentes no dev autorizado. Não use reset, db push, remoção de volumes ou seeds de demonstração contra dados existentes. Não toque no banco de produção/da clínica.
5. Rode prisma generate e npm run verify na raiz. Se precisar repetir a validação SQL isolada: npm run test:mysql:clinical --prefix backend (Docker; dados sintéticos).
6. Informe commit, banco identificado sem credenciais, migrations aplicadas, estado final, resultados e pendências. Não invente habilitações, jornadas, prioridades ou contadores: esses dados serão configurados pela clínica.
```

Após aplicar, usar as páginas de profissionais para habilitações/jornadas/prioridades, regras da agenda para confirmação e equipamentos para os contadores iniciais reais. Conferir um atendimento com respostas obrigatórias dos materiais e disparos, sem baixa automática de estoque.

Detalhes e decisões futuras: [Operação clínica — Fase 5](operacao-clinica-fase-5.md). O SQL em `prisma/changes/20261104_equipment.sql` continua sendo referência histórica, não uma migration adicional.
