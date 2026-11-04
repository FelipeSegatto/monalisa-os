# Guia da Aula 01 — de 13h às 15h

> Este projeto é o estado **ao final** da aula: os alunos podem montá-lo passo a passo ou consultá-lo para verificar nomes de arquivos e imports.

## Roteiro de 120 minutos
1. **13h00–13h15** — Contexto: frontend salvo em `frontend/src`; métodos HTTP e JSON.
2. **13h15–13h30** — Fluxo `route -> controller -> service`; por que isolar cada camada.
3. **13h30–13h50** — `npm init`, `npm install express cors dotenv`, `npm install -D typescript tsx @types/node @types/express @types/cors`, scripts e tsconfig.
4. **13h50–14h15** — `env.ts`, `health.service.ts`, `health.controller.ts`, `health.routes.ts`.
5. **14h15–14h35** — `info.*`, `app.ts`, `server.ts`.
6. **14h35–14h45** — middlewares de 404 e erros, CORS e fluxo de importação.
7. **14h45–15h00** — testes, compilação, revisão do que já funciona e do que falta.

## Construção recomendada

- Comece no `backend/package.json` e `backend/tsconfig.json`; explique scripts e diferença entre `dependencies` e `devDependencies`.
- Configure `backend/.env.example`, depois `src/config/env.ts`.
- Crie `src/services/health.service.ts` primeiro: o service não conhece Express.
- Depois o controller e a rota: o controller transforma retorno em HTTP; a rota registra o caminho.
- Monte `src/app.ts`: CORS, parser JSON, rotas, tratamento de 404 e erros. A ordem importa.
- Inicie no `src/server.ts`: `app.listen` configura a porta HTTP.

## Comandos

```bash
npm run setup
npm run dev
# Outro terminal, na raiz do projeto:
npm run smoke
npm run typecheck
npm run build
```

## Checklist da API

- `GET http://localhost:3333/health` -> `200` JSON com status, service, timestamp e uptimeSeconds.
- `GET http://localhost:3333/api/v1/info` -> `200` JSON com application, version, environment e description.
- `GET http://localhost:3333/nao-existe` -> `404` JSON com error.code = ROUTE_NOT_FOUND.
- `http://localhost:5199/catalogo` -> site React original (demais rotas dependem do backend futuro).

## Desafio

Criar `GET /api/v1/boas-vindas` em três arquivos próprios: welcome.routes.ts, welcome.controller.ts, welcome.service.ts. Responder `{ "message": "Bem-vindo à API da Agenda Clínica!", "module": "backend", "active": true }`. Esta tarefa não está implementada de propósito.

## Próxima aula

TypeScript + Zod: DTOs e validação dos inputs. Banco e Prisma apenas na quarta-feira.
