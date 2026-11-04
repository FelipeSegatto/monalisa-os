# Monalisa OS — Agenda Clínica

Sistema de gestão com frontend React/Vite e backend NestJS, TypeScript, Prisma e MySQL 8.4. A refatoração do backend é incremental por domínio, preservando os contratos e a interface existentes.

## Ambiente

Referência: **Node 24.19.0, npm 11.9.0**. Consulte `.nvmrc`, `.node-version` e [Fase 1](docs/fase-1-ambiente.md).

1. Selecione o Node indicado e execute `npm run setup` na raiz. Os dois projetos são instalados com seus lockfiles; arquivos `.env` existentes são preservados.
2. Configure `backend/.env` e `frontend/.env.local` a partir dos exemplos. Nunca publique credenciais.
3. Inicie MySQL local: `npm run db:up`. O Compose usa a porta local 3307 e volume persistente.
4. Execute `npm run db:generate` e `npm run db:status`.
5. Em banco novo de desenvolvimento, aplique migrations com `npm run db:deploy`. Em banco existente, confira baseline e backup antes de aplicar qualquer mudança.
6. `npm run db:seed` prepara somente o administrador inicial, sem redefinir contas existentes.
7. Execute `npm run dev` e acesse `http://localhost:5199/login`.

Não há seed demo ou migration automática na inicialização. O cadastro inicial não cria procedimentos ou clientes fictícios.

## Verificação sem banco real

```sh
npm run verify
```

Verifica tipos, builds, testes de domínio/serviços e contratos HTTP com persistência simulada, tanto em source/tsx quanto no backend compilado. Não substitui testes de integração MySQL.

Com API e banco disponíveis, `npm run smoke` faz somente consultas. Testes que gravam dados e seeds demo exigem comandos explícitos e banco isolado; consulte a [documentação de ambiente](docs/fase-1-ambiente.md).

## Documentação

- [Ambiente, comandos e seeds](docs/fase-1-ambiente.md)
- [Matriz de acesso atual e decisões pendentes](docs/permissoes-atuais.md)
- [Backend e limites](backend/README.md)
- [Contrato da API](docs/contrato-api.md)
- [Equipamentos e manutenção](docs/equipamentos-etapa-1.md)
- [Arquitetura do domínio de equipamentos](docs/arquitetura-equipamentos.md)

Equipamentos ainda não possuem ledger de disparos; esse registro será conectado aos atendimentos em etapa posterior. Documentos históricos das aulas descrevem versões anteriores e não substituem os comandos atuais.
