> Este documento descreve o seed demonstrativo legado, já incluído no repositório. Não extraia ZIPs sobre o projeto atual. Use somente banco isolado. O comando atual em backend é `npm run db:seed:demo -- --confirm-demo`; `db:seed` agora prepara apenas o administrador e preserva contas existentes. Consulte `../docs/fase-1-ambiente.md`.

# Seed completo — Agenda Clínica (NestJS / Prisma / MySQL)

Este pacote recupera os **11 procedimentos originais e suas imagens** e acrescenta dados fictícios para testar o frontend **sem alterar nenhum arquivo React**.

## O que é criado (se estiver ausente)

- 1 administrador, a partir de `ADMIN_EMAIL`, `ADMIN_NAME` e `ADMIN_PASSWORD` do `.env`.
- 1 funcionária de demonstração vinculada à Carolina Reis (senha forte configurável).
- 3 profissionais, 11 procedimentos do catálogo antigo, uma avaliação gratuita, 9 variações de preços e 11 capas com imagens reais do projeto original.
- 12 clientes, cerca de 12 agendamentos, 6 insumos com histórico, 5 vendas, 4 despesas e 3 leads.

Os preços, clientes, telefones, vendas e agendamentos são **fictícios**. Não use isso como dados clínicos reais.

## Instalação (no projeto que você já está executando)

1. Faça backup do projeto e do banco, caso tenha registros importantes.
2. Extraia `Agenda_Clinica_SEED_COMPLETO.zip` **dentro da pasta `backend`**. A extração vai substituir `prisma/seed.ts` e criar `prisma/seed-assets/catalog/*.jpg`; não altera `backend/.env` nem o frontend.
3. Revise em `backend/.env`:

```env
NODE_ENV=development
DATABASE_URL="mysql://agenda_app:SENHA_MYSQL@127.0.0.1:3307/agenda_clinica_dev"
ADMIN_NAME="Administrador"
ADMIN_EMAIL="admin@clinica.local"
ADMIN_PASSWORD="SUA_SENHA_FORTE_DE_12_OU_MAIS_CARACTERES"
# Opcional, para senha fixa da funcionária demo:
DEMO_EMPLOYEE_EMAIL="carolina.demo@clinica.local"
DEMO_EMPLOYEE_PASSWORD="OUTRA_SENHA_FORTE_DE_12_OU_MAIS_CARACTERES"
```

**Não substitua o valor real de `DATABASE_URL` por um placeholder.** Mantenha a conexão que já funciona na sua máquina. `ADMIN_PASSWORD` será usada para criar ou **redefinir** a senha do administrador na base, inclusive se ele já existia.

4. Na pasta `backend`, execute:

```powershell
npm run db:generate
npm run db:seed:demo -- --confirm-demo
npm run dev
```

Só execute `npm run db:push` se o schema ainda não tiver sido aplicado a esse banco, depois de conferir as mudanças. Este pacote **não modifica o schema.prisma**.

5. Abra `http://localhost:3333/api/v1/public/catalog` e veja se o JSON contém categorias e procedimentos. Em seguida, atualize `http://localhost:5199/catalogo` (ou use o link de catálogo presente no frontend) e entre em `http://localhost:5199/login`.

## Login

- **Administrador:** email `ADMIN_EMAIL` e senha `ADMIN_PASSWORD`, definidos no `.env` do backend.
- **Funcionária:** email `DEMO_EMPLOYEE_EMAIL` (padrão `carolina.demo@clinica.local`). Senha `DEMO_EMPLOYEE_PASSWORD`. Se não configurar esta senha, o seed vai gerar uma senha forte e **mostrá-la no terminal** durante a execução.

Não reutilize senhas que já compartilhou em screenshots. Altere sua senha de admin no `.env` e rode `npm run db:seed:demo -- --confirm-demo` novamente. Após o login, o navegador guarda um cookie de sessão `HttpOnly`.

## Segurança dos dados existentes

- O seed **não executa TRUNCATE, deleteMany ou DROP**.
- Antes de criar um exemplo, procura um registro correspondente e, em geral, não altera dados existentes.
- A **senha do administrador configurado** é atualizada intencionalmente, para reparar o login com o `.env` atual.
- Os arquivos de imagem do catálogo pertencem ao projeto anterior e são copiados para `backend/uploads/procedure` com nomes estáveis.
- Um procedimento do catálogo que já tenha imagem cadastrada mantém o valor cadastrado.
- Em bancos com clientes/serviços reais, faça backup e evite usar dados de demonstração.
- O seed se recusa a rodar com `NODE_ENV=production`.

## Por que o catálogo desapareceu?

O backend NestJS possui uma base nova. O frontend lê `/api/v1/public/catalog` do MySQL desse novo backend, e não da base antiga. O seed inicial criava só uma avaliação, em vez dos 11 procedimentos que estavam cadastrados no projeto anterior, além de não copiar as imagens.

## Verificação de conteúdo no banco

```powershell
npx prisma studio
```

Confira as tabelas `User`, `ProcedureCategory`, `Procedure`, `ProcedureVariation`, `Professional`, `Customer` e `Appointment`.

Se `npm run db:seed:demo -- --confirm-demo` apresentar P1001, verifique `docker compose ps` e a porta no `.env`. Se apresentar P1000, o usuário/senha do MySQL não conferem. Se apresentar erro de tabela inexistente, verifique se o `db:push` foi feito no banco correto.
