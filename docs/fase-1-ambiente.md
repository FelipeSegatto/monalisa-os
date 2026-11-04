# Fase 1 — ambiente e contratos verificáveis

## Node e instalação

Referência: **Node 24.19.0 e npm 11.9.0**. São aceitos patches posteriores da linha Node 24 (mínimo 24.19.0) e npm 11.9.x/11.x posterior, até antes de 12. As dependências atuais exigem Vite/React plugin com Node >=22.12 e Prisma 6.19 aceita essa linha. Nenhuma dependência foi atualizada nesta fase.

`.nvmrc`, `.node-version`, engines e verificação de runtime estão alinhados. No Windows com nvm-windows:

```powershell
nvm install 24.19.0
nvm use 24.19.0
node --version
npm --version
npm run check:node
npm run setup
```

Em gerenciadores que leem `.nvmrc`, use o fluxo equivalente. A instalação de Node não é feita pelos scripts do projeto. `setup` usa `npm ci` em frontend/backend, preserva `.env` existentes e não aplica migrations nem seeds. Regenerate Prisma Client exige acesso aos binários oficiais; sem isso, instalação/geração podem precisar ocorrer no ambiente local.

Após configurar `backend/.env` e `frontend/.env.local`:

```sh
npm run db:generate
npm run db:status
npm run dev
```

Se banco existente ainda não tiver histórico, a baseline deve ser conferida antes de deploy; não marque migrations arbitrariamente como aplicadas. API usa PORT padrão 3333, frontend 5199 e Compose MySQL local 3307. O orquestrador não sobe MySQL automaticamente. Não há endpoint /health nesta versão; nenhum script promete essa rota.

## Comandos

| Comando na raiz | Comportamento |
|---|---|
| `npm run setup` | Instala com lockfiles, sem sobrescrever env |
| `npm run dev` | Inicia backend e frontend; exige banco configurado |
| `npm run typecheck` | Verifica backend, ferramentas Prisma e frontend |
| `npm run build` | Compila os dois projetos |
| `npm test` | Scripts de ambiente e testes backend, incluindo contratos no modo source/tsx |
| `npm run test:contracts:compiled` | Compila backend e repete contratos usando classes de dist |
| `npm run verify` | Typecheck, builds, testes e contratos compilados; não acessa MySQL nos testes |
| `npm run smoke` | GET sem sessão em /api/v1/me (401) e catálogo público (200); somente leitura |
| `npm run db:status` | Estado das migrations, sem aplicá-las |
| `npm run db:migrate -- --name nome` | Gera/aplica migrations em desenvolvimento; comando explícito |
| `npm run db:deploy` | Aplica migrations versionadas; comando explícito |
| `npm run db:migrate:apply` | Alias compatível de db:deploy |
| `npm run db:studio` | Abre Prisma Studio |

SMOKE_URL permite apontar o smoke de leitura para outra API. O smoke não envia credenciais, cria registros ou prova prontidão de todas as dependências. A resposta do catálogo depende de MySQL disponível.

## Bootstrap e demonstração separados

`npm run db:seed` cria o administrador inicial pelas variáveis ADMIN_EMAIL, ADMIN_NAME e ADMIN_PASSWORD. Não gera dados demo, não redefine senha existente e não promove uma conta FUNCIONARIO. Senha de 12 a 200 caracteres. Alteração de senha não é responsabilidade desse comando.

Para dados fictícios, **somente em banco isolado**, execute explicitamente:

```sh
npm run db:demo -- --confirm-demo
```

Esse comando preserva o seed demonstrativo anterior, incluindo a atualização das credenciais de demonstração/admin. É bloqueado em NODE_ENV=production e exige confirmação. O sinalizador não identifica sozinho um banco real: conferir DATABASE_URL é responsabilidade do operador. Nunca execute contra os dados da clínica.

Seed de equipamentos permanece separado, por códigos estáveis e arquivo conferido:

```sh
npm run db:seed:equipment -- caminho/arquivo.json --confirm
```

Ele não é chamado por setup, dev, build, verify ou bootstrap.

## Testes HTTP e limites

Os contratos executam Nest de verdade, incluindo DI, schemas, cookies e guard. Somente as operações de persistência são simuladas. São executados sobre source/tsx e JavaScript emitido pelo tsc. Os controllers legados receberam tokens explícitos de injeção para funcionar nos dois executores; as regras de negócio foram preservadas.

Cobertura de caracterização: catálogo e procedimentos, materiais, agenda/criação/conflito, estoque, venda/recebimento/saldo, clientes, dashboard, leads, anexos, login/logout e acesso administrativo. Não congela como comportamento desejado os riscos concorrentes encontrados na auditoria.

`backend/scripts/e2e-smoke.mjs` continua sendo um teste que **grava dados reais**. Exige TEST_URL explícita de API local isolada e o argumento `--confirm-test-data`; recusa NODE_ENV=production. Execute em backend somente após preparar banco de teste:

```sh
npm run test:e2e -- --confirm-test-data
```

Não foi rodado contra o banco da clínica. Não há teste concorrente real de MySQL nesta fase. A matriz observada de acesso está em `docs/permissoes-atuais.md`; decisões de negócio pendentes permanecem pendentes.

## Evidência desta entrega

Validado com Node 24.19.0/npm 11.9.0: typecheck, builds de frontend/backend, contratos em source e dist, e resolução dos lockfiles com npm ci --dry-run --ignore-scripts. Testes de encerramento do orquestrador usam processos fictícios no Linux; o caminho taskkill do Windows permanece para confirmação local. Nenhuma migration ou seed foi aplicada e nenhum teste MySQL real foi executado nesta fase.
