# Agenda Clínica — API NestJS (TypeScript, POO, SOLID, MySQL, Prisma)

Backend novo criado para consumir **exatamente o contrato** do `frontend/src/lib/api.ts` existente. Não altera os componentes, estilos ou rotas do frontend.

## Requisitos
- Node.js 24.19.0 (ou patch posterior da linha 24), npm 11.9+ antes de 12; Docker Desktop com Compose para MySQL 8.4.
- No diretório raiz execute `docker compose up -d`.
- `cd backend && cp .env.example .env` (Windows PowerShell: `Copy-Item .env.example .env`).
- **Configure `ADMIN_PASSWORD` (mínimo 12 caracteres) no `.env`**, nunca compartilhe o arquivo.
- Execute `npm ci`, `npm run db:generate` e `npm run db:status`. Em banco novo isolado, `npm run db:deploy` aplica as migrations; banco existente exige baseline conferida e backup. `npm run db:seed` prepara somente o administrador, preservando contas existentes. Depois execute `npm run dev`.
- Em outro terminal: `cd ../frontend && npm ci && npm run dev`.
- O frontend usa `VITE_API_BASE_URL=http://localhost:3333`; copie `frontend/.env.example` para `frontend/.env`.
- Abra `http://localhost:5199/login`, entre com `ADMIN_EMAIL` e `ADMIN_PASSWORD` do `.env` do backend.

## Portas
- Frontend React/Vite: 5199 (config do frontend preservada)
- NestJS API: 3333
- MySQL: 3307 (host) => 3306 (container)

## Organização

Cada módulo registra seus próprios controllers, serviços e adaptadores. `AppModule` compõe os módulos e o filtro global; não concentra controllers de negócio.

- `src/auth`: identidade, credenciais, sessões e autorização.
- `src/customers`: cadastro, histórico, notas, documentos e fotos de clientes.
- `src/professionals`: profissionais, habilitações, jornada e gestão de acesso.
- `src/procedures`: procedimentos, variações, recursos e imagens do catálogo.
- `src/equipments`: equipamentos, componentes, manutenção e histórico operacional.
- `src/scheduling`: agenda interna, bloqueios, regras de intervalo/transição e agendamento público.
- `src/attendances`, `src/shot-ledger` e `src/inventory`: execução clínica, disparos e estoque, respectivamente.
- `src/commercial`: ofertas, vendas, descontos, recebimentos e direitos de sessões; inclui as políticas de cálculo compatíveis com as rotas anteriores.
- `src/finance` e `src/expenses`: visão financeira e despesas auditáveis.
- `src/dashboard-metrics` e `src/procedure-metrics`: indicadores e projeções para consulta.
- `src/leads`: captação e acompanhamento de interessados. O agendamento público pertence a `scheduling`.
- `src/shared`: infraestrutura técnica de Prisma e arquivos, erros e objetos de valor compartilhados. `MediaModule` mantém a leitura autenticada dos arquivos; a associação com clientes/procedimentos fica nos respectivos módulos.

As antigas pastas genéricas `src/modules` e `src/domain` foram removidas. Esta reorganização preserva rotas e regras existentes; não representa a extração de todas as consultas legadas dos controllers. As dependências e os pontos que ainda precisam dessa separação estão descritos em [organização dos domínios](../docs/domain-ownership.md).

## Segurança e escopo
- Banco com senha configurada apenas para desenvolvimento. Troque segredos antes de implantar.
- Não há cadastro administrativo público. O primeiro administrador é criado via seed com credenciais de ambiente.
- Configurações, despesas e cancelamento de vendas exigem ADMIN; vendas e recebimentos têm regras por profissional (ver matriz de acesso); login usa cookie `HttpOnly`, `SameSite=Lax`, com proteção básica de origem em mutações.
- Documentos/fotos de clientes exigem sessão; recomenda-se proteção adicional de dados sensíveis, auditoria e backups antes de uso clínico real (LGPD).
- Uploads são armazenados localmente (`backend/uploads`), não em storage distribuído.
- Não há integração WhatsApp, envio de email, assinatura digital certificada, gateway de pagamentos ou reconciliação automática.
- Não execute `prisma db push` sobre dados de produção sem revisar mudanças e realizar backup. Use migrations revisadas para deploy real.

## Sobre as regras de agendamento
- Criação e bloqueio de horário usam `SELECT ... FOR UPDATE` na linha do profissional dentro de transação MySQL para serializar escritas do mesmo calendário.
- Antes de inserir, verifica sobreposição `startsAt < endNovo` E `endsAt > startNovo` em compromissos ativos e indisponibilidades.
- A conclusão registra materiais utilizados e disparos em transação. Informar uso de material não baixa automaticamente uma embalagem: movimentos de estoque são registrados separadamente.
- A avaliação pública consulta o procedimento configurado e a disponibilidade do domínio de agendamento, respeitando habilitações, jornada, recursos e a política administrativa de atribuição. A janela pública é de até 30 dias.

## Qualidade
- `npm run typecheck` e `npm run build`: verificação do TypeScript (requer `npm ci`).
- `npm test`: regras de domínio, aplicação, persistência simulada e contratos HTTP de equipamentos e funcionalidades legadas.
- `npm run test:e2e -- --confirm-test-data`: integração HTTP que grava dados; exige TEST_URL explícita de uma API local com banco isolado, além das credenciais. Não execute no banco da clínica.
- `npm run test:contracts:compiled`: compila o backend e repete os contratos usando as classes emitidas pelo tsc, com persistência simulada.
- Consulte `../docs/contrato-api.md` para contratos e comportamento do frontend.

## Observação importante de entrega
Esta versão fornece o código backend completo e seu contrato, porém não representa uma auditoria de produção. Em ambientes sem acesso ao npm ou Docker, a instalação, compilação e testes integrados precisam ser executados localmente.

## Compatibilidade da Aula 03
O modelo `Customer` preserva o nome da tabela `customers` do schema anterior (Aula 03), de forma a não abandonar os cadastros já persistidos naquela tabela. Mesmo assim, qualquer evolução de banco existente deve ser revisada antes de rodar `prisma db push`.

## Fase 1: comandos e sementes

Veja [ambiente e comandos](../docs/fase-1-ambiente.md). `db:seed` é bootstrap administrativo sem reset de senha. Para dados fictícios use exclusivamente banco isolado e `npm run db:seed:demo -- --confirm-demo`; esse seed mantém o comportamento anterior de atualizar credenciais demo/admin. Não o confunda com o bootstrap.

## Autenticação e configuração — Fase 2

Veja [autenticacao-fase-2.md](../docs/autenticacao-fase-2.md). Em produção, COOKIE_SECURE=true e origens HTTPS explícitas são obrigatórias. O filtro global padroniza erros sem expor SQL ou segredos; o schema e as permissões de negócio foram preservados.
