# Roteiro essencial para validação local

```text
No FelipeSegatto/monalisa-os, use a versão mais recente de feat/equipment-operations. Preserve trabalho local; não altere main nem o banco da clínica.

As Fases 2 (autenticação) e 3 (clientes/profissionais) não mudaram o schema. Não crie migrations vazias por refatoração de código.

1. Confira git status, commit, prisma/schema.prisma, migrations versionadas e migrate status no banco dev, sem expor DATABASE_URL.
2. Se o banco já estiver atualizado, basta prisma generate e confirmar migrate status. Não reaplique SQL manual de prisma/changes.
3. Se houver tabelas antigas sem histórico, compare a estrutura com 20261029000000_baseline antes de usar migrate resolve --applied para essa baseline. Não marque a migration de equipamentos como aplicada sem executá-la.
4. Aplique pendências primeiro em cópia/banco isolado. Banco vazio recebe baseline + equipment_operations por migrate deploy; banco existente recebe somente evoluções após baseline compatível. Nunca execute CREATE TABLE da baseline sobre tabelas existentes.
5. Rode prisma generate, typecheck e testes. Se possível, confira nascimento por DATE sem deslocar o dia e troca de credenciais com revogação de sessões no MySQL isolado. Não rode seeds contra dados reais.
6. Informe commit, migrations aplicadas, resultado e pendências. Não use reset, db push ou remoção de volumes para contornar divergências.
```

O histórico versionado contém `20261029000000_baseline` e `20261104000000_equipment_operations`. `prisma/changes/20261104_equipment.sql` é referência histórica da mesma evolução, não uma terceira migration.
