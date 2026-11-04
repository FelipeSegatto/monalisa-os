# Aula 02 — Terça (20/10/2026), 10h–12h

## Objetivos

1. Distinguir tipagem estática (TypeScript) de validação em runtime (Zod).
2. Criar DTO e schema para o objeto SaveCustomerInput do front-end original.
3. Validar `name`, `phone`, `email`, `birthDate` e `acquisitionSource`.
4. Aprender `safeParse`, `z.infer`, `z.input`, `z.output`, `refine`, `transform` e `z.flattenError`.
5. Utilizar middleware e endpoint POST /api/v1/customers/preview.
6. Testar 200, 422, 400 e 404 com requisições HTTP.

## Sequência de 120 minutos

| Horário | Tarefa |
|---|---|
| 10h00–10h15 | Revisão da API e TypeScript x runtime |
| 10h15–10h30 | Playground Zod e `safeParse` |
| 10h30–10h45 | Schema do cliente e DTOs |
| 10h45–11h05 | Erros, null, refinamentos e transformações |
| 11h05–11h25 | Middleware de validação e `res.locals` |
| 11h25–11h40 | Controller, service, rota e registro em app.ts |
| 11h40–11h55 | Testes com curl e `npm run smoke` |
| 11h55–12h00 | Desafio e recapitulacão |

## Primeira execução

Na pasta-raiz deste ZIP:

```bash
npm run setup
npm run dev
```

Ou, para executar apenas o back-end:

```bash
cd backend
npm install
npm run zod:demo
npm run dev
```

Com o servidor ligado em outro terminal, na raiz:

```bash
npm run smoke
```

## Requisição de exemplo

No Windows PowerShell:

```powershell
curl.exe -i -X POST "http://localhost:3333/api/v1/customers/preview" -H "Content-Type: application/json" -d '{"name":"Cliente Exemplo","phone":"(11) 99999-0000","email":"cliente@example.com","birthDate":"1995-04-20","acquisitionSource":"INSTAGRAM"}'
```

No Windows PowerShell 5.1, as aspas passadas para `curl.exe` podem exigir escapamento adicional. Alternativamente use:

```powershell
$body = @{
 name='Cliente Exemplo';phone='(11) 99999-0000';email='cliente@example.com';birthDate='1995-04-20';acquisitionSource='INSTAGRAM'
} | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:3333/api/v1/customers/preview' -Method POST -ContentType 'application/json' -Body $body
```

## Desafios do aluno

1. Testar `name = 'A'` e localizar erro `fieldErrors.name`.
2. Testar `phone = '123'` e localizar erro `fieldErrors.phone`.
3. Testar `email = null` e explicar `nullable`.
4. Testar `acquisitionSource = 'TIKTOK'` e explicar `z.enum`.
5. Adicionar um campo extra e explicar `z.strictObject`.
6. Retirar o campo `birthDate` e explicar `nullable` versus `optional`.
7. (Extra) Adicionar um schema de `GET /api/v1/customers/preview/:id` sem banco de dados, somente para praticar `req.params`.

## Atenção

- Não há persistência: `POST /api/v1/customers/preview` apenas valida e devolve os dados tratados.
- `POST /api/v1/customers` fica para quinta. MySQL/Prisma para quarta.
- A API não tem autenticação. Use exclusivamente dados fictícios.
- A asserção do tipo em `res.locals` é segura apenas enquanto o middleware antecede o controller; em projetos maiores, usar tipagem explícita de `res.locals` ou uma abstração apropriada.
