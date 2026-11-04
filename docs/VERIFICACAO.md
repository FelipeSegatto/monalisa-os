# Verificação da entrega — Agenda Clínica NestJS

## O que foi efetivamente conferido neste ambiente

- **Frontend preservado:** os 113 arquivos originais do diretório `frontend` (incluindo os 98 dentro de `src`) foram comparados por SHA-256 com a versão de origem da Aula 03. Todos coincidiram; nenhum arquivo original foi modificado. A única adição ao frontend é o `.env` local que indica a API na porta 3333.
- **Backend entregue:** fonte da API NestJS, schema Prisma, seed, configuração local, módulos, autenticação, agendamento, cadastro, agenda, estoque, financeiro, dashboard, catálogo público e anexos.
- **Sintaxe TypeScript:** arquivos `.ts` do backend foram verificados por transpiração e não apresentaram erros de sintaxe.
- **Regras puras:** verificações isoladas de colisão de horários, estados e cálculo de venda executadas sem dependências externas.
- **Testes automatizados disponíveis:** `backend/test/domain.test.ts` e `backend/scripts/e2e-smoke.mjs`.

## O que **não** foi possível executar aqui

Este ambiente não dispõe de acesso ao registro npm e nem de um serviço Docker/MySQL em execução. Por isso, não foi possível confirmar o resultado de `npm install`, `prisma generate`, `prisma db push`, `npm run build`, `npm test`, nem os testes HTTP de ponta a ponta contra um banco real. **Não foi comprovado o funcionamento integral do sistema em execução.**

## Validação obrigatória no computador local

1. `docker compose up -d` — MySQL deve ficar saudável.
2. `cd backend`; configurar `.env` com `ADMIN_PASSWORD` forte; executar `npm install`, `npm run db:generate`, `npm run db:push`, `npm run db:seed`.
3. `npm run typecheck && npm test && npm run build` — devem terminar sem erros.
4. `npm run dev`; em outro terminal `npm run test:e2e` — confirmar login, cadastros, regra de colisão e logout.
5. `cd ../frontend`; `npm install`, `npm run build`, `npm run dev`; testar cada tela no navegador em `http://localhost:5199`.
6. Executar `node scripts/verificar-frontend.mjs` na pasta raiz para comparar os hashes originais.

## Segurança

O backend é uma base local de desenvolvimento. Antes de hospedar e tratar dados de clientes reais, são necessárias revisão de segurança, testes de acesso por papel, gestão segura de segredos, backups, armazenamento protegido de documentos e adequação à LGPD. Não usar os segredos de exemplo em produção. Registros financeiros internos não equivalem a pagamentos online.

## Documentação anterior

Os documentos `docs/01-...` a `docs/05-...` são o **histórico das aulas 01–03** e se referem à antiga API Express. Os documentos novos de referência para a versão atual são `README.md`, `backend/README.md`, `docs/contrato-api.md`, `docs/plano-aulas.md` e este arquivo.
