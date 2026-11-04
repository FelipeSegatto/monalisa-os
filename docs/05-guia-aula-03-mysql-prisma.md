# Aula 03 — MySQL, Prisma e Repository (120 minutos)

## Resultado

Persistir um cliente de exemplo no MySQL e recuperá-lo após a execução do processo, reutilizando a validação Zod da Aula 02. O front-end permanece preservado; CRUD HTTP não faz parte desta aula.

## Roteiro do professor

| Intervalo | Conteúdo | Prática |
|---|---|---|
| 00-15 min | armazenamento, SQL, ORM, Repository | desenhar fluxo React → Zod → Service → Repository → DB |
| 15-35 min | MySQL e credenciais locais | executar `npm run db:up` e verificar `docker compose ps` |
| 35-50 min | Prisma e data model | ler/anotar cada campo `Customer` |
| 50-70 min | migrations / Prisma Client | `npm run db:migrate`, `npm run db:generate`, `npm run db:status` |
| 70-95 min | singleton, repository, service | construir e explicar `prisma.ts`, repository e service |
| 95-110 min | script de persistência | `npm run db:demo`, `npm run db:studio`, SELECT no Workbench |
| 110-120 min | avaliação e desafio | comparar dados em memória x MySQL |

## Passo a passo (Docker)

1. `npm run setup` na raiz.
2. `npm run db:up` na raiz.
3. `docker compose ps` e confirmar `healthy` (pode demorar alguns instantes no primeiro start).
4. Revisar `backend/.env`: a URL usa a porta `3307` do computador e o banco `agenda_clinica_dev`.
5. `npm run db:migrate` (gera primeira migration e aplica no banco).
6. `npm run db:generate` (gerar Prisma Client).
7. `npm run db:demo` (inserir/consultar um cliente fictício).
8. `npm run db:studio` (abrir Prisma Studio) e conferir o registro.
9. `npm run dev` e acessar `http://localhost:3333/health/db` (esperado HTTP 200).
10. `npm run smoke` com API ligada, para garantir que a aula anterior não quebrou.

## Primeiros comandos SQL

```sql
USE agenda_clinica_dev;
SHOW TABLES;
DESCRIBE customers;
SELECT id, name, phone FROM customers ORDER BY id DESC;
SELECT COUNT(*) AS total FROM customers;
```

## Campos do modelo Customer

- `id`: chave primária com autoincremento.
- `name`: VARCHAR(120) obrigatório.
- `phone`: VARCHAR(11), após Zod normalizar.
- `email`: VARCHAR(190), aceita NULL.
- `birthDate`: DATE, aceita NULL; o Prisma representa como DateTime em código.
- `acquisitionSource`: enum compatível com o schema da Aula 02.
- `createdAt`: preenchido na criação.
- `updatedAt`: controlado pelo Prisma ao criar/atualizar.
- `@@index([name])`, `@@index([phone])`: índices para consultas futuras.
- `@@map("customers")`: nome da tabela SQL.

## Perguntas para a turma

1. O que ocorre com dados em memória ao reiniciar o servidor?
2. Qual a diferença entre ORM e banco de dados?
3. Quem deve acessar diretamente `prisma.customer.create()` nesta arquitetura?
4. O que é uma migration e por que deve ser versionada?
5. Por que o `birthDate` recebido como string no DTO vira Date no Prisma?
6. Por que `GET /health` pode funcionar com banco desligado, mas `/health/db` falha?
7. O que significa encontrar o cliente no MySQL depois que o script termina?

## Desafios

**Básico:** Acrescente uma chamada a `findById` e mostre o cliente recém-cadastrado.
**Intermediário:** Acrescente a função `findByPhone(phone: string)` ao repository e consulte o número normalizado.
**Avançado:** Acrescente no repository `updatePhone(id, phone)` e demonstre uma atualização via script, sem endpoint HTTP.

## Diagnóstico rápido

- `P1001`: MySQL inacessível — confira Docker, porta e se está saudável.
- `P1000`: credenciais de conexão incorretas.
- `P1014`: tabela ainda não existe — migration não aplicada.
- `P3014`: falha criando shadow database — verifique SHADOW_DATABASE_URL e privilégios.
- `Cannot find module @prisma/client`: instale deps e execute `npm run db:generate`.
- Porta 3307 ocupada: ajuste compose.yaml e DATABASE_URL/SHADOW_DATABASE_URL juntos.
- Migration alterada manualmente depois de aplicada: não reescreva histórico; gere uma nova migration.

## Continuação na quinta

Montar controller POST/GET de customers, chamando os services deste encontro, com tratamento adequado dos erros e respostas 201/200, usando os DTOs da Aula 02.
