# Roteiro essencial para validação local

```text
No FelipeSegatto/monalisa-os, use a ponta de feat/equipment-operations. Preserve trabalho local; não altere main. Use Node >=24.19 <25 e npm >=11.9 <12.

Há cinco migrations: baseline, equipment_operations, procedure_resources, clinical_execution_ledgers e a nova 20261107000000_commercial_contracts. Confira migrate status: aplique apenas o que estiver pendente.

1. Identifique explicitamente o banco DEV autorizado, sem expor credenciais. Não execute novamente a baseline reconhecida nem marque evoluções como aplicadas sem executá-las.
2. Se procedure_resources ainda estiver pendente, revise o backfill de procedimentos/áreas contra IDs reais. Não edite migration já aplicada; correções posteriores exigem nova migration.
3. Valide migrate deploy primeiro em banco descartável/cópia. O SQL das cinco migrations passou em MySQL 8.4.13 isolado, incluindo contratos comerciais, ledgers, CHECKs, triggers e concorrência da última sessão. Ainda falta conferir a execução pelo Prisma Migrate e comparar schema no ambiente local.
4. Aplique somente as pendências no dev. Não use reset, db push, remoção de volumes ou seeds de demonstração contra dados existentes. Não toque em produção.
5. Rode prisma generate e npm run verify na raiz. Para repetir o teste SQL isolado: npm run test:mysql:clinical --prefix backend (Docker, dados sintéticos).
6. Informe commit, banco identificado sem credenciais, migrations aplicadas, estado final e pendências. Não invente habilitações, jornadas, prioridades, contadores ou pacotes antigos. Vendas anteriores permanecem LEGACY, sem sessões fabricadas.
```

Depois da migration, testar o menu **Comercial**: publicar oferta, vender pacote com desconto justificado, receber pagamento, reservar sessão na agenda e concluir atendimento. Conferir autoria, saldo e preservação de condições anteriores após nova versão.

Documentação: [Comercial — Fase 6](comercial-fase-6.md) e [Operação clínica — Fase 5](operacao-clinica-fase-5.md). O arquivo `prisma/changes/20261104_equipment.sql` é referência histórica, não uma migration adicional.
