# Agenda Clínica — Full Stack NestJS

**Frontend React/Vite preservado integralmente**, backend refeito com NestJS, TypeScript, Prisma e MySQL 8.4.

## Começando

1. Abra o Docker Desktop e rode `docker compose up -d` na raiz.
2. Na pasta `backend`, copie `.env.example` para `.env` e configure `ADMIN_PASSWORD` com uma senha forte (12+ caracteres).
3. Na pasta `backend`: `npm install`, `npm run db:generate`, `npm run db:push`, `npm run db:seed`, `npm run dev`.
4. Na pasta `frontend`: `npm install`, `npm run dev`.
5. Acesse `http://localhost:5199/login`. O usuário administrador está definido em `backend/.env`.

Leia `backend/README.md` para funcionamento e limites; `docs/contrato-api.md` para endpoints.

**Observação:** O código fonte original do frontend permanece intocado; foi acrescentado apenas `frontend/.env` para apontar para a API local.
